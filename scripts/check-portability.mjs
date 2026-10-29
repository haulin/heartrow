// Fails when src/core uses anything that is not portable to every platform (web, terminal, TIC-80).
// Zero dependencies. Comments and string/template literals are blanked before matching.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RULES = [
    { re: /\bMath\s*\.\s*random\b/, msg: 'Math.random is banned; use the seeded rng' },
    { re: /\bnew\s+Date\b|\bDate\s*\.\s*(now|parse|UTC)\b/, msg: 'Date is banned; time must be passed in' },
    { re: /\bdocument\b/, msg: 'document is banned in core' },
    { re: /\bwindow\b/, msg: 'window is banned in core' },
    { re: /\blocalStorage\b/, msg: 'localStorage is banned in core' },
    { re: /\bstructuredClone\b/, msg: 'structuredClone is banned; state must be plain data' },
    { re: /\bnew\s+Set\b/, msg: 'Set is banned in state; use arrays or records' },
    { re: /\bnew\s+Map\b/, msg: 'Map is banned in state; use arrays or records' },
    { re: /\bconsole\s*\./, msg: 'console is banned in core' },
    { re: /\b(setTimeout|setInterval)\b/, msg: 'timers are banned in core' },
    { re: /\bprocess\s*\./, msg: 'process is banned in core' },
]

// Import specifiers are strings, so they are checked on the original text (comments still blanked).
const IMPORT_RULES = [
    { re: /(?:from|import)\s*\(?\s*['"](?:\.\.?\/)*(?:[^'"]*\/)?platform(?:\/[^'"]*)?['"]/, msg: 'core must not import from platform' },
    { re: /(?:from|import)\s*\(?\s*['"]node:[^'"]*['"]/, msg: 'core must not import node: modules' },
    { re: /(?:from|import)\s*\(?\s*['"](?:fs|path)(?:\/[^'"]*)?['"]/, msg: 'core must not import fs or path' },
]

/** Replace comments (and optionally string contents) with spaces, keeping newlines so line numbers stay right. */
export function blank(src, { strings }) {
    let out = ''
    let i = 0
    const n = src.length
    const keep = (c) => (c === '\n' ? '\n' : ' ')
    while (i < n) {
        const c = src[i]
        const d = src[i + 1]
        if (c === '/' && d === '/') {
            while (i < n && src[i] !== '\n') {
                out += ' '
                i++
            }
        } else if (c === '/' && d === '*') {
            out += '  '
            i += 2
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
                out += keep(src[i])
                i++
            }
            if (i < n) {
                out += '  '
                i += 2
            }
        } else if (c === '"' || c === "'" || c === '`') {
            const q = c
            out += q
            i++
            while (i < n && src[i] !== q) {
                if (src[i] === '\\' && i + 1 < n) {
                    out += strings ? '  ' : src[i] + src[i + 1]
                    i += 2
                    continue
                }
                if (q !== '`' && src[i] === '\n') break
                out += strings ? keep(src[i]) : src[i]
                i++
            }
            if (i < n && src[i] === q) {
                out += q
                i++
            }
        } else {
            out += c
            i++
        }
    }
    return out
}

/** Scan one source string. Returns an array of "file:line: message" strings. */
export function scanSource(text, file = '<input>') {
    const errors = []
    const code = blank(text, { strings: true }).split('\n')
    const withStrings = blank(text, { strings: false }).split('\n')
    code.forEach((line, i) => {
        for (const r of RULES) if (r.re.test(line)) errors.push(`${file}:${i + 1}: ${r.msg}`)
    })
    withStrings.forEach((line, i) => {
        for (const r of IMPORT_RULES) if (r.re.test(line)) errors.push(`${file}:${i + 1}: ${r.msg}`)
    })
    return errors
}

function listTs(dir) {
    const out = []
    if (!fs.existsSync(dir)) return out
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...listTs(p))
        else if (/\.(ts|tsx|mts)$/.test(e.name)) out.push(p)
    }
    return out
}

export function checkPortability({ rootDir = process.cwd() } = {}) {
    const errors = []
    for (const file of listTs(path.join(rootDir, 'src', 'core'))) {
        errors.push(...scanSource(fs.readFileSync(file, 'utf8'), path.relative(rootDir, file)))
    }
    return { ok: errors.length === 0, errors }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { ok, errors } = checkPortability()
    if (!ok) {
        console.error(errors.join('\n'))
        console.error(`\nPortability check failed: ${errors.length} problem(s) in src/core.`)
        process.exit(1)
    }
    console.log('Portability check passed.')
}

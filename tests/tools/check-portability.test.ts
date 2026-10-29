import { describe, expect, test } from 'vite-plus/test'
import { checkPortability, scanSource } from '../../scripts/check-portability.mjs'

const scan = (s: string): string[] => scanSource(s, 'f.ts')

describe('check-portability', () => {
    test('clean code passes', () => {
        expect(scan('export const add = (a: number, b: number) => a + b\n')).toEqual([])
    })

    test.each([
        ['Math.random()', 'Math.random'],
        ['new Date()', 'Date'],
        ['Date.now()', 'Date'],
        ['document.body', 'document'],
        ['window.x', 'window'],
        ['localStorage.getItem("a")', 'localStorage'],
        ['structuredClone(x)', 'structuredClone'],
        ['new Set()', 'Set'],
        ['new Map()', 'Map'],
        ['console.log(1)', 'console'],
        ['setTimeout(f, 1)', 'timers'],
        ['setInterval(f, 1)', 'timers'],
        ['process.env.X', 'process'],
        ["import x from '../platform/web'", 'platform'],
        ["import x from 'node:fs'", 'node:'],
        ["import fs from 'fs'", 'fs or path'],
        ["import p from 'path'", 'fs or path'],
    ])('flags %s', (src, word) => {
        const errs = scan(src)
        expect(errs.length).toBe(1)
        expect(errs[0]).toContain('f.ts:1:')
        expect(errs[0]).toContain(word)
    })

    test('ignores comments and string literals', () => {
        const src = [
            '// Math.random() in a comment',
            '/* new Date()',
            '   document */',
            'const a = "console.log(window)"',
            'const b = `process.env ${1}`',
        ].join('\n')
        expect(scan(src)).toEqual([])
    })

    test('reports correct line numbers', () => {
        expect(scan('const a = 1\n\nconst b = Math.random()\n')[0]).toContain('f.ts:3:')
    })

    test('src/core is portable', () => {
        expect(checkPortability().errors).toEqual([])
    })
})

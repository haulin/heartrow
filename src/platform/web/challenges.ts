import { CUSTOM_PRESETS, GOALS, customMode, customOfMode, customSummary, goalIndexOfKey } from '../../core'
import type { CustomGenerator, GameState, ModeConfig } from '../../core'
import { customQuery } from './custom'
import type { AppStorage } from './storage'

export interface Challenge {
    id: string
    name: string
    blurb: string
    icon: string
    /** The colour of its card, as a CSS value. */
    accent: string
    /** Custom runs differ every time, so no results are kept for them. */
    tracked: boolean
    /** The run for a goal, by its index in `GOALS`. */
    mode: (goal: number) => ModeConfig
}

/** What the player did on one goal. `best` is the most hearts reached; `won` is whether the goal was met; `turn` is the earliest turn of a win. */
export interface Result {
    won: boolean
    best: number | null
    turn: number | null
}

/** How a mode looks: the name of a file in `glyphs/` and a colour. The cards and the game header both read this. */
export interface Look {
    icon: string
    accent: string
}

/** One line per preset of `CUSTOM_PRESETS` (a test checks that none is missing); the icon is `glyphs/<icon>.svg`. */
export const PRESET_LOOKS: Record<string, Look> = {
    standard: { icon: 'heart', accent: 'var(--heart)' },
    moss: { icon: 'leaf', accent: 'var(--moss)' },
    simple: { icon: 'plain', accent: 'var(--dim)' },
    attack: { icon: 'sword', accent: 'var(--foe)' },
    pacifist: { icon: 'peace', accent: 'var(--gold)' },
    tide: { icon: 'wave', accent: 'var(--tide)' },
    ember: { icon: 'flame', accent: 'var(--ember)' },
}

const CUSTOM_CHALLENGE_ID = 'custom'
const CUSTOM_LOOK: Look = { icon: 'sliders', accent: 'var(--pow)' }
const UNKNOWN_LOOK: Look = { icon: 'plain', accent: 'var(--dim)' }

function presetChallenge(id: string, name: string, generator: CustomGenerator): Challenge {
    const isStandard = id === 'standard'
    return {
        id,
        name,
        blurb: isStandard ? 'Every card type, resource and effect.' : customSummary(generator),
        ...(PRESET_LOOKS[id] ?? UNKNOWN_LOOK),
        tracked: true,
        mode: (goal) => customMode({ ...generator, goalLevel: goal }),
    }
}

/** The presets of the generator library, then Custom as the last card. The current custom settings come from the caller. */
export function challengeList(custom: CustomGenerator): Challenge[] {
    return [
        ...CUSTOM_PRESETS.map((p) => presetChallenge(p.id, p.name, p.generator)),
        {
            id: CUSTOM_CHALLENGE_ID,
            name: 'Custom',
            blurb: 'Choose the card types, resources, effects and starter yourself.',
            ...CUSTOM_LOOK,
            tracked: false,
            mode: (goal) => customMode({ ...custom, goalLevel: goal }),
        },
    ]
}

/** The same generator at any goal has the same key, so a run with a preset's settings counts for that preset however it was started. */
const generatorKey = (def: CustomGenerator): string => customQuery({ ...def, goalLevel: 0 })

const PRESET_KEYS = new Map(CUSTOM_PRESETS.map((p) => [generatorKey(p.generator), p.id]))

/** The preset a generator equals at any goal, or null for settings that match none. */
export function presetIdOf(def: CustomGenerator): string | null {
    return PRESET_KEYS.get(generatorKey(def)) ?? null
}

export interface ChallengeGoal {
    challengeId: string
    goal: number
}

/** The tracked challenge goal a run belongs to, or null for a run that matches none (a hand-edited custom generator). */
export function goalOfMode(config: ModeConfig): ChallengeGoal | null {
    const custom = customOfMode(config)
    const challengeId = presetIdOf(custom)
    return challengeId ? { challengeId, goal: custom.goalLevel } : null
}

export interface RunLook extends Look {
    name: string
}

/**
 * How a run shows itself in the game header, in the style of its card: a preset by its own name, icon and colour, even
 * when it was started from a link; otherwise the mode's.
 */
export function runLook(config: ModeConfig): RunLook {
    const preset = CUSTOM_PRESETS.find((p) => p.id === goalOfMode(config)?.challengeId)
    if (!preset) return { name: 'Custom', ...CUSTOM_LOOK }
    return { name: preset.name, ...(PRESET_LOOKS[preset.id] ?? UNKNOWN_LOOK) }
}

export const runName = (config: ModeConfig): string => runLook(config).name

/**
 * The saved record of one goal. `turn` is the earliest turn of a win, null until the goal is won. `version` is the game version
 * of the run that last changed the entry; results are never dropped when the version changes.
 */
export interface StoredResult {
    won: boolean
    best: number
    turn: number | null
    version: string
}

export type Results = Record<string, StoredResult>

const KEY = 'results'

const keyOf = ({ challengeId, goal }: ChallengeGoal): string => `${challengeId}:${goal}`

export function loadResults(storage: AppStorage): Results {
    const record = storage.get<Partial<SignedResults> | null>(KEY, null)
    if (typeof record !== 'object' || record === null || !isSigned(record)) return {}
    return record.results
}

export function resultOf(results: Results, challengeId: string, goal: number): Result {
    const found = results[keyOf({ challengeId, goal })]
    return found ? { won: found.won, best: found.best, turn: found.turn } : { won: false, best: null, turn: null }
}

/**
 * Notes a finished run: the best hearts of its goal, whether it was won, and the earliest turn of a win. The two records are
 * independent, so a faster win with fewer hearts keeps the old best. Returns the new results, or null when nothing changed.
 */
export function recordFinished(storage: AppStorage, state: GameState, version: string): Results | null {
    if (state.status === 'playing') return null
    const target = goalOfMode(state.config)
    if (!target) return null
    const results = loadResults(storage)
    const old = results[keyOf(target)]
    const won = state.status === 'won' || old?.won === true
    const best = Math.max(state.hearts, old?.best ?? state.hearts)
    const metTurn = state.goalMetTurn
    const turn = metTurn !== null ? Math.min(metTurn, old?.turn ?? metTurn) : (old?.turn ?? null)
    if (old && old.won === won && old.best === best && old.turn === turn) return null
    const next = { ...results, [keyOf(target)]: { won, best, turn, version } }
    saveResults(storage, next)
    return next
}

/** What a finished run changed in the record of its goal, as lines for the run summary. Empty when it beat nothing or has no goal. */
export function improvementLines(before: Results, after: Results, config: ModeConfig): string[] {
    const target = goalOfMode(config)
    const next = target ? after[keyOf(target)] : undefined
    if (!target || !next) return []
    const old = before[keyOf(target)]
    if (!old) return [next.won ? 'First win' : 'First result recorded']
    const lines: string[] = []
    if (next.won && !old.won) lines.push('First win')
    if (next.best > old.best) lines.push(`New best: ${next.best} ♥ (was ${old.best})`)
    if (next.turn !== null && old.turn !== null && next.turn < old.turn) lines.push(`Fastest win: turn ${next.turn} (was ${old.turn})`)
    return lines
}

/** The lines of the latest run that changed a record, with the address of that run, so a reload still shows them for that run only. */
export interface RunImprovements {
    run: string
    lines: string[]
}

const IMPROVEMENTS_KEY = 'improvements'

export function loadImprovements(storage: AppStorage): RunImprovements | null {
    const saved = storage.get<Partial<RunImprovements> | null>(IMPROVEMENTS_KEY, null)
    const valid = saved && typeof saved.run === 'string' && Array.isArray(saved.lines) && saved.lines.every((l) => typeof l === 'string')
    return valid ? { run: saved.run!, lines: saved.lines! } : null
}

/** Drops saved lines that belong to a run other than `current` (null when no run is saved), so they live as long as the saved run does. */
export function forgetStaleImprovements(storage: AppStorage, current: string | null): void {
    if (loadImprovements(storage)?.run !== current) storage.remove(IMPROVEMENTS_KEY)
}

export function saveImprovements(storage: AppStorage, improvements: RunImprovements): void {
    storage.set(IMPROVEMENTS_KEY, improvements)
}

/** The results with a signature over them. It is what is stored and what is copied to another device. */
export interface SignedResults {
    results: Results
    sig: string
}

/**
 * Not a secret: the source is readable, so this only stops a number being edited in the paste box or in storage.
 * Changing the salt or the hash makes every saved record unreadable.
 */
const SIGNATURE_SALT = 'heartrow results'

const canonicalText = (results: Results): string =>
    Object.keys(results)
        .sort()
        .map((key) => {
            const { won, best, turn, version } = results[key]!
            return `${key}=${won ? 1 : 0},${best},${turn ?? ''},${version}`
        })
        .join(';')

/** cyrb53, a small string hash with no dependencies; it needs no secure context, unlike `crypto.subtle`. */
function hashText(text: string): string {
    let h1 = 0xdeadbeef
    let h2 = 0x41c6ce57
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        h1 = Math.imul(h1 ^ code, 2654435761)
        h2 = Math.imul(h2 ^ code, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export const signatureOf = (results: Results): string => hashText(`${SIGNATURE_SALT}\n${canonicalText(results)}`)

const signed = (results: Results): SignedResults => ({ results, sig: signatureOf(results) })

/** Whether the record has well-formed entries and a signature that matches them. */
function isSigned(record: Partial<SignedResults>): record is SignedResults {
    const { results, sig } = record
    if (typeof results !== 'object' || results === null || typeof sig !== 'string') return false
    return Object.values(results).every(isStoredResult) && sig === signatureOf(results)
}

export function saveResults(storage: AppStorage, results: Results): void {
    storage.set(KEY, signed(results))
}

/** The results as text to carry to another device or origin. */
export const resultsText = (results: Results): string => JSON.stringify(signed(results))

export type ImportOutcome = { results: Results; improved: number } | { error: string }

const isPositiveInteger = (value: unknown): boolean => Number.isInteger(value) && (value as number) > 0

const isStoredResult = (value: unknown): value is StoredResult => {
    const entry = value as Partial<StoredResult> | null
    return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.won === 'boolean' &&
        typeof entry.best === 'number' &&
        Number.isFinite(entry.best) &&
        (entry.turn === null || isPositiveInteger(entry.turn)) &&
        typeof entry.version === 'string'
    )
}

/** Keeps the better of each record. The entry takes the incoming version only when the incoming side improved something. */
export function mergeResult(local: StoredResult | undefined, incoming: StoredResult): StoredResult {
    if (!local) return incoming
    const won = local.won || incoming.won
    const best = Math.max(local.best, incoming.best)
    const turn = local.turn === null ? incoming.turn : incoming.turn === null ? local.turn : Math.min(local.turn, incoming.turn)
    const same = won === local.won && best === local.best && turn === local.turn
    return { won, best, turn, version: same ? local.version : incoming.version }
}

const sameRecords = (old: StoredResult | undefined, next: StoredResult): boolean =>
    old !== undefined && old.won === next.won && old.best === next.best && old.turn === next.turn

/** Merges pasted results into the current ones. A run replay and anything that is not a results record are refused, changing nothing. */
export function importResults(current: Results, text: string): ImportOutcome {
    let raw: unknown
    try {
        raw = JSON.parse(text)
    } catch {
        return { error: 'That is not JSON.' }
    }
    const record = raw as (Partial<SignedResults> & { moves?: unknown }) | null
    if (typeof record !== 'object' || record === null) return { error: 'That is not a results record.' }
    if (Array.isArray(record.moves)) return { error: 'That is a run replay. Use "Paste replay" in the run menu.' }
    if (typeof record.results !== 'object' || record.results === null) return { error: 'That is not a results record.' }
    if (!isSigned(record)) return { error: 'These results were changed after they were copied, or are damaged.' }
    const incoming = Object.entries(record.results)
    if (incoming.length === 0) return { error: 'That record has no results.' }
    const results = { ...current }
    let improved = 0
    for (const [key, entry] of incoming) {
        const merged = mergeResult(current[key], entry)
        if (!sameRecords(current[key], merged)) improved++
        results[key] = merged
    }
    return { results, improved }
}

/** Where the player is on the challenge screen: the card in the middle and the goal picked on each card. */
export interface ChallengeView {
    index: number
    picked: Record<string, number>
}

export const FRESH_VIEW: ChallengeView = { index: 0, picked: {} }

/** The goal a card shows as selected: the picked one, or the lowest level not won yet. */
export function selectedGoal(view: ChallengeView, results: Results, challengeId: string): number {
    return view.picked[challengeId] ?? nextGoal(results, challengeId)
}

/** The address of the challenge screen on a card and goal, so a reload or a link opens the same place. */
export function challengeQuery(challenges: Challenge[], view: ChallengeView, results: Results): string {
    const card = challenges[view.index]
    if (!card) return '?screen=challenges'
    const goal = selectedGoal(view, results, card.id)
    return `?screen=challenges&challenge=${card.id}&goal=${GOALS[goal]!.key}`
}

/** The view an address names. An unknown card or goal is ignored, so a stale link still opens the screen. */
export function viewFromSearch(search: string, challenges: Challenge[]): ChallengeView {
    const params = new URLSearchParams(search)
    const index = challenges.findIndex((c) => c.id === params.get('challenge'))
    if (index < 0) return FRESH_VIEW
    const goal = goalIndexOfKey(params.get('goal'))
    return { index, picked: goal === null ? {} : { [challenges[index]!.id]: goal } }
}

/** The goal to preselect: the first one not won yet, or the last when all are won. */
export function nextGoal(results: Results, challengeId: string): number {
    const open = GOALS.findIndex((_, level) => !resultOf(results, challengeId, level).won)
    return open === -1 ? GOALS.length - 1 : open
}

import { CUSTOM_PRESETS, GOALS, LONG_MODE, customFromMode, customMode, customSummary, standardMode } from '../../core'
import type { CustomGenerator, GameState, ModeConfig } from '../../core'
import { customQuery } from './custom'
import type { AppStorage } from './storage'

/** The goal list of a challenge: the Standard levels by index, then Long Run. */
export const LONG_GOAL = GOALS.length

export interface Challenge {
    id: string
    name: string
    blurb: string
    icon: string
    /** The colour of its card, as a CSS value. */
    accent: string
    /** Whether this challenge has a Long Run goal (only Standard has one so far). */
    hasLongRun: boolean
    /** Custom runs differ every time, so no results are kept for them. */
    tracked: boolean
    /** The run for a goal: a level index, or `LONG_GOAL`. */
    mode: (goal: number) => ModeConfig
}

/** What the player did on one goal. `best` is the most hearts reached; `won` is whether the goal was met. */
export interface Result {
    won: boolean
    best: number | null
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
const LONG_LOOK: Look = { icon: 'long', accent: 'var(--tide)' }
const UNKNOWN_LOOK: Look = { icon: 'plain', accent: 'var(--dim)' }

function presetChallenge(id: string, name: string, generator: CustomGenerator): Challenge {
    const isStandard = id === 'standard'
    return {
        id,
        name,
        blurb: isStandard ? 'Every card type, resource and effect.' : customSummary(generator),
        ...(PRESET_LOOKS[id] ?? UNKNOWN_LOOK),
        hasLongRun: isStandard,
        tracked: true,
        mode: (goal) => {
            if (isStandard) return goal === LONG_GOAL ? LONG_MODE : standardMode(goal)
            return customMode({ ...generator, goalLevel: goal })
        },
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
            hasLongRun: false,
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
    if (config.id === 'long') return { challengeId: 'standard', goal: LONG_GOAL }
    if (config.id === 'standard') {
        const goal = GOALS.indexOf(config.goal ?? -1)
        return goal >= 0 ? { challengeId: 'standard', goal } : null
    }
    const custom = customFromMode(config)
    const challengeId = custom ? presetIdOf(custom) : null
    return custom && challengeId ? { challengeId, goal: custom.goalLevel } : null
}

export interface RunLook extends Look {
    name: string
}

/**
 * How a run shows itself in the game header, in the style of its card: a preset by its own name, icon and colour, even
 * when it was started from a link; otherwise the mode's.
 */
export function runLook(config: ModeConfig): RunLook {
    if (config.id === 'long') return { name: 'Long Run', ...LONG_LOOK }
    if (config.id === 'standard') return { name: 'Standard', ...PRESET_LOOKS.standard! }
    const preset = CUSTOM_PRESETS.find((p) => p.id === goalOfMode(config)?.challengeId)
    if (!preset) return { name: 'Custom', ...CUSTOM_LOOK }
    return { name: preset.name, ...(PRESET_LOOKS[preset.id] ?? UNKNOWN_LOOK) }
}

export const runName = (config: ModeConfig): string => runLook(config).name

export type Results = Record<string, { won: boolean; best: number }>

const KEY = 'results'

const keyOf = ({ challengeId, goal }: ChallengeGoal): string => `${challengeId}:${goal}`

export function loadResults(storage: AppStorage): Results {
    const raw = storage.get<Record<string, unknown> | null>(KEY, null)
    const results: Results = {}
    if (raw === null || typeof raw !== 'object') return results
    for (const [key, value] of Object.entries(raw)) {
        const entry = value as { won?: unknown; best?: unknown } | null
        if (entry && typeof entry.best === 'number' && Number.isFinite(entry.best))
            results[key] = { won: entry.won === true, best: entry.best }
    }
    return results
}

export function resultOf(results: Results, challengeId: string, goal: number): Result {
    const found = results[keyOf({ challengeId, goal })]
    return found ? { won: found.won, best: found.best } : { won: false, best: null }
}

/** Notes a finished run: the best hearts of its goal, and whether it was won. Returns the new results, or null when nothing changed. */
export function recordFinished(storage: AppStorage, state: GameState): Results | null {
    if (state.status === 'playing') return null
    const target = goalOfMode(state.config)
    if (!target) return null
    const results = loadResults(storage)
    const old = results[keyOf(target)]
    const won = state.status === 'won' || old?.won === true
    const best = Math.max(state.hearts, old?.best ?? state.hearts)
    if (old && old.won === won && old.best === best) return null
    const next = { ...results, [keyOf(target)]: { won, best } }
    storage.set(KEY, next)
    return next
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
    return `?screen=challenges&challenge=${card.id}&goal=${goal === LONG_GOAL ? 'long' : goal + 1}`
}

/** The view an address names. An unknown card or goal is ignored, so a stale link still opens the screen. */
export function viewFromSearch(search: string, challenges: Challenge[]): ChallengeView {
    const params = new URLSearchParams(search)
    const index = challenges.findIndex((c) => c.id === params.get('challenge'))
    if (index < 0) return FRESH_VIEW
    const raw = params.get('goal')
    const goal = raw === 'long' ? LONG_GOAL : Number(raw) - 1
    const valid = Number.isInteger(goal) && goal >= 0 && (goal < GOALS.length || (goal === LONG_GOAL && challenges[index]!.hasLongRun))
    return { index, picked: valid ? { [challenges[index]!.id]: goal } : {} }
}

/** The goal to preselect: the lowest level not won yet, or the last level when all are won. */
export function nextGoal(results: Results, challengeId: string): number {
    const open = GOALS.findIndex((_, level) => !resultOf(results, challengeId, level).won)
    return open === -1 ? GOALS.length - 1 : open
}

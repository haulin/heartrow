import { CUSTOM_ID, GOALS, LONG_MODE, customFromMode, customMode, standardMode } from '../../core'
import type { ModeConfig } from '../../core'
import { customQuery, parseCustom } from './custom'

/** A goal level (1 to 3) from a link, as an index into the goals. Anything else is null. */
function levelOf(raw: string | null | undefined): number | null {
    const n = Number(raw)
    return raw && Number.isInteger(n) && n >= 1 && n <= GOALS.length ? n - 1 : null
}

/**
 * `standard` and `long` are the modes; `goal` (1 to 3) picks the target for Standard. Older links used `standard1` to
 * `standard3`, `level2` or a bare `2`, so a level written into the id still works when there is no `goal`.
 */
export function modeFromId(id: string | null | undefined, goal?: string | null): ModeConfig {
    const key = (id ?? '').toLowerCase()
    if (key === 'long') return LONG_MODE
    const inId = /^(?:standard|level)?(\d)$/.exec(key)
    return standardMode(levelOf(goal) ?? levelOf(inId?.[1]) ?? 0)
}

export function randomSeed(): number {
    return (Math.floor(Math.random() * 0x100000000) ^ (Date.now() & 0xffffffff)) >>> 0
}

export interface StartParams {
    config: ModeConfig
    seed: number
}

export function parseStartParams(search: string, fallbackSeed: () => number = randomSeed): StartParams {
    const params = new URLSearchParams(search)
    const raw = params.get('seed')
    const parsed = raw !== null && /^-?\d+$/.test(raw) ? Number(raw) >>> 0 : null
    const mode = params.get('mode')
    const config = mode?.toLowerCase() === CUSTOM_ID ? customMode(parseCustom(params)) : modeFromId(mode, params.get('goal'))
    return { config, seed: parsed ?? fallbackSeed() }
}

/** A link starts a run when it names a mode or a seed. An address with neither is the home screen. */
export function hasRun(search: string): boolean {
    const params = new URLSearchParams(search)
    return params.has('mode') || params.has('seed')
}

export type Route = { screen: 'home' } | { screen: 'game'; start: StartParams | null }

/**
 * The screen an address shows. `runQuery` is the share query of the run in memory, or null when none was started.
 * A game address that matches the run in memory resumes it (`start` is null); any other game address starts that run.
 */
export function routeFor(search: string, runQuery: string | null, fallbackSeed: () => number = randomSeed): Route {
    if (!hasRun(search)) return { screen: 'home' }
    if (runQuery !== null && search === runQuery) return { screen: 'game', start: null }
    return { screen: 'game', start: parseStartParams(search, fallbackSeed) }
}

export function shareQuery(config: ModeConfig, seed: number): string {
    const custom = customFromMode(config)
    if (custom) return `?seed=${seed}&mode=${config.id}&${customQuery(custom)}`
    const level = config.goal === null ? -1 : GOALS.indexOf(config.goal)
    return `?seed=${seed}&mode=${config.id}${level >= 0 ? `&goal=${level + 1}` : ''}`
}

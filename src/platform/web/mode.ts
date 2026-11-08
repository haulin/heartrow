import { CUSTOM_ID, customMode, customOfMode } from '../../core'
import type { CustomGenerator, ModeConfig } from '../../core'
import { customQuery, parseCustom } from './custom'

export function randomSeed(): number {
    return Math.floor(Math.random() * 0x100000000)
}

export interface StartParams {
    config: ModeConfig
    seed: number
}

export function parseStartParams(search: string, fallbackSeed: () => number = randomSeed): StartParams {
    const params = new URLSearchParams(search)
    const raw = params.get('seed')
    const parsed = raw !== null && /^-?\d+$/.test(raw) ? Number(raw) >>> 0 : null
    // Every run is a generator, so every link spells one out. What a link leaves out is everything (Standard), at the first goal.
    return { config: customMode(parseCustom(params)), seed: parsed ?? fallbackSeed() }
}

/** A link starts a run when it names a mode or a seed. An address with neither is the home screen. */
export function hasRun(search: string): boolean {
    const params = new URLSearchParams(search)
    return params.has('mode') || params.has('seed')
}

/** `screen=custom` is the generator editor. It wins over a mode or seed, since the editor starts no run by itself. */
export function isEditor(search: string): boolean {
    return new URLSearchParams(search).get('screen') === 'custom'
}

/** `screen=challenges` is the challenge picker. Like the editor, it starts no run by itself. */
export function isChallenges(search: string): boolean {
    return new URLSearchParams(search).get('screen') === 'challenges'
}

/** `screen=standard` is the Standard picker (the levels and Long Run). It starts no run by itself either. */
export function isStandard(search: string): boolean {
    return new URLSearchParams(search).get('screen') === 'standard'
}

export type Route =
    | { screen: 'home' }
    | { screen: 'custom'; def: CustomGenerator }
    | { screen: 'standard' }
    | { screen: 'challenges' }
    | { screen: 'game'; start: StartParams | null }

/**
 * The screen an address shows. `runQuery` is the share query of the run in memory, or null when none was started.
 * A game address that matches the run in memory resumes it (`start` is null); any other game address starts that run.
 */
export function routeFor(search: string, runQuery: string | null, fallbackSeed: () => number = randomSeed): Route {
    if (isEditor(search)) return { screen: 'custom', def: parseCustom(new URLSearchParams(search)) }
    if (isStandard(search)) return { screen: 'standard' }
    if (isChallenges(search)) return { screen: 'challenges' }
    if (!hasRun(search)) return { screen: 'home' }
    if (runQuery !== null && search === runQuery) return { screen: 'game', start: null }
    return { screen: 'game', start: parseStartParams(search, fallbackSeed) }
}

export function shareQuery(config: ModeConfig, seed: number): string {
    return `?seed=${seed}&mode=${CUSTOM_ID}&${customQuery(customOfMode(config))}`
}

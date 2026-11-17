import { CUSTOM_ID, CUSTOM_PRESETS, customMode, customOfMode } from '../../core'
import type { CustomGenerator, ModeConfig } from '../../core'
import { presetIdOf } from './challenges'
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
    const config = customMode(parseCustom(params))
    const version = params.get('v')
    return {
        config: { ...config, ...presetClaim(params.get('mode')), ...(version ? { version } : {}) },
        seed: parsed ?? fallbackSeed(),
    }
}

/**
 * A link starts a run when it says `screen=play`; a seed alone does not. Any other address is the home screen.
 * `mode=…` is the deprecated spelling of `screen=play`; it is still read so old links keep working.
 */
export function hasRun(search: string): boolean {
    const params = new URLSearchParams(search)
    return params.get('screen') === 'play' || params.has('mode')
}

/** The screens besides the home screen and the game that an address names with `screen=`. None of them starts a run by itself. */
const ADDRESSED_SCREENS = ['custom', 'standard', 'challenges', 'compendium'] as const
export type AddressedScreen = (typeof ADDRESSED_SCREENS)[number]

/**
 * `screen=custom` is the generator editor, `standard` the Standard picker (the levels and Long Run), `challenges` the challenge picker and
 * `compendium` the reference. They win over a mode or seed, since they start no run.
 */
export function addressedScreen(search: string): AddressedScreen | null {
    const screen = new URLSearchParams(search).get('screen')
    return ADDRESSED_SCREENS.find((name) => name === screen) ?? null
}

export function isEditor(search: string): boolean {
    return addressedScreen(search) === 'custom'
}

export type Route =
    | { screen: 'home' }
    | { screen: 'custom'; def: CustomGenerator }
    | { screen: 'standard' | 'challenges' | 'compendium' }
    | { screen: 'game'; start: StartParams | null }

/**
 * The screen an address shows. `runQuery` is the share query of the run in memory, or null when none was started.
 * A game address that matches the run in memory resumes it (`start` is null); any other game address starts that run.
 */
export function routeFor(search: string, runQuery: string | null, fallbackSeed: () => number = randomSeed): Route {
    const screen = addressedScreen(search)
    if (screen === 'custom') return { screen, def: parseCustom(new URLSearchParams(search)) }
    if (screen) return { screen }
    if (!hasRun(search)) return { screen: 'home' }
    if (runQuery !== null && search === runQuery) return { screen: 'game', start: null }
    return { screen: 'game', start: parseStartParams(search, fallbackSeed) }
}

/** `mode` names the preset a run was started as (`simple`, `ember`, …); anything else, like the old `custom`, names none. */
function presetClaim(mode: string | null): { preset?: string } {
    return CUSTOM_PRESETS.some((p) => p.id === mode) ? { preset: mode! } : {}
}

/**
 * The link spells out the settings and names the preset, so a later change to that preset marks the run as outdated instead of renaming it.
 * The version goes last, as the least interesting part; a link keeps the version it was made in.
 */
export function shareQuery(config: ModeConfig, seed: number): string {
    const mode = presetOfLink(config)
    return `?screen=play&seed=${seed}&mode=${mode}&${customQuery(customOfMode(config))}&v=${config.version ?? __APP_VERSION__}`
}

function presetOfLink(config: ModeConfig): string {
    return config.preset ?? presetIdOf(customOfMode(config)) ?? CUSTOM_ID
}

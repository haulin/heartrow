import { CUSTOM_EFFECTS, CUSTOM_RESOURCES, CUSTOM_TYPES, GOALS, STARTER, goalIndexOfKey } from '../../core'
import type { CustomGenerator, EffectId } from '../../core'

/** The link side of custom generators: reading and writing the address. The data and the presets live in core. */
export const MAX_STARTER = 12

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T[] | null {
    if (raw === null) return null
    const wanted = raw.split(',').filter((item) => item !== '')
    return allowed.filter((item) => wanted.includes(item))
}

function count(raw: string | null, fallback: number): number {
    return raw !== null && /^\d+$/.test(raw) ? Math.min(Number(raw), MAX_STARTER) : fallback
}

/**
 * `goal` is the key of a goal (`1` to `4`, or `long`). A missing `types`, `res` or `fx` means all of them, and an empty `fx` means none. Unknown names are ignored.
 * `sg` and `sp` are the Basic gold and power cards you start with.
 */
export function parseCustom(params: URLSearchParams): CustomGenerator {
    const types = pick(params.get('types'), CUSTOM_TYPES)
    const resources = pick(params.get('res'), CUSTOM_RESOURCES)
    const starterGold = count(params.get('sg'), STARTER.basicGold)
    const starterPower = count(params.get('sp'), STARTER.basicPower)
    const hasStarter = starterGold + starterPower > 0
    return {
        goalLevel: goalIndexOfKey(params.get('goal')) ?? 0,
        types: types && types.length > 0 ? types : [...CUSTOM_TYPES],
        resources: resources && resources.length > 0 ? resources : [...CUSTOM_RESOURCES],
        effects: pick(params.get('fx'), CUSTOM_EFFECTS) ?? [...CUSTOM_EFFECTS],
        starterGold: hasStarter ? starterGold : STARTER.basicGold,
        starterPower: hasStarter ? starterPower : STARTER.basicPower,
    }
}

export function customQuery(def: CustomGenerator): string {
    return `goal=${GOALS[def.goalLevel]!.key}&types=${def.types.join(',')}&res=${def.resources.join(',')}&sg=${def.starterGold}&sp=${def.starterPower}&fx=${def.effects.join(',')}`
}

/** The address of the editor screen: `screen=custom` and the settings, with no seed and no mode, so it starts no run. */
export function editorQuery(def: CustomGenerator): string {
    return `?screen=custom&${customQuery(def)}`
}

/** `reapG` becomes "Reap G". */
export function effectName(id: EffectId): string {
    const spaced = id.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

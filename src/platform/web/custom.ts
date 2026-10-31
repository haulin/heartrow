import { EFFECTS, GOALS, standardMode, unmetNeeds } from '../../core'
import type { EffectId, GeneratorCardType, GeneratorConfig, GeneratorResource, ModeConfig } from '../../core'

/** A custom generator: a Standard goal, the Basic cards you start with, and what the generator may use. Lives in the URL. */
export interface CustomGenerator {
    goalLevel: number
    types: GeneratorCardType[]
    resources: GeneratorResource[]
    effects: EffectId[]
    starterGold: number
    starterPower: number
}

export const CUSTOM_ID = 'custom'
export const CUSTOM_TYPES: readonly GeneratorCardType[] = ['moss', 'ember', 'tide', 'foe']
export const CUSTOM_RESOURCES: readonly GeneratorResource[] = ['gold', 'power', 'hearts']
export const CUSTOM_EFFECTS: readonly EffectId[] = EFFECTS.map((e) => e.id)

const STARTER = standardMode(0).starter
export const MAX_STARTER = 12

export const DEFAULT_CUSTOM: CustomGenerator = {
    goalLevel: 0,
    types: [...CUSTOM_TYPES],
    resources: [...CUSTOM_RESOURCES],
    effects: [...CUSTOM_EFFECTS],
    starterGold: STARTER.basicGold,
    starterPower: STARTER.basicPower,
}

export interface CustomPreset {
    id: string
    name: string
    generator: CustomGenerator
}

/**
 * Starting points for the dialog and a small library of odd generators. A preset only fills in the controls;
 * the run uses what the controls say when you press Start.
 */
export const CUSTOM_PRESETS: readonly CustomPreset[] = [
    { id: 'standard', name: 'Standard', generator: DEFAULT_CUSTOM },
    { id: 'simple', name: 'Simple only', generator: { ...DEFAULT_CUSTOM, effects: [] } },
    {
        id: 'attack',
        name: 'Attack only',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['foe'],
            resources: ['power', 'hearts'],
            effects: ['foes', 'weak'],
            starterGold: 0,
            starterPower: 5,
        },
    },
    {
        id: 'pacifist',
        name: 'Pacifist',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['moss', 'tide'],
            resources: ['gold', 'hearts'],
            effects: ['draw', 'coin', 'exile', 'cheap', 'vault', 'bond', 'kin', 'army', 'cycle', 'purge', 'reapG'],
            starterGold: STARTER.basicGold + STARTER.basicPower,
            starterPower: 0,
        },
    },
]

export function customMode(def: CustomGenerator): ModeConfig {
    const base = standardMode(def.goalLevel)
    return {
        ...base,
        id: CUSTOM_ID,
        name: 'Custom generator',
        description: customSummary(def),
        starter: { basicGold: def.starterGold, basicPower: def.starterPower },
        generator: { allowedTypes: [...def.types], allowedResources: [...def.resources], allowedEffects: [...def.effects] },
    }
}

export function generatorOf(def: CustomGenerator): GeneratorConfig {
    return { allowedTypes: def.types, allowedResources: def.resources, allowedEffects: def.effects }
}

/** The card types the generator can actually make: enemies need power and hearts. */
export function effectiveTypes(def: CustomGenerator): GeneratorCardType[] {
    const enemies = def.resources.includes('power') && def.resources.includes('hearts')
    return def.types.filter((type) => type !== 'foe' || enemies)
}

/** The effects the generator can actually roll: ticked, and with every need met. */
export function effectiveEffects(def: CustomGenerator): EffectId[] {
    const generator = generatorOf(def)
    return def.effects.filter((id) => unmetNeeds(generator, id).length === 0)
}

export function customSummary(def: CustomGenerator): string {
    const types = effectiveTypes(def)
    const effects = effectiveEffects(def).length
    return [
        types.length === CUSTOM_TYPES.length ? 'all types' : types.join(', ') || 'no card types',
        def.resources.length === CUSTOM_RESOURCES.length ? 'all resources' : def.resources.join(', '),
        effects === CUSTOM_EFFECTS.length ? 'all effects' : effects === 0 ? 'no effects' : `${effects} of ${CUSTOM_EFFECTS.length} effects`,
        // The starter is only worth a mention when it is not the usual one.
        ...(def.starterGold === STARTER.basicGold && def.starterPower === STARTER.basicPower
            ? []
            : [`start with ${def.starterGold} ● and ${def.starterPower} ⚔ Basics`]),
    ].join('; ')
}

/** Reads a custom generator back out of a running custom mode, so the dialog and links can reuse it. */
export function customFromMode(config: ModeConfig): CustomGenerator | null {
    if (config.id !== CUSTOM_ID || !config.generator) return null
    const goalLevel = Math.max(0, GOALS.indexOf(config.goal ?? GOALS[0]!))
    return {
        goalLevel,
        types: [...config.generator.allowedTypes],
        resources: [...config.generator.allowedResources],
        effects: [...config.generator.allowedEffects],
        starterGold: config.starter.basicGold,
        starterPower: config.starter.basicPower,
    }
}

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T[] | null {
    if (raw === null) return null
    const wanted = raw.split(',').filter((item) => item !== '')
    return allowed.filter((item) => wanted.includes(item))
}

function count(raw: string | null, fallback: number): number {
    return raw !== null && /^\d+$/.test(raw) ? Math.min(Number(raw), MAX_STARTER) : fallback
}

/**
 * `goal` is 1 to 3. A missing `types`, `res` or `fx` means all of them, and an empty `fx` means none. Unknown names are ignored.
 * `sg` and `sp` are the Basic gold and power cards you start with.
 */
export function parseCustom(params: URLSearchParams): CustomGenerator {
    const goal = Number(params.get('goal'))
    const types = pick(params.get('types'), CUSTOM_TYPES)
    const resources = pick(params.get('res'), CUSTOM_RESOURCES)
    const starterGold = count(params.get('sg'), STARTER.basicGold)
    const starterPower = count(params.get('sp'), STARTER.basicPower)
    const hasStarter = starterGold + starterPower > 0
    return {
        goalLevel: Number.isInteger(goal) && goal >= 1 && goal <= GOALS.length ? goal - 1 : 0,
        types: types && types.length > 0 ? types : [...CUSTOM_TYPES],
        resources: resources && resources.length > 0 ? resources : [...CUSTOM_RESOURCES],
        effects: pick(params.get('fx'), CUSTOM_EFFECTS) ?? [...CUSTOM_EFFECTS],
        starterGold: hasStarter ? starterGold : STARTER.basicGold,
        starterPower: hasStarter ? starterPower : STARTER.basicPower,
    }
}

export function customQuery(def: CustomGenerator): string {
    return `goal=${def.goalLevel + 1}&types=${def.types.join(',')}&res=${def.resources.join(',')}&sg=${def.starterGold}&sp=${def.starterPower}&fx=${def.effects.join(',')}`
}

/** `reapG` becomes "Reap G". */
export function effectName(id: EffectId): string {
    const spaced = id.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

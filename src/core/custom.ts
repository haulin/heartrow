import { EFFECTS } from './effects'
import { unmetNeeds } from './generator/limits'
import { GOALS, standardMode } from './modes'
import type { EffectId, GeneratorCardType, GeneratorConfig, GeneratorResource, ModeConfig } from './types'

/** A custom generator: a Standard goal, the Basic cards you start with, and what the generator may use. Plain data, so any platform can store or share it. */
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

export const STARTER = standardMode(0).starter

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
 * Starting points and a small library of odd generators. A preset only fills in the controls;
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
    {
        id: 'moss',
        name: 'Moss economy',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['moss'],
            resources: ['gold', 'hearts'],
            effects: ['draw', 'coin', 'exile', 'cheap', 'basics', 'bond', 'kin', 'reapG'],
            starterGold: STARTER.basicGold + STARTER.basicPower,
            starterPower: 0,
        },
    },
    {
        id: 'tide',
        name: 'Tide hearts',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['tide'],
            resources: ['gold', 'hearts'],
            effects: ['draw', 'exile', 'cheap', 'vault', 'bond', 'kin', 'cycle', 'purge'],
            starterGold: STARTER.basicGold + STARTER.basicPower,
            starterPower: 0,
        },
    },
    {
        id: 'ember',
        name: 'Ember combat',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['ember', 'foe'],
            effects: ['draw', 'coin', 'exile', 'foes', 'pile', 'bond', 'kin', 'weak', 'army', 'swap', 'reapP'],
            starterGold: 7,
            starterPower: 3,
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

/** The generator settings any mode amounts to, as a starting point for editing: a custom run's own, otherwise the defaults at its goal. */
export function customOfMode(config: ModeConfig): CustomGenerator {
    const goalLevel = Math.max(0, GOALS.indexOf(config.goal ?? GOALS[0]!))
    return customFromMode(config) ?? { ...DEFAULT_CUSTOM, goalLevel }
}

/** Reads a custom generator back out of a running custom mode, so a platform can reuse it. */
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

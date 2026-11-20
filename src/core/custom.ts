import { EFFECTS } from './effects'
import { unmetNeeds } from './generator/limits'
import { standardMode } from './modes'
import type { EffectId, GeneratorCardType, GeneratorConfig, GeneratorResource, Keyword, ModeConfig } from './types'

/** A custom generator: a Standard goal, the Basic cards you start with, and what the generator may use. Plain data, so any platform can store or share it. */
export interface CustomGenerator {
    goalLevel: number
    types: GeneratorCardType[]
    resources: GeneratorResource[]
    effects: EffectId[]
    keywords: Keyword[]
    starterGold: number
    starterPower: number
}

export const CUSTOM_ID = 'custom'
export const CUSTOM_TYPES: readonly GeneratorCardType[] = ['moss', 'ember', 'tide', 'foe']
export const CUSTOM_RESOURCES: readonly GeneratorResource[] = ['gold', 'power', 'hearts']
export const CUSTOM_EFFECTS: readonly EffectId[] = EFFECTS.map((e) => e.id)
export const CUSTOM_KEYWORDS: readonly Keyword[] = ['retain']

export const STARTER = standardMode(0).starter

export const DEFAULT_CUSTOM: CustomGenerator = {
    goalLevel: 0,
    types: [...CUSTOM_TYPES],
    resources: [...CUSTOM_RESOURCES],
    effects: [...CUSTOM_EFFECTS],
    keywords: [...CUSTOM_KEYWORDS],
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
    {
        id: 'moss',
        name: 'Moss economy',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['moss'],
            resources: ['gold', 'hearts'],
            effects: ['draw', 'flip', 'exile', 'basics', 'bond', 'kin', 'reapG', 'flush'],
            starterGold: 7,
            starterPower: 0,
        },
    },
    {
        id: 'ember',
        name: 'Ember combat',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['ember', 'foe'],
            effects: [
                'draw',
                'flip',
                'exile',
                'foes',
                'pile',
                'hoard',
                'bulk',
                'bond',
                'kin',
                'weak',
                'army',
                'swap',
                'reapP',
                'reload',
                'push',
                'shift',
                'flush',
            ],
            starterGold: 7,
            starterPower: 3,
        },
    },
    { id: 'simple', name: 'Simple only', generator: { ...DEFAULT_CUSTOM, effects: [], starterGold: 5, starterPower: 3 } },
    {
        id: 'attack',
        name: 'Attack only',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['foe'],
            resources: ['power', 'hearts'],
            effects: ['flip', 'foes', 'bulk', 'weak', 'push', 'shift', 'flush'],
            starterGold: 0,
            starterPower: 5,
        },
    },
    {
        id: 'pacifist',
        name: 'Pacifist',
        generator: {
            ...DEFAULT_CUSTOM,
            types: ['moss', 'ember', 'tide'],
            resources: ['gold', 'hearts'],
            effects: [
                'flip',
                'exile',
                'all3',
                'vault',
                'basics',
                'pile',
                'hoard',
                'bond',
                'kin',
                'army',
                'redraw',
                'reapG',
                'echo',
                'flush',
            ],
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
            effects: ['draw', 'cheap', 'pile', 'hoard', 'bond', 'cycle', 'redraw', 'echo', 'flush'],
            starterGold: STARTER.basicGold + STARTER.basicPower,
            starterPower: 0,
        },
    },
]

/** The Standard game at a goal. It is the default generator like any other, so its link spells the generator out. */
export function standardRun(goalIndex: number): ModeConfig {
    return customMode({ ...DEFAULT_CUSTOM, goalLevel: goalIndex })
}

export function customMode(def: CustomGenerator): ModeConfig {
    const base = standardMode(def.goalLevel)
    return {
        ...base,
        id: CUSTOM_ID,
        name: 'Custom generator',
        description: customSummary(def),
        starter: { basicGold: def.starterGold, basicPower: def.starterPower },
        generator: {
            allowedTypes: [...def.types],
            allowedResources: [...def.resources],
            allowedEffects: [...def.effects],
            allowedKeywords: [...def.keywords],
        },
    }
}

export function generatorOf(def: CustomGenerator): GeneratorConfig {
    return {
        allowedTypes: def.types,
        allowedResources: def.resources,
        allowedEffects: def.effects,
        allowedKeywords: def.keywords,
    }
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
        ...(def.keywords.length === CUSTOM_KEYWORDS.length ? [] : ['no Retain']),
        // The starter is only worth a mention when it is not the usual one.
        ...(def.starterGold === STARTER.basicGold && def.starterPower === STARTER.basicPower
            ? []
            : [`start with ${def.starterGold} ● and ${def.starterPower} ⚔ Basics`]),
    ].join('; ')
}

/** The generator settings any mode amounts to, as a starting point for editing: a custom run's own, otherwise the defaults at its goal. */
export function customOfMode(config: ModeConfig): CustomGenerator {
    return customFromMode(config) ?? { ...DEFAULT_CUSTOM, goalLevel: config.goalIndex }
}

/** Reads a custom generator back out of a running custom mode, so a platform can reuse it. */
export function customFromMode(config: ModeConfig): CustomGenerator | null {
    if (config.id !== CUSTOM_ID || !config.generator) return null
    return {
        goalLevel: config.goalIndex,
        types: [...config.generator.allowedTypes],
        resources: [...config.generator.allowedResources],
        effects: [...config.generator.allowedEffects],
        keywords: [...(config.generator.allowedKeywords ?? CUSTOM_KEYWORDS)],
        starterGold: config.starter.basicGold,
        starterPower: config.starter.basicPower,
    }
}

import { EFFECT_BY_ID, EFFECTS } from '../effects'
import type { Colour, Currency, EffectId, EffectNeed, GeneratorCardType, GeneratorConfig } from '../types'

export const COLOURS: readonly Colour[] = ['moss', 'ember', 'tide']
export const ALL_TYPES: readonly GeneratorCardType[] = [...COLOURS, 'foe']

/** What the generator may actually make, after its settings are read and the cross-checks are applied. */
export interface Limits {
    /** Recruit colours. Never empty. */
    colours: Colour[]
    /** Enemies need power to defeat and hearts to pay out, so they are off when either is. */
    enemies: boolean
    /** Currencies cards may give. Never empty: gold stands in, because recruits cost gold. */
    currencies: Currency[]
    hearts: boolean
    /** Effects the generator may roll: allowed by the setting and with every need met. */
    effects: EffectId[]
}

function has<T>(list: readonly T[] | undefined, item: T): boolean {
    return list === undefined || list.includes(item)
}

function met(generator: GeneratorConfig | undefined, need: EffectNeed): boolean {
    if (!generator) return true
    if (need === 'gold' || need === 'power' || need === 'hearts') return has(generator.allowedResources, need)
    if (need === 'exile') return has(generator.allowedEffects, 'exile')
    if (need === 'foe')
        return has(generator.allowedTypes, 'foe') && has(generator.allowedResources, 'power') && has(generator.allowedResources, 'hearts')
    return has(generator.allowedTypes, need)
}

/** The needs of an effect that the generator turns off. Empty when the effect can be rolled, or when it is switched off itself. */
export function unmetNeeds(generator: GeneratorConfig | undefined, id: EffectId): EffectNeed[] {
    const effect = EFFECT_BY_ID[id]
    const required = (effect.needs ?? []).filter((need) => !met(generator, need))
    const alternatives = effect.needsAny && !effect.needsAny.some((need) => met(generator, need)) ? [...effect.needsAny] : []
    return [...required, ...alternatives]
}

export function generatorLimits(generator: GeneratorConfig | undefined): Limits {
    const types = generator?.allowedTypes?.length ? generator.allowedTypes : ALL_TYPES
    const resources = generator?.allowedResources
    const currencies = (['gold', 'power'] as const).filter((currency) => has(resources, currency))
    const enemies = types.includes('foe') && met(generator, 'foe')
    const colours = COLOURS.filter((colour) => types.includes(colour))
    return {
        colours: colours.length > 0 || enemies ? colours : [...COLOURS],
        enemies,
        currencies: currencies.length > 0 ? currencies : ['gold'],
        hearts: has(resources, 'hearts'),
        effects: EFFECTS.filter((e) => has(generator?.allowedEffects, e.id) && unmetNeeds(generator, e.id).length === 0).map((e) => e.id),
    }
}

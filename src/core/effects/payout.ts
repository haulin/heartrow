import { HEARTS_CHANCE_FIRST, HEARTS_CHANCE_FIRST_TIDE, OTHER_RESOURCE_CHANCE } from '../generator/budget'
import { nextFloat } from '../rng'
import type { Rng } from '../rng'
import type { Card, GeneratorResource } from '../types'
import type { EffectRollContext } from './types'

interface PayoutOption {
    resource: GeneratorResource
    chance: number
    usable: boolean
}

/**
 * The resource a draw `q` in [0, 1) picks. A resource that is not usable (switched off by the limits, or too dear for the budget)
 * gives its chance to the others in proportion to their own, so the draw stays one number whatever the limits are.
 * The last option is the main resource and must be usable; it takes the rest.
 */
export function pickPayoutResource(q: number, options: readonly PayoutOption[]): GeneratorResource {
    const usable = options.filter((option) => option.usable)
    const total = usable.reduce((sum, option) => sum + option.chance, 0)
    let remaining = q * total
    for (const option of usable) {
        if (remaining < option.chance) return option.resource
        remaining -= option.chance
    }
    return usable[usable.length - 1]!.resource
}

/** The three options of a payout in lean order: hearts, the card's other resource, then its main one with the remaining chance. */
export function payoutOptions(
    heartsChance: number,
    main: GeneratorResource,
    { currencies, hearts }: EffectRollContext,
    isAffordable: (resource: GeneratorResource) => boolean,
): PayoutOption[] {
    const other = main === 'gold' ? 'power' : 'gold'
    return [
        { resource: 'hearts', chance: heartsChance, usable: hearts && isAffordable('hearts') },
        { resource: other, chance: OTHER_RESOURCE_CHANCE, usable: currencies.includes(other) && isAffordable(other) },
        { resource: main, chance: 1 - heartsChance - OTHER_RESOURCE_CHANCE, usable: true },
    ]
}

/**
 * The resource an effect pays, rolled with the same lean as a plain gain: hearts first (more often on Tide), then the card's other
 * resource, otherwise its main one. One draw whatever the limits are. A resource the limits switch off, or the budget cannot pay for,
 * shares its chance over the others. The result is stored in `fxParams.currency`.
 */
export function rollPayoutCurrency(
    rng: Rng,
    card: Card,
    context: EffectRollContext,
    isAffordable: (resource: GeneratorResource) => boolean,
): GeneratorResource {
    const heartsChance = card.type === 'tide' ? HEARTS_CHANCE_FIRST_TIDE : HEARTS_CHANCE_FIRST
    const currency = pickPayoutResource(nextFloat(rng), payoutOptions(heartsChance, card.main, context, isAffordable))
    card.fxParams = { ...card.fxParams, currency }
    return currency
}

import { HEARTS_CHANCE_FIRST, HEARTS_CHANCE_FIRST_TIDE, OTHER_RESOURCE_CHANCE } from '../generator/budget'
import { nextFloat } from '../rng'
import type { Rng } from '../rng'
import type { Card, GeneratorResource } from '../types'
import type { EffectRollContext } from './types'

/**
 * The resource an effect pays, rolled with the same lean as a plain gain: hearts first (more often on Tide), then the card's other
 * resource, otherwise its main one. One draw whatever the limits are. A resource the limits switch off, or the budget cannot pay for,
 * falls back to the main one. The result is stored in `fxParams.currency`.
 */
export function rollPayoutCurrency(
    rng: Rng,
    card: Card,
    { currencies, hearts }: EffectRollContext,
    isAffordable: (resource: GeneratorResource) => boolean,
): GeneratorResource {
    const other = card.main === 'gold' ? 'power' : 'gold'
    const heartsChance = card.type === 'tide' ? HEARTS_CHANCE_FIRST_TIDE : HEARTS_CHANCE_FIRST
    const q = nextFloat(rng)
    const wanted: GeneratorResource = q < heartsChance ? 'hearts' : q < heartsChance + OTHER_RESOURCE_CHANCE ? other : card.main
    const allowed = wanted === 'hearts' ? hearts : wanted === other ? currencies.includes(other) : true
    const currency = allowed && isAffordable(wanted) ? wanted : card.main
    card.fxParams = { ...card.fxParams, currency }
    return currency
}

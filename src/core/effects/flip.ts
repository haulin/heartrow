import { RESOURCE_PRICE, RETAIN_SOMETIMES, TIER_TERMS } from '../generator/budget'
import { chance } from '../rng'
import type { GeneratorResource } from '../types'
import { rollPayoutCurrency } from './payout'
import { rollTier, scaleTerms, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { ALL_RESOURCES, resourceSlot, slot } from './wording'

const TERMS = TIER_TERMS.flip
/** The tier of a Flip card that rolled none. */
export const DEFAULT_FLIP_TIER = 2

/** A Flip of tier `t` pays `t` or `2t + 1`: 1 or 3, 2 or 5, 3 or 7. */
export const flipLow = (tier: number): number => tier
export const flipHigh = (tier: number): number => 2 * tier + 1

const termsFor = (resource: GeneratorResource) => scaleTerms(TERMS, RESOURCE_PRICE[resource])

export const flip: EffectDef = {
    id: 'flip',
    blurb: 'Pays a low or a high amount, decided by a coin toss when the card is played. Undo gives the same result again.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    paramNames: { amount: 'Tier' },
    family: 'resource',
    describe: (card) => {
        const tier = (c: NonNullable<typeof card>) => c.fxParams?.amount ?? DEFAULT_FLIP_TIER
        const amounts = `${slot(card, (c) => flipLow(tier(c)), '1-3')} or +${slot(card, (c) => flipHigh(tier(c)), '3-7')}`
        return `+${amounts} ${resourceSlot(card, card?.main ?? 'gold', ALL_RESOURCES)}`
    },
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(rng, card, budget, context) {
        const resource = rollPayoutCurrency(rng, card, context, (r) => tierPrice(termsFor(r), TERMS.tiers[0]) <= budget)
        const terms = termsFor(resource)
        const amount = rollTier(rng, budget, terms)
        card.fxParams = { ...card.fxParams, amount }
        return tierPrice(terms, amount)
    },
    apply({ state, card, events, gain }) {
        const tier = card.fxParams?.amount ?? DEFAULT_FLIP_TIER
        const amount = chance(state.streams.flip, 0.5) ? flipLow(tier) : flipHigh(tier)
        const currency = card.fxParams?.currency ?? card.main
        gain(currency, amount)
        events.push({ type: 'flipped', currency, amount, low: flipLow(tier) })
    },
}

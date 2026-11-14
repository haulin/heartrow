import { RESOURCE_PRICE, RETAIN_SOMETIMES, TIER_TERMS } from '../generator/budget'
import type { GeneratorResource } from '../types'
import { rollPayoutCurrency } from './payout'
import { rollTier, scaleTerms, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { ALL_RESOURCES, rangeOf, resourceSlot, slot, typeSlot } from './wording'

const TERMS = TIER_TERMS.bond

const termsFor = (resource: GeneratorResource) => scaleTerms(TERMS, RESOURCE_PRICE[resource])

export const bond: EffectDef = {
    id: 'bond',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'streak',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.bondCount ?? 1, rangeOf(TERMS.tiers))} ${resourceSlot(card, card?.main ?? 'gold', ALL_RESOURCES)} if you played ${typeSlot(card)} earlier this turn`,
    needsAny: ['moss', 'ember', 'tide'],
    enemies: false,
    lean: ['moss'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(rng, card, budget, context) {
        const resource = rollPayoutCurrency(rng, card, context, (r) => tierPrice(termsFor(r), TERMS.tiers[0]) <= budget)
        const terms = termsFor(resource)
        const bondCount = rollTier(rng, budget, terms)
        card.fxParams = { ...card.fxParams, bondCount }
        return tierPrice(terms, bondCount)
    },
    apply({ card, source, hadType, gain }) {
        if (source === 'play' && hadType) gain(card.fxParams?.currency ?? card.main, card.fxParams?.bondCount ?? 1)
    },
}

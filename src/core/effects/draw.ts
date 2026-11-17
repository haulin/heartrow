import { drawCards } from '../state'
import { RETAIN_RARELY, TIER_TERMS } from '../generator/budget'
import { rollTier, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = TIER_TERMS.draw

export const draw: EffectDef = {
    id: 'draw',
    blurb: 'Draw cards from your deck at once. When the deck runs out, the discard pile is shuffled into a new deck.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'cards',
    unconditional: true,
    describe: (card) => `Draw ${slot(card, (c) => c.fxParams?.drawCount ?? 1, rangeOf(TERMS.tiers))}`,
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_RARELY,
    roll(rng, card, budget) {
        const drawCount = rollTier(rng, budget, TERMS)
        card.fxParams = { ...card.fxParams, drawCount }
        return tierPrice(TERMS, drawCount)
    },
    apply({ state, card, events }) {
        drawCards(state, card.fxParams?.drawCount ?? 1, events, 'effect')
    },
}

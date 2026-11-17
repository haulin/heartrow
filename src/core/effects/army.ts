import { ownedCards } from '../state'
import { RESOURCE_PRICE, RETAIN_RARELY } from '../generator/budget'
import { rollPayoutCurrency } from './payout'
import type { EffectDef } from './types'
import { ALL_RESOURCES, resourceSlot, typeSlot } from './wording'

export const army: EffectDef = {
    id: 'army',
    blurb: 'Pays for every few cards of its own type in your deck, so it grows as you collect that type.',
    price: 1.5,
    family: 'count',
    describe: (card) => `+1 ${resourceSlot(card, card?.main ?? 'gold', ALL_RESOURCES)} per 4 ${typeSlot(card)} cards in your deck`,
    needsAny: ['moss', 'ember', 'tide'],
    enemies: false,
    lean: ['moss', 'tide'],
    pays: 'rolled',
    retain: RETAIN_RARELY,
    roll(rng, card, budget, context) {
        const resource = rollPayoutCurrency(rng, card, context, (r) => army.price * RESOURCE_PRICE[r] <= budget)
        return army.price * RESOURCE_PRICE[resource]
    },
    apply({ state, card, gain }) {
        gain(card.fxParams?.currency ?? card.main, Math.floor(ownedCards(state).filter((other) => other.type === card.type).length / 4))
    },
}

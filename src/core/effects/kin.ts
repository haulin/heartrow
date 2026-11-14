import { RESOURCE_PRICE, RETAIN_SOMETIMES } from '../generator/budget'
import { rollPayoutCurrency } from './payout'
import type { EffectDef } from './types'
import { ALL_RESOURCES, resourceSlot, typeSlot } from './wording'

export const kin: EffectDef = {
    id: 'kin',
    price: 1.5,
    family: 'streak',
    describe: (card) => `+1 ${resourceSlot(card, card?.main ?? 'gold', ALL_RESOURCES)} per other ${typeSlot(card)} card played this turn`,
    needsAny: ['moss', 'ember', 'tide'],
    enemies: false,
    lean: ['moss', 'ember'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(rng, card, budget, context) {
        const resource = rollPayoutCurrency(rng, card, context, (r) => kin.price * RESOURCE_PRICE[r] <= budget)
        return kin.price * RESOURCE_PRICE[resource]
    },
    apply({ state, card, gain }) {
        const currency = card.fxParams?.currency ?? card.main
        gain(currency, state.hand.filter((other) => other.played && other !== card && other.type === card.type).length)
    },
}

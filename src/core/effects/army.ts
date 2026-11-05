import { ownedCards } from '../state'
import type { Currency } from '../types'
import { rollKinCurrency } from './kin'
import type { EffectDef } from './types'

export const army: EffectDef = {
    id: 'army',
    price: 1.5,
    text: '+1 {k} per 4 {T} cards in your deck',
    enemies: false,
    lean: ['moss', 'ember', 'tide'],
    retainable: true,
    roll(rng, card, _budget, context) {
        rollKinCurrency(rng, card, context, false)
        return army.price
    },
    apply({ state, card }) {
        const currency: Currency = card.fxParams?.currency === 'hearts' ? card.main : (card.fxParams?.currency ?? card.main)
        state[currency] += Math.floor(ownedCards(state).filter((other) => other.type === card.type).length / 4)
    },
}

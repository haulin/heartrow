import { ownedCards } from '../state'
import type { Currency } from '../types'
import { rollKinCurrency } from './kin'
import { RETAIN_RARELY } from '../generator/budget'
import type { EffectDef } from './types'
import { resourceSlot, typeSlot } from './wording'

export const army: EffectDef = {
    id: 'army',
    price: 1.5,
    family: 'count',
    describe: (card) => `+1 ${resourceSlot(card, card?.main ?? 'gold')} per 4 ${typeSlot(card)} cards in your deck`,
    needsAny: ['moss', 'ember', 'tide'],
    enemies: false,
    lean: ['moss', 'ember', 'tide'],
    pays: 'rolled',
    retain: RETAIN_RARELY,
    roll(rng, card, _budget, context) {
        rollKinCurrency(rng, card, context, false)
        return army.price
    },
    apply({ state, card, gain }) {
        const currency: Currency = card.fxParams?.currency === 'hearts' ? card.main : (card.fxParams?.currency ?? card.main)
        gain(currency, Math.floor(ownedCards(state).filter((other) => other.type === card.type).length / 4))
    },
}

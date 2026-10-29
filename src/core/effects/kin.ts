import { chance } from '../rng'
import type { Rng } from '../rng'
import type { Card, Currency } from '../types'
import type { EffectDef } from './types'

export function rollKinCurrency(rng: Rng, card: Card): void {
    card.kinCurrency = chance(rng, 0.5) ? card.main : card.main === 'gold' ? 'power' : 'gold'
}

export const kin: EffectDef = {
    id: 'kin',
    price: 1.5,
    text: '+1 {k} per other {T} card played this turn',
    enemies: false,
    lean: ['moss', 'ember'],
    retainable: true,
    roll(rng, card) {
        rollKinCurrency(rng, card)
        return kin.price
    },
    apply({ state, card }) {
        const currency: Currency = card.kinCurrency ?? card.main
        state[currency] += state.hand.filter((other) => other.played && other !== card && other.type === card.type).length
    },
}

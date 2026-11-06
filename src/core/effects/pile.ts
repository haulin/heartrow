import { gainPerCards, rollMainCurrency, rolledCurrency } from './countGain'
import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const pile: EffectDef = {
    id: 'pile',
    price: 1.5,
    text: '+1 ⚔ per 3 cards in your discard',
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['ember'],
    pays: 'rolled',
    retain: RETAIN_OFTEN,
    roll(_rng, card) {
        rollMainCurrency(card)
        return pile.price
    },
    apply(ctx) {
        gainPerCards(ctx, rolledCurrency(ctx.card, 'power'), ctx.state.discard.length, 3)
    },
}

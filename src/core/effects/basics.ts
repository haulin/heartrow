import { RETAIN_SOMETIMES } from '../generator/budget'
import { ownedCards } from '../state'
import { gainPerCards, rollMainCurrency, rolledCurrency } from './countGain'
import type { EffectDef } from './types'
import { resourceSlot } from './wording'

export const basics: EffectDef = {
    id: 'basics',
    price: 1.5,
    family: 'count',
    describe: (card) => `+1 ${resourceSlot(card, 'gold')} per 4 basic cards in your deck`,
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(_rng, card) {
        rollMainCurrency(card)
        return basics.price
    },
    apply(ctx) {
        const basicCards = ownedCards(ctx.state).filter((card) => card.kind === 'basic').length
        gainPerCards(ctx, rolledCurrency(ctx.card, 'gold'), basicCards, 4)
    },
}

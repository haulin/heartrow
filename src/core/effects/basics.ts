import { ownedCards } from '../state'
import type { EffectDef } from './types'

export const basics: EffectDef = {
    id: 'basics',
    price: 1.5,
    text: '+1 ● per 4 basic cards in your deck',
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    roll(_rng, card) {
        card.fxParams = { ...card.fxParams, currency: card.main }
        return basics.price
    },
    apply({ state, card, gain }) {
        const currency = card.fxParams?.currency === 'power' ? 'power' : 'gold'
        gain(currency, Math.floor(ownedCards(state).filter((card) => card.kind === 'basic').length / 4))
    },
}

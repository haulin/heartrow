import type { EffectDef } from './types'

export const pile: EffectDef = {
    id: 'pile',
    price: 1.5,
    text: '+1 ⚔ per 3 cards in your discard',
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['ember'],
    retainable: true,
    roll(_rng, card) {
        card.fxParams = { ...card.fxParams, currency: card.main }
        return pile.price
    },
    apply({ state, card, gain }) {
        const currency = card.fxParams?.currency === 'gold' ? 'gold' : 'power'
        gain(currency, Math.floor(state.discard.length / 3))
    },
}

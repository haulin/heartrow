import { chance } from '../rng'
import type { EffectDef } from './types'

export const coin: EffectDef = {
    id: 'coin',
    price: 2.5,
    text: 'Flip: +2 or +4 ●',
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    roll(_rng, card) {
        card.fxParams = { ...card.fxParams, currency: card.main }
        return coin.price
    },
    apply({ state, card, events }) {
        const amount = chance(state.streams.flip, 0.5) ? 2 : 4
        const currency = card.fxParams?.currency === 'power' ? 'power' : 'gold'
        state[currency] += amount
        events.push({ type: 'coinFlipped', currency, amount })
    },
}

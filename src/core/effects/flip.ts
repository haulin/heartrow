import { RETAIN_SOMETIMES } from '../generator/budget'
import { chance } from '../rng'
import type { EffectDef } from './types'

export const flip: EffectDef = {
    id: 'flip',
    price: 2.5,
    text: '+2 or +4 ●',
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(_rng, card) {
        card.fxParams = { ...card.fxParams, currency: card.main }
        return flip.price
    },
    apply({ state, card, events, gain }) {
        const amount = chance(state.streams.flip, 0.5) ? 2 : 4
        const currency = card.fxParams?.currency === 'power' ? 'power' : 'gold'
        gain(currency, amount)
        events.push({ type: 'flipped', currency, amount })
    },
}

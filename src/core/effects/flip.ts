import { RETAIN_SOMETIMES } from '../generator/budget'
import { chance } from '../rng'
import type { EffectDef } from './types'
import { resourceSlot } from './wording'

export const FLIP_LOW = 2
export const FLIP_HIGH = 4

export const flip: EffectDef = {
    id: 'flip',
    price: 2.5,
    family: 'resource',
    describe: (card) => `+${FLIP_LOW} or +${FLIP_HIGH} ${resourceSlot(card, 'gold')}`,
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
        const amount = chance(state.streams.flip, 0.5) ? FLIP_LOW : FLIP_HIGH
        const currency = card.fxParams?.currency === 'power' ? 'power' : 'gold'
        gain(currency, amount)
        events.push({ type: 'flipped', currency, amount })
    },
}

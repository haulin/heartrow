import { SHIFT_MAX, SHIFT_PRICE_PER_CARD, RETAIN_OFTEN } from '../generator/budget'
import { makeRiverCard } from '../generator/make'
import { nextInt } from '../rng'
import { cloneCard, dropEdge } from '../state'
import type { EffectDef } from './types'
import { slot } from './wording'

export const shift: EffectDef = {
    id: 'shift',
    family: 'river',
    price: SHIFT_PRICE_PER_CARD,
    describe: (card) => `Shift the river by ${slot(card, (c) => c.fxParams?.shiftCount ?? 1, `1-${SHIFT_MAX}`)}`,
    enemies: true,
    lean: [],
    retain: RETAIN_OFTEN,
    roll(rng, card, budget) {
        const most = Math.min(SHIFT_MAX, Math.floor(budget / SHIFT_PRICE_PER_CARD))
        const shiftCount = 1 + nextInt(rng, most)
        card.fxParams = { ...card.fxParams, shiftCount }
        return SHIFT_PRICE_PER_CARD * shiftCount
    },
    apply({ state, card, events }) {
        for (let i = 0; i < (card.fxParams?.shiftCount ?? 1); i++) {
            dropEdge(state, events)
            const fresh = makeRiverCard(state, state.turn)
            state.row.unshift(fresh)
            events.push({ type: 'rowRefilled', card: cloneCard(fresh) })
        }
    },
}

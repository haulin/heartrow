import { nextInt } from '../rng'
import { drawCards } from '../state'
import { DRAW_MAX, DRAW_PRICE_PER_CARD } from '../generator/budget'
import type { EffectDef } from './types'

export const draw: EffectDef = {
    id: 'draw',
    price: DRAW_PRICE_PER_CARD,
    perDrawCard: true,
    text: 'Draw {n}',
    enemies: true,
    lean: ['tide'],
    roll(rng, card, budget) {
        const max = Math.min(DRAW_MAX, Math.floor(budget / DRAW_PRICE_PER_CARD))
        card.drawCount = 1 + nextInt(rng, max)
        return DRAW_PRICE_PER_CARD * card.drawCount
    },
    apply({ state, card, events }) {
        drawCards(state, card.drawCount ?? 1, events, 'effect')
    },
}

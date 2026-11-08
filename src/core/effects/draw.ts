import { nextInt } from '../rng'
import { drawCards } from '../state'
import { DRAW_MAX, DRAW_PRICE_PER_CARD, RETAIN_RARELY } from '../generator/budget'
import type { EffectDef } from './types'
import { slot } from './wording'

export const draw: EffectDef = {
    id: 'draw',
    price: DRAW_PRICE_PER_CARD,
    perDrawCard: true,
    family: 'cards',
    describe: (card) => `Draw ${slot(card, (c) => c.fxParams?.drawCount ?? 1, `1-${DRAW_MAX}`)}`,
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_RARELY,
    roll(rng, card, budget) {
        const max = Math.min(DRAW_MAX, Math.floor(budget / DRAW_PRICE_PER_CARD))
        const drawCount = 1 + nextInt(rng, max)
        card.fxParams = { ...card.fxParams, drawCount }
        return DRAW_PRICE_PER_CARD * drawCount
    },
    apply({ state, card, events }) {
        drawCards(state, card.fxParams?.drawCount ?? 1, events, 'effect')
    },
}

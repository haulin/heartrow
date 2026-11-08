import { RELOAD_MAX, RELOAD_PRICE, RETAIN_SOMETIMES } from '../generator/budget'
import { drawCards } from '../state'
import type { EffectDef } from './types'

export const reload: EffectDef = {
    id: 'reload',
    family: 'cards',
    price: RELOAD_PRICE,
    describe: () => `Draw 1 per enemy defeated this turn, up to ${RELOAD_MAX}`,
    enemies: true,
    needs: ['foe'],
    lean: ['ember'],
    retain: RETAIN_SOMETIMES,
    apply({ state, events }) {
        drawCards(state, Math.min(RELOAD_MAX, state.defeatedThisTurn), events, 'effect')
    },
}

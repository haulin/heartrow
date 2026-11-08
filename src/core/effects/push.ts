import { PUSH_PRICE, RETAIN_USUALLY } from '../generator/budget'
import { cloneCard } from '../state'
import type { EffectDef } from './types'

/** Situational: it only helps when the right-most enemy is the one to hide, so a recruit that has it is kept more often than any other. */
export const push: EffectDef = {
    id: 'push',
    family: 'river',
    price: PUSH_PRICE,
    describe: () => 'Move the right-most enemy to the left end of the river',
    enemies: true,
    needs: ['foe'],
    lean: ['ember'],
    retain: RETAIN_USUALLY,
    apply({ state, events }) {
        let from = -1
        state.row.forEach((card, index) => {
            if (card.kind === 'enemy') from = index
        })
        if (from <= 0) return
        const [moved] = state.row.splice(from, 1)
        state.row.unshift(moved!)
        events.push({ type: 'pushed', card: cloneCard(moved!) })
    },
}

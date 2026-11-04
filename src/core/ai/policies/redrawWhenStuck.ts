import type { Policy } from '../types'
import { hasReasonableResources, redrawMemory, STRONG_WEIGHT } from './util'
import type { RedrawMemory } from './util'

/** Redraws when nothing in the row is affordable and a resource exceeds the current average card cost. */
export function redrawWhenStuck(memory: RedrawMemory = redrawMemory()): Policy {
    return {
        id: 'redrawWhenStuck',
        weight(state, move, moves) {
            const { redrawn, stuck } = memory(state)
            if (move.type === 'take') return stuck && !redrawn ? 0 : 1
            if (move.type !== 'redraw') return 1
            if (moves.some((m) => m.type === 'take')) return 1
            return hasReasonableResources(state) ? STRONG_WEIGHT : 0
        },
    }
}

import type { Policy } from '../types'
import { END_TURN_WEIGHT, hasReasonableResources, IDLE_REDRAW_WEIGHT } from './util'

const LOW_RESOURCE_END_TURN_WEIGHT = 1.5

/** Ends the turn as a last resort, but prefers it over a redraw when no card is affordable and resources are below the current cost curve. */
export function endTurnWhenDone(): Policy {
    return {
        id: 'endTurnWhenDone',
        weight(state, move, moves) {
            if (move.type === 'redraw') return IDLE_REDRAW_WEIGHT
            if (move.type !== 'endTurn') return 1
            if (!moves.some((m) => m.type !== 'endTurn')) return 1
            return moves.some((m) => m.type === 'take') || hasReasonableResources(state) ? END_TURN_WEIGHT : LOW_RESOURCE_END_TURN_WEIGHT
        },
    }
}

import type { Policy } from '../types'
import { END_TURN_WEIGHT, hasReasonableResources, wantsToBuy } from './util'

const LOW_RESOURCE_END_TURN_WEIGHT = 1.5

/** Ends the turn as a last resort, but prefers it when nothing in the row is worth buying and resources are below the current cost curve. */
export function endTurnWhenDone(buyers: readonly Policy[] = []): Policy {
    return {
        id: 'endTurnWhenDone',
        weight(state, move, moves) {
            if (move.type !== 'endTurn') return 1
            if (!moves.some((m) => m.type !== 'endTurn')) return 1
            return wantsToBuy(state, moves, buyers) || hasReasonableResources(state) ? END_TURN_WEIGHT : LOW_RESOURCE_END_TURN_WEIGHT
        },
    }
}

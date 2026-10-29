import type { Policy } from '../types'
import { END_TURN_WEIGHT, IDLE_REDRAW_WEIGHT } from './util'

/** Ending the turn is a last resort while any other move is legal, and a pointless redraw ranks below even that. This guarantees every turn ends. */
export function endTurnWhenDone(): Policy {
  return {
    id: 'endTurnWhenDone',
    weight(_state, move, moves) {
      if (move.type === 'redraw') return IDLE_REDRAW_WEIGHT
      if (move.type !== 'endTurn') return 1
      return moves.some((m) => m.type !== 'endTurn') ? END_TURN_WEIGHT : 1
    },
  }
}

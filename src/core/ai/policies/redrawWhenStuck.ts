import type { Policy } from '../types'
import { IDLE_REDRAW_WEIGHT, redrawMemory } from './util'
import type { RedrawMemory } from './util'

/** Redraws when nothing in the row is affordable, then ends the turn: the new row only helps from the next turn on. */
export function redrawWhenStuck(memory: RedrawMemory = redrawMemory()): Policy {
  const boost = 1e-6 / IDLE_REDRAW_WEIGHT
  return {
    id: 'redrawWhenStuck',
    weight(state, move, moves) {
      const { stuck } = memory(state)
      if (move.type === 'take') return stuck ? 0 : 1
      if (move.type !== 'redraw') return 1
      return state.turn < state.maxTurns - 2 && !moves.some((m) => m.type === 'take') ? boost : 1
    },
  }
}

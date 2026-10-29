import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { smartScore } from './smartBuy'
import { IDLE_REDRAW_WEIGHT, redrawMemory } from './util'
import type { RedrawMemory } from './util'

/** Redraws once per turn when the best affordable card is clearly worse than the best card in the row, or nothing is affordable. */
export function smartRedraw(memory: RedrawMemory = redrawMemory()): Policy {
  const boost = 1e4 / IDLE_REDRAW_WEIGHT
  const wanted = (state: GameState): boolean => {
    if (state.turn >= state.maxTurns - 2) return false
    let bestAny = -Infinity
    let bestCan = -Infinity
    state.row.forEach((card, i) => {
      const score = smartScore(state, card, i)
      bestAny = Math.max(bestAny, score)
      if (canAfford(state, card)) bestCan = Math.max(bestCan, score)
    })
    return bestCan === -Infinity || bestAny - bestCan >= 12
  }
  return {
    id: 'smartRedraw',
    weight(state, move) {
      const { redrawn } = memory(state)
      return move.type === 'redraw' && !redrawn && wanted(state) ? boost : 1
    },
  }
}

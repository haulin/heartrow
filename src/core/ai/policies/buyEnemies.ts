import type { Policy } from '../types'
import { rowCard } from './util'

export function buyEnemies(): Policy {
  return {
    id: 'buyEnemies',
    weight(state, move) {
      const card = rowCard(state, move)
      if (card?.kind !== 'enemy') return 1
      return 100 + card.hearts * 10 + (move.type === 'take' && move.rowIndex === state.row.length - 1 ? 50 : 0)
    },
  }
}

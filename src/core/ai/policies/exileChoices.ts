import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { handCard } from './util'

function tier(state: GameState, card: Card, pacifist: boolean): number {
  if (pacifist && card.power) {
    if (!card.hearts && !card.gold && !card.fx.length) return 1e8
    if (!card.hearts) return 1e6
    return 1e4
  }
  if (card.kind === 'basic' && card.gold) {
    if (card.played) return 100
    if (state.turn > 3) return 10
  }
  return 0
}

/** Picks which hand card to exile: played gold Basics first, any gold Basic after turn 3. The pacifist prefers power cards. Skips when nothing qualifies. */
export function exileChoices(options: { pacifist?: boolean } = {}): Policy {
  const pacifist = options.pacifist === true
  return {
    id: 'exileChoices',
    weight(state, move) {
      if (move.type === 'skipExile') return 1
      const card = move.type === 'exile' ? handCard(state, move) : undefined
      return card ? tier(state, card, pacifist) : 1
    },
  }
}

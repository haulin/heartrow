import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { exileCard, LIGHT_WEIGHT, STRONG_WEIGHT } from './util'

function tier(state: GameState, card: Card, pacifist: boolean): number {
    if (pacifist && card.power) {
        if (!card.hearts && !card.gold && !card.fx.length) return STRONG_WEIGHT
        if (!card.hearts) return LIGHT_WEIGHT
        return 1
    }
    if (card.kind === 'basic' && card.gold) {
        if (card.played) return STRONG_WEIGHT
        if (state.turn > 3) return LIGHT_WEIGHT
    }
    return 0
}

/** Picks which hand card to exile: played gold Basics first, any gold Basic after turn 3. The pacifist prefers power cards. */
export function exileChoices(options: { pacifist?: boolean } = {}): Policy {
    const pacifist = options.pacifist === true
    return {
        id: 'exileChoices',
        weight(state, move) {
            if (move.type === 'skipExile') return 1
            const card = exileCard(state, move)
            return card ? tier(state, card, pacifist) : 1
        },
    }
}

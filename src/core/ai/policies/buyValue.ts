import { cardCost } from '../../state'
import type { Policy } from '../types'
import { rowCard, scoreWeight, turnsLeft } from './util'

/** Recruits weigh more when they cost more, and none are bought in the last two turns because they would not come back around. */
export function buyValue(): Policy {
    return {
        id: 'buyValue',
        weight(state, move) {
            const card = rowCard(state, move)
            if (card?.kind !== 'recruit') return 1
            return turnsLeft(state) < 3 ? 0 : scoreWeight(cardCost(state, card) + card.hearts * 2, 2)
        },
    }
}

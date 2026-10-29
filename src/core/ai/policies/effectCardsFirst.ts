import type { Policy } from '../types'
import { handCard } from './util'

/** Effect cards first, plain cards next, cycle cards last because they discard the hand. */
export function effectCardsFirst(): Policy {
    return {
        id: 'effectCardsFirst',
        weight(state, move) {
            const card = move.type === 'play' ? handCard(state, move) : undefined
            if (!card) return 1
            if (card.fx.includes('cycle')) return 1
            return card.fx.length > 0 ? 100 : 10
        },
    }
}

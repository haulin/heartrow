import type { Policy } from '../types'
import { handCard } from './util'

/**
 * Plays draw cards early, to see more of the deck. The exception: a Pile card in hand counts the discard, and a draw that has to reshuffle
 * empties it. Then the Pile card goes first and the draw waits.
 */
export function drawFirst(): Policy {
    return {
        id: 'drawFirst',
        weight(state, move) {
            const card = handCard(state, move)
            if (move.type !== 'play' || !card) return 1
            const pileInHand = state.hand.some((c) => c.fx.includes('pile'))
            if (card.fx.includes('draw')) {
                const reshuffles = (card.drawCount ?? 1) > state.deck.length
                return pileInHand && reshuffles ? 1 : 1e6
            }
            if (card.fx.includes('pile') && state.hand.some((c) => c.fx.includes('draw') && (c.drawCount ?? 1) > state.deck.length))
                return 1e6
            return 1
        },
    }
}

import { cardCost } from '../../state'
import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { rowCard, scoreWeight } from './util'

export function smartScore(state: GameState, card: Card, index: number): number {
    if (card.kind === 'enemy') return 100 + card.hearts * 12 + (index === state.row.length - 1 ? 40 : 0) - card.cost * 0.5
    return 20 + (card.gold + card.power) * 2 + card.hearts * 10 + card.fx.length * 8 - cardCost(state, card)
}

export function smartBuy(): Policy {
    return {
        id: 'smartBuy',
        weight(state, move) {
            const card = rowCard(state, move)
            return card && move.type === 'take' ? scoreWeight(smartScore(state, card, move.rowIndex), 20) : 1
        },
    }
}

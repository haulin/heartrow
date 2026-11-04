import type { Policy } from '../types'
import { rowCard } from './util'

const EFFECT_BONUS = 1

export function buyEnemies(): Policy {
    return {
        id: 'buyEnemies',
        weight(state, move) {
            const card = rowCard(state, move)
            if (card?.kind !== 'enemy') return 1
            return (
                4 +
                Math.min(4, card.hearts) +
                (card.fx.length > 0 ? EFFECT_BONUS : 0) +
                (move.type === 'take' && move.rowIndex === state.row.length - 1 ? 2 : 0)
            )
        },
    }
}

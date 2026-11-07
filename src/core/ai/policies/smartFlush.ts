import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { smartScore } from './smartBuy'
import { IDLE_FLUSH_WEIGHT, flushMemory, STRONG_WEIGHT } from './util'
import type { FlushMemory } from './util'

/** Flushes once per turn when the best affordable card is clearly worse than the best card in the row, or nothing is affordable. */
export function smartFlush(memory: FlushMemory = flushMemory()): Policy {
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
        id: 'smartFlush',
        weight(state, move) {
            const { flushed } = memory(state)
            if (move.type !== 'flush') return 1
            return !flushed && wanted(state) ? STRONG_WEIGHT * IDLE_FLUSH_WEIGHT : 0
        },
    }
}

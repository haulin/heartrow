import { canAfford, cardCost } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { STRONG_WEIGHT, wantsToBuy } from './util'
import type { FlushMemory } from './util'

/**
 * Defeating the edge enemy moves its left neighbour to the edge. When that neighbour is an enemy the leftover Power cannot pay for, it escapes next.
 * Flush rerolls the four left cards and keeps the edge, so flushing first gives the neighbour a chance to change.
 * It only applies when the edge enemy is the one purchase worth making: the buying policies must want nothing else in the row.
 */
export function edgeFollowUp(memory: FlushMemory, buyers: readonly Policy[]): Policy {
    return {
        id: 'edgeFollowUp',
        weight(state, move, moves) {
            const { flushed } = memory(state)
            if (flushed || !moves.some((m) => m.type === 'flush') || !neighbourWouldEscape(state)) return 1
            const edgeIndex = state.row.length - 1
            const others = moves.filter((m) => !(m.type === 'take' && m.rowIndex === edgeIndex))
            if (wantsToBuy(state, others, buyers)) return 1
            if (move.type === 'flush') return STRONG_WEIGHT
            return move.type === 'take' && move.rowIndex === edgeIndex ? 0 : 1
        },
    }
}

function neighbourWouldEscape(state: GameState): boolean {
    const edge = state.row[state.row.length - 1]
    const neighbour = state.row[state.row.length - 2]
    if (edge?.kind !== 'enemy' || neighbour?.kind !== 'enemy' || !canAfford(state, edge)) return false
    return state.power - cardCost(state, edge) < cardCost(state, neighbour)
}

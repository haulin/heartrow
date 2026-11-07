import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { flushMemory, STRONG_WEIGHT } from './util'
import type { FlushMemory } from './util'

/** Flushes once per turn when the right-edge enemy is affordable and other enemies sit in the row: the edge card is kept, the rest are rerolled. */
export function protectEdge(memory: FlushMemory = flushMemory()): Policy {
    const wanted = (state: GameState): boolean => {
        const edge = state.row[state.row.length - 1]
        return !!edge && edge.kind === 'enemy' && canAfford(state, edge) && state.row.slice(0, -1).some((c) => c.kind === 'enemy')
    }
    return {
        id: 'protectEdge',
        weight(state, move) {
            const { flushed } = memory(state)
            return move.type === 'flush' && !flushed && wanted(state) ? STRONG_WEIGHT : 1
        },
    }
}

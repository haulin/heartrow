import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { redrawMemory, STRONG_WEIGHT } from './util'
import type { RedrawMemory } from './util'

/** Redraws once per turn when the right-edge enemy is affordable and other enemies sit in the row: the edge card is kept, the rest are rerolled. */
export function protectEdge(memory: RedrawMemory = redrawMemory()): Policy {
    const wanted = (state: GameState): boolean => {
        const edge = state.row[state.row.length - 1]
        return !!edge && edge.kind === 'enemy' && canAfford(state, edge) && state.row.slice(0, -1).some((c) => c.kind === 'enemy')
    }
    return {
        id: 'protectEdge',
        weight(state, move) {
            const { redrawn } = memory(state)
            return move.type === 'redraw' && !redrawn && wanted(state) ? STRONG_WEIGHT : 1
        },
    }
}

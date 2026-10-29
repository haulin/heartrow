import type { Policy } from '../types'
import { rowCard } from './util'

/** Build order: enemies are a last resort before `untilTurn`, so affordable recruits win. */
export function buyBuild(untilTurn = 9): Policy {
    return {
        id: 'buyBuild',
        weight(state, move) {
            return rowCard(state, move)?.kind === 'enemy' && state.turn < untilTurn ? 0.01 : 1
        },
    }
}

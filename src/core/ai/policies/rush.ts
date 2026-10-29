import type { Policy } from '../types'
import { rowCard } from './util'

/** Stops buying recruits after `untilTurn` and just fights. */
export function rush(untilTurn = 3): Policy {
    return { id: 'rush', weight: (state, move) => (rowCard(state, move)?.kind === 'recruit' && state.turn > untilTurn ? 0 : 1) }
}

import type { Policy } from '../types'
import { rowCard } from './util'

export function noRecruits(): Policy {
    return { id: 'noRecruits', weight: (state, move) => (rowCard(state, move)?.kind === 'recruit' ? 0 : 1) }
}

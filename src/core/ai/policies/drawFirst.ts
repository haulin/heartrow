import type { Policy } from '../types'
import { handCard } from './util'

export function drawFirst(): Policy {
    return {
        id: 'drawFirst',
        weight(state, move) {
            return move.type === 'play' && handCard(state, move)?.fx.includes('draw') ? 1e6 : 1
        },
    }
}

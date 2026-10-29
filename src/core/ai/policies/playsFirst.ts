import type { Policy } from '../types'
import { PLAY_LAYER } from './util'

export function playsFirst(): Policy {
    return { id: 'playsFirst', weight: (_state, move) => (move.type === 'play' ? PLAY_LAYER : 1) }
}

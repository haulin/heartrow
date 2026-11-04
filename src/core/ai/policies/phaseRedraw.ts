import { canAfford } from '../../state'
import type { Policy } from '../types'
import { STRONG_WEIGHT } from './util'
import { DEFAULT_PHASE_THRESHOLDS } from './phaseBuy'
import type { PhaseThresholds } from './phaseBuy'

/** In the late game, redraws to spend substantial leftover Power when no enemy or direct-Heart recruit is available. */
export function phaseRedraw({ lateStart }: Pick<PhaseThresholds, 'lateStart'> = DEFAULT_PHASE_THRESHOLDS): Policy {
    return {
        id: 'phaseRedraw',
        weight(state, move) {
            if (move.type !== 'redraw' || state.turn < lateStart) return 1
            const enemyAvailable = state.row.some((card) => card.kind === 'enemy' && canAfford(state, card))
            const heartRecruitAvailable = state.row.some((card) => card.kind === 'recruit' && card.hearts > 0 && canAfford(state, card))
            return state.power > 3 && !enemyAvailable && !heartRecruitAvailable ? STRONG_WEIGHT : 1
        },
    }
}

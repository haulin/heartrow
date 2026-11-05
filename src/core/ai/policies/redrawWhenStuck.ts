import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { hasReasonableResources, IDLE_REDRAW_WEIGHT, redrawMemory, STRONG_WEIGHT, wantsToBuy } from './util'
import type { RedrawMemory } from './util'

export interface RedrawOptions {
    /** From this turn on, leftover Power is worth a redraw when no enemy or direct-Heart recruit is affordable. */
    lateStart?: number | undefined
    /** The bot's buying policies. A card they all veto does not count as something to buy. */
    buyers?: readonly Policy[]
}

const LATE_SPARE_POWER = 3

/** The single owner of redraw weights: how much a redraw is worth in this state. Takes and end turn are weighed elsewhere. */
export function redrawWhenStuck(memory: RedrawMemory = redrawMemory(), { lateStart, buyers = [] }: RedrawOptions = {}): Policy {
    return {
        id: 'redrawWhenStuck',
        weight(state, move, moves) {
            const { redrawn, stuck } = memory(state)
            if (move.type === 'take') return stuck && !redrawn ? 0 : 1
            if (move.type !== 'redraw') return 1
            const stuckFactor = wantsToBuy(state, moves, buyers) ? 1 : hasReasonableResources(state) ? STRONG_WEIGHT : 0
            return IDLE_REDRAW_WEIGHT * stuckFactor * lateFactor(state, lateStart)
        },
    }
}

function lateFactor(state: GameState, lateStart: number | undefined): number {
    if (lateStart === undefined || state.turn < lateStart) return 1
    const enemyAvailable = state.row.some((card) => card.kind === 'enemy' && canAfford(state, card))
    const heartRecruitAvailable = state.row.some((card) => card.kind === 'recruit' && card.hearts > 0 && canAfford(state, card))
    return state.power > LATE_SPARE_POWER && !enemyAvailable && !heartRecruitAvailable ? STRONG_WEIGHT : 1
}

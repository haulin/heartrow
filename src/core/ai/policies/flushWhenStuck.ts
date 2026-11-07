import { canAfford } from '../../state'
import type { GameState } from '../../types'
import type { Policy } from '../types'
import { hasReasonableResources, IDLE_FLUSH_WEIGHT, flushMemory, STRONG_WEIGHT, wantsToBuy } from './util'
import type { FlushMemory } from './util'

export interface FlushOptions {
    /** From this turn on, leftover Power is worth a flush when no enemy or direct-Heart recruit is affordable. */
    lateStart?: number | undefined
    /** The bot's buying policies. A card they all veto does not count as something to buy. */
    buyers?: readonly Policy[]
}

const LATE_SPARE_POWER = 3

/** The single owner of flush weights: how much a flush is worth in this state. Takes and end turn are weighed elsewhere. */
export function flushWhenStuck(memory: FlushMemory = flushMemory(), { lateStart, buyers = [] }: FlushOptions = {}): Policy {
    return {
        id: 'flushWhenStuck',
        weight(state, move, moves) {
            const { flushed, stuck } = memory(state)
            if (move.type === 'take') return stuck && !flushed ? 0 : 1
            if (move.type !== 'flush') return 1
            const stuckFactor = wantsToBuy(state, moves, buyers) ? 1 : hasReasonableResources(state) ? STRONG_WEIGHT : 0
            return IDLE_FLUSH_WEIGHT * stuckFactor * lateFactor(state, lateStart)
        },
    }
}

function lateFactor(state: GameState, lateStart: number | undefined): number {
    if (lateStart === undefined || state.turn < lateStart) return 1
    const enemyAvailable = state.row.some((card) => card.kind === 'enemy' && canAfford(state, card))
    const heartRecruitAvailable = state.row.some((card) => card.kind === 'recruit' && card.hearts > 0 && canAfford(state, card))
    return state.power > LATE_SPARE_POWER && !enemyAvailable && !heartRecruitAvailable ? STRONG_WEIGHT : 1
}

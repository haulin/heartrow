import { canAfford } from '../../state'
import type { Card, EffectId, GameState, Move } from '../../types'

export const HEART_FX: Partial<Record<EffectId, number>> = { all3: 10, vault: 8, reapG: 8, reapP: 8 }

/** Layer sizes that keep the phases of a turn in order: plays, then redraw decisions, then takes, then ending the turn. */
export const PLAY_LAYER = 1e12
export const END_TURN_WEIGHT = 1e-9
export const IDLE_REDRAW_WEIGHT = 1e-12

export function handCard(state: GameState, move: Move): Card | undefined {
  return move.type === 'play' || move.type === 'exile' ? state.hand[move.handIndex] : undefined
}

export function rowCard(state: GameState, move: Move): Card | undefined {
  return move.type === 'take' ? state.row[move.rowIndex] : undefined
}

export function turnsLeft(state: GameState): number {
  return state.maxTurns - state.turn
}

export interface RedrawMemory {
  (state: GameState): { redrawn: boolean; stuck: boolean }
}

/** Remembers whether the row was redrawn this turn, and whether that redraw happened with nothing affordable. Call it with every state a policy sees. */
export function redrawMemory(): RedrawMemory {
  let prev: GameState | null = null
  let redrawn = false
  let stuck = false
  return (state) => {
    if (state !== prev) {
      if (!prev || state.seed !== prev.seed || state.turn !== prev.turn) {
        redrawn = false
        stuck = false
      } else if (state.redraws < prev.redraws) {
        redrawn = true
        const before = prev
        if (!before.row.some((card) => canAfford(before, card))) stuck = true
      }
      prev = state
    }
    return { redrawn, stuck }
  }
}

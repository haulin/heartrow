import type { GameState, ModeConfig, Move, StepResult } from './types'

export function newGame(_mode: ModeConfig, _seed: number): StepResult {
  throw new Error('not implemented')
}

export function legalMoves(_state: GameState): Move[] {
  throw new Error('not implemented')
}

export function applyMove(_state: GameState, _move: Move): StepResult {
  throw new Error('not implemented')
}

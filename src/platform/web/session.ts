import { applyMove, newGame } from '../../core'
import type { GameEvent, GameState, ModeConfig, Move } from '../../core'
import { edgeEnemyHearts, formatEvents, historyLine } from '../../core/format'
import { INTRO_TEXT, longIntro, statusMessage } from './text'

export interface Snapshot {
  state: GameState
  history: string[]
  message: string
}

export interface Session {
  state: GameState
  history: string[]
  message: string
  undo: Snapshot | null
}

export interface StepOutcome {
  session: Session
  events: GameEvent[]
  rejected: boolean
}

export function startSession(config: ModeConfig, seed: number): Session {
  const { state } = newGame(config, seed)
  return { state, history: [], message: state.goal === null ? longIntro(state.maxTurns) : INTRO_TEXT, undo: null }
}

/**
 * Undo rules (v7, with one improvement):
 * - `play` and `exile` store a snapshot of the session before the move.
 * - The snapshot is dropped when the move's events include drew, coinFlipped or cycled, because in v7 those made the action non-undoable.
 * - `take`, `redraw` and `endTurn` always drop it.
 * - `skipExile` keeps the existing snapshot, so undo after "play exile card, skip" still reverts the play.
 * - RNG streams live in GameState, so a restored snapshot also restores the exact random future. v7 could not do that.
 */
function nextUndo(session: Session, move: Move, events: GameEvent[]): Snapshot | null {
  if (move.type === 'skipExile') return session.undo
  if (move.type !== 'play' && move.type !== 'exile') return null
  if (events.some((e) => e.type === 'drew' || e.type === 'coinFlipped' || e.type === 'cycled')) return null
  return { state: session.state, history: session.history, message: session.message }
}

export function stepSession(session: Session, move: Move): StepOutcome {
  const { state, events } = applyMove(session.state, move)
  const rejected = events.some((e) => e.type === 'rejected')
  const ctx = { turn: state.turn, edgeEnemyHearts: edgeEnemyHearts(state) }
  const lines = formatEvents(events, ctx)
  if (rejected) {
    return { session: { ...session, message: lines[0] ?? session.message }, events, rejected }
  }
  const history = [...session.history, ...lines.map((line) => historyLine(line, ctx))]
  const over = statusMessage(state)
  if (over !== null) history.push(historyLine(over, ctx))
  return {
    session: { state, history, message: lines.length > 0 ? lines[lines.length - 1]! : session.message, undo: nextUndo(session, move, events) },
    events,
    rejected,
  }
}

export function undoSession(session: Session): Session {
  const snap = session.undo
  if (!snap) return session
  return { state: snap.state, history: snap.history, message: snap.message, undo: null }
}

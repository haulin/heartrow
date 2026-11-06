import { applyMove, edgeEnemyHearts, formatEvents, historyLine, newGame } from '../../core'
import type { GameEvent, GameState, ModeConfig, Move } from '../../core'
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
    /** Snapshots from before each move this turn, oldest first. Cleared when the turn ends. */
    undo: Snapshot[]
}

export interface StepOutcome {
    session: Session
    events: GameEvent[]
    rejected: boolean
}

export function startSession(config: ModeConfig, seed: number): Session {
    const { state } = newGame(config, seed)
    return { state, history: [], message: state.goal === null ? longIntro(state.maxTurns) : INTRO_TEXT, undo: [] }
}

/**
 * Undo rules:
 * - Every accepted move except `endTurn` pushes a snapshot of the session from before the move.
 * - `endTurn` clears the stack, so undo never crosses a turn boundary.
 * - Undo is allowed after draws, flips, cycles, takes and redraws. The RNG streams live in GameState, so a restored snapshot
 *   replays the same random outcomes. Undoing therefore cannot be used to fish for better luck.
 */
function nextUndo(session: Session, move: Move): Snapshot[] {
    if (move.type === 'endTurn') return []
    return [...session.undo, { state: session.state, history: session.history, message: session.message }]
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
        session: {
            state,
            history,
            message: lines.length > 0 ? lines[lines.length - 1]! : session.message,
            undo: nextUndo(session, move),
        },
        events,
        rejected,
    }
}

export function undoSession(session: Session): Session {
    const snap = session.undo[session.undo.length - 1]
    if (!snap) return session
    return { state: snap.state, history: snap.history, message: snap.message, undo: session.undo.slice(0, -1) }
}

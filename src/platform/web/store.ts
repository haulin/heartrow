import type { GameEvent, GameState, ModeConfig, Move } from '../../core'
import { startSession, stepSession, undoSession } from './session'
import type { Session } from './session'

/**
 * One accepted or rejected move. `before` and `after` are complete sessions, so the view can stay on `before` while an animation plays
 * and then jump to `after`.
 */
export interface Frame {
    move: Move
    events: GameEvent[]
    rejected: boolean
    before: Session
    after: Session
}

export type Holds = Partial<Record<'gold' | 'power' | 'hearts', number>>

/**
 * Two sessions live here. The latest session is the game as the rules see it: every move is applied to it at once, and clicks are resolved against it.
 * The shown session is what the view draws. It trails the latest one while animations play: a presenter commits one frame at a time.
 */
export class GameStore {
    private session: Session
    private shown: Session
    private frames: Frame[] = []
    private epoch = 0
    private deals = 0
    private holds: Holds = {}
    private moves: Move[] = []
    private replayMoves: Move[] | null = null
    private replayIndex = 0
    private replayUndo: Session[] = []
    private readonly listeners = new Set<() => void>()

    constructor(config: ModeConfig, seed: number) {
        this.session = startSession(config, seed)
        this.shown = this.session
    }

    /**
     * The accepted moves of this run, oldest first. Rejected moves and undone moves are left out. The seed and these moves are enough
     * to rebuild the whole run, so a saved run is only this list. A new array replaces it on every change, so a reference check finds changes.
     */
    getMoves = (): Move[] => this.moves

    /** The loaded bot replay and its current position, or null during an ordinary run. */
    getReplayProgress = (): { done: number; total: number } | null =>
        this.replayMoves ? { done: this.replayIndex, total: this.replayMoves.length } : null

    /** Plays `moves` on the current run at once, without animation. Returns false (and changes nothing) if the rules reject one of them. */
    replay = (moves: Move[]): boolean => {
        let session = this.session
        for (const move of moves) {
            const outcome = stepSession(session, move)
            if (outcome.rejected) return false
            session = outcome.session
        }
        this.replayMoves = null
        this.replayIndex = 0
        this.replayUndo = []
        this.moves = [...moves]
        this.jumpTo(session)
        return true
    }

    /** All moves of the loaded replay, or null during an ordinary run. */
    getReplayMoves = (): Move[] | null => this.replayMoves

    /**
     * Loads a validated bot replay so the UI can step through it, standing at its first `at` moves (the start by default) without animation.
     * Changes nothing and returns false if the rules reject one of the moves.
     */
    loadReplay = (config: ModeConfig, seed: number, moves: Move[], at = 0): boolean => {
        const position = Math.min(Math.max(at, 0), moves.length)
        let session = startSession(config, seed)
        let shown = session
        const undo: Session[] = []
        for (const [index, move] of moves.entries()) {
            if (index < position) undo.push(session)
            const outcome = stepSession(session, move)
            if (outcome.rejected) return false
            session = outcome.session
            if (index === position - 1) shown = session
        }
        this.replayMoves = [...moves]
        this.replayIndex = position
        this.replayUndo = undo
        this.moves = moves.slice(0, position)
        this.jumpTo(shown)
        return true
    }

    /** Applies the next move in a loaded replay and presents it like a normal move. */
    replayNext = (): Frame | null => {
        const move = this.replayMoves?.[this.replayIndex]
        if (!move) return null
        const before = this.session
        this.replayIndex++
        const frame = this.step(move)
        if (frame.rejected) {
            this.replayMoves = null
            this.replayUndo = []
        } else {
            this.replayUndo.push(before)
        }
        return frame
    }

    /** The latest session. */
    getSession = (): Session => this.session

    /** The latest game state. */
    getState = (): GameState => this.session.state

    /** The session the view draws. */
    getShown = (): Session => this.shown

    /** Counts undo and new-game jumps. A presenter drops its work when this changes. */
    getEpoch = (): number => this.epoch

    /** Counts new games, so a presenter can tell a fresh deal from an undo, which also changes the epoch. */
    getDeals = (): number => this.deals

    canUndo = (): boolean => (this.replayMoves ? this.replayUndo.length > 0 : this.session.undo.length > 0)

    /** Resource numbers the view keeps showing at their old value while a flight is still carrying the change to its stat box. */
    getHolds = (): Holds => this.holds

    /** Keeps showing `value` for a resource. Does nothing when it is already held, so the oldest shown value stays. */
    hold = (stat: keyof Holds, value: number): void => {
        if (stat in this.holds) return
        this.holds = { ...this.holds, [stat]: value }
    }

    /** A flight landed: the held number grows by what it carried, so several flights count up one by one. */
    bump = (stat: keyof Holds, delta: number): void => {
        const value = this.holds[stat]
        if (value === undefined) return
        this.holds = { ...this.holds, [stat]: value + delta }
        this.emit()
    }

    /** A Swap showed: the held gold and power numbers trade places, so later flights count on the swapped totals. */
    swapHolds = (): void => {
        const { gold, power } = this.holds
        if (gold === undefined || power === undefined) return
        this.holds = { ...this.holds, gold: power, power: gold }
        this.emit()
    }

    release = (stat: keyof Holds): void => {
        if (!(stat in this.holds)) return
        const next = { ...this.holds }
        delete next[stat]
        this.holds = next
        this.emit()
    }

    pendingFrames = (): number => this.frames.length

    peekFrame = (): Frame | undefined => this.frames[0]

    /** Shows the oldest pending frame. */
    commit = (): void => {
        const frame = this.frames.shift()
        if (!frame) return
        this.shown = frame.after
        this.emit()
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    private step = (move: Move): Frame => {
        const before = this.session
        const outcome = stepSession(before, move)
        this.session = outcome.session
        if (!outcome.rejected) this.moves = [...this.moves, move]
        const frame: Frame = { move, events: outcome.events, rejected: outcome.rejected, before, after: this.session }
        this.frames.push(frame)
        this.emit()
        return frame
    }

    dispatch = (move: Move): Frame => {
        this.replayMoves = null
        this.replayIndex = 0
        this.replayUndo = []
        return this.step(move)
    }

    undo = (): void => {
        if (this.replayMoves) {
            const previous = this.replayUndo.pop()
            if (!previous) return
            this.replayIndex--
            this.moves = this.moves.slice(0, -1)
            this.jumpTo(previous)
            return
        }
        const next = undoSession(this.session)
        if (next === this.session) return
        this.moves = this.moves.slice(0, -1)
        this.jumpTo(next)
    }

    newGame = (config: ModeConfig, seed: number): void => {
        this.replayMoves = null
        this.replayIndex = 0
        this.replayUndo = []
        this.moves = []
        this.deals++
        this.jumpTo(startSession(config, seed))
    }

    /** Replaces both sessions and drops pending frames, so no animation plays across the jump. */
    private jumpTo(session: Session): void {
        this.session = session
        this.shown = session
        this.frames = []
        this.holds = {}
        this.epoch++
        this.emit()
    }

    private emit(): void {
        for (const listener of Array.from(this.listeners)) listener()
    }
}

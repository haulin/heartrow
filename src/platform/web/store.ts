import type { GameEvent, GameState, ModeConfig, Move } from '../../core'
import { startSession, stepSession, undoSession } from './session'
import type { Session } from './session'

export interface Batch {
    move: Move
    events: GameEvent[]
    rejected: boolean
}

export class GameStore {
    private session: Session
    private readonly listeners = new Set<() => void>()
    private batches: Batch[] = []

    constructor(config: ModeConfig, seed: number) {
        this.session = startSession(config, seed)
    }

    getSession = (): Session => this.session

    getState = (): GameState => this.session.state

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    dispatch = (move: Move): Batch => {
        const outcome = stepSession(this.session, move)
        this.session = outcome.session
        const batch: Batch = { move, events: outcome.events, rejected: outcome.rejected }
        this.batches.push(batch)
        this.emit()
        return batch
    }

    undo = (): void => {
        const next = undoSession(this.session)
        if (next === this.session) return
        this.session = next
        this.batches = []
        this.emit()
    }

    newGame = (config: ModeConfig, seed: number): void => {
        this.session = startSession(config, seed)
        this.batches = []
        this.emit()
    }

    takeBatches = (): Batch[] => {
        const out = this.batches
        this.batches = []
        return out
    }

    private emit(): void {
        for (const listener of Array.from(this.listeners)) listener()
    }
}

import type { GameState, Move } from '../types'

export interface Policy {
    id: string
    /** A non-negative weight for one legal move. Return 1 for moves this policy has no opinion on, and 0 to veto. */
    weight(state: GameState, move: Move, moves: readonly Move[]): number
}

export interface PickOptions {
    mode: 'sample' | 'greedy'
    /** Greedy mode only: the chance of picking a uniformly random legal move instead of the best one. */
    epsilon: number
}

/** A bot personality. Policies can hold per-game memory, so build a fresh profile for each game. */
export interface Profile {
    id: string
    policies: Policy[]
    pick: PickOptions
}

import { createRng, createStreams, shuffle } from '../rng'
import type { Rng } from '../rng'
import { applyMove, legalMoves } from '../moves'
import { cloneState } from '../state'
import type { GameState, Move } from '../types'
import { composePolicies, pickMove } from './compose'
import { retainChanges } from './policies/retainAware'
import type { Policy, Profile } from './types'

export interface LookaheadOptions {
    /** Rollouts per candidate move. Every candidate sees the same random futures. */
    rollouts: number
    /** Full turns played after the candidate's own turn. */
    horizon: number
    /** Softness of the weights: lower is greedier. */
    temperature: number
}

export const DEFAULT_LOOKAHEAD: LookaheadOptions = { rollouts: 6, horizon: 42, temperature: 1 }

function rollout(start: GameState, move: Move, base: Profile, rng: Rng, futureSeed: number, endTurn: number): number {
    let state = cloneState(start)
    state.streams = createStreams(futureSeed)
    // The real deck order is already decided. Sort first so the old order leaves no trace, then reshuffle:
    // the bot knows what is in the deck, not what comes next.
    state.deck.sort((a, b) => a.id - b.id)
    shuffle(state.streams.shuffle, state.deck)
    state = applyMove(state, move).state
    const policy = composePolicies(base.policies)
    for (let n = 0; state.status === 'playing' && state.turn < endTurn && n < 600; n++) {
        const next = pickMove(state, legalMoves(state), policy, rng, base.pick)
        if (!next) break
        state = applyMove(state, next).state
    }
    return state.hearts
}

/** Scores take, redraw and endTurn by short rollouts of a base profile with reseeded future draws and a reshuffled deck, so the bot never peeks at the real streams. */
export function lookahead(makeBase: () => Profile, options: LookaheadOptions = DEFAULT_LOOKAHEAD): Policy {
    let cachedState: GameState | null = null
    let cached: Record<string, number> = {}
    const key = (m: Move) => (m.type === 'take' ? 'take' + m.rowIndex : m.type)
    return {
        id: 'lookahead',
        weight(state, move, moves) {
            if (move.type !== 'take' && move.type !== 'redraw' && move.type !== 'endTurn') return 1
            if (moves.some((m) => m.type === 'play' && retainChanges(state, state.hand[m.handIndex]!))) return 1
            if (state !== cachedState) {
                cachedState = state
                cached = {}
                const candidates = moves.filter((m) => m.type === 'take' || m.type === 'redraw' || m.type === 'endTurn')
                const endTurn = state.turn + 1 + options.horizon
                const scores: Record<string, number> = {}
                for (const m of candidates) scores[key(m)] = 0
                for (let r = 0; r < options.rollouts; r++) {
                    const futureSeed = (state.seed * 31 + state.turn * 977 + state.nextCardId * 7 + r) >>> 0
                    for (const m of candidates)
                        scores[key(m)] =
                            scores[key(m)]! + rollout(state, m, makeBase(), createRng(futureSeed, 'rollout'), futureSeed + 1, endTurn)
                }
                const best = Math.max(...candidates.map((m) => scores[key(m)]! / options.rollouts))
                for (const m of candidates) cached[key(m)] = Math.exp((scores[key(m)]! / options.rollouts - best) / options.temperature)
            }
            return cached[key(move)] ?? 1
        },
    }
}

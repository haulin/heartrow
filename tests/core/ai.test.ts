import { describe, expect, it } from 'vite-plus/test'
import {
    LONG_MODE,
    PROFILE_IDS,
    cloneState,
    lookahead,
    applyMove,
    composePolicies,
    createRng,
    legalMoves,
    makeProfile,
    newGame,
    pickMove,
    playGame,
    standardMode,
} from '../../src/core'
import type { Move, Policy } from '../../src/core'

const state = newGame(standardMode(0), 1).state
const moves: Move[] = [{ type: 'endTurn' }, { type: 'redraw' }, { type: 'skipExile' }]
const fixed = (id: string, weights: Record<string, number>): Policy => ({ id, weight: (_s, m) => weights[m.type] ?? 1 })

describe('composePolicies', () => {
    it('multiplies weights', () => {
        const p = composePolicies([fixed('a', { endTurn: 2 }), fixed('b', { endTurn: 3.5, redraw: 0.5 })])
        expect(p.weight(state, moves[0]!, moves)).toBe(7)
        expect(p.weight(state, moves[1]!, moves)).toBe(0.5)
        expect(p.id).toBe('a*b')
    })

    it('lets any 0 veto a move', () => {
        const p = composePolicies([fixed('a', { endTurn: 5 }), fixed('b', { endTurn: 0 })])
        expect(p.weight(state, moves[0]!, moves)).toBe(0)
    })
})

describe('pickMove', () => {
    const policy = fixed('p', { endTurn: 1, redraw: 3, skipExile: 0 })

    it('is deterministic for a seed and respects vetoes', () => {
        const run = (seed: number) => {
            const rng = createRng(seed, 'bot')
            return Array.from({ length: 50 }, () => pickMove(state, moves, policy, rng)!.type)
        }
        expect(run(3)).toEqual(run(3))
        expect(run(3)).not.toEqual(run(4))
        expect(run(3)).not.toContain('skipExile')
        expect(run(3)).toContain('redraw')
    })

    it('falls back to a uniform choice when every weight is 0', () => {
        const rng = createRng(1, 'bot')
        const picked = new Set<string>()
        for (let i = 0; i < 100; i++) picked.add(pickMove(state, moves, fixed('z', { endTurn: 0, redraw: 0, skipExile: 0 }), rng)!.type)
        expect(picked.size).toBe(3)
    })

    it('returns null without moves', () => {
        expect(pickMove(state, [], policy, createRng(1, 'bot'))).toBeNull()
    })

    it('greedy picks the best move, and epsilon explores', () => {
        const rng = createRng(1, 'bot')
        const greedy = { mode: 'greedy', epsilon: 0 } as const
        for (let i = 0; i < 20; i++) expect(pickMove(state, moves, policy, rng, greedy)!.type).toBe('redraw')
        const explore = new Set<string>()
        for (let i = 0; i < 200; i++) explore.add(pickMove(state, moves, policy, rng, { mode: 'greedy', epsilon: 0.5 })!.type)
        expect(explore.size).toBe(3)
    })
})

describe('profiles', () => {
    for (const config of [standardMode(0), LONG_MODE]) {
        for (const id of PROFILE_IDS) {
            it(`${id} finishes a ${config.id} game within the move cap`, () => {
                for (const seed of [1, 2]) {
                    const { state: end, summary } = playGame(config, seed, makeProfile(id))
                    expect(end.status).not.toBe('playing')
                    expect(summary.capped).toBe(false)
                    expect(summary.moves).toBeLessThan(4000)
                }
            })
        }
    }

    it('lookahead finishes a standard game within the move cap', () => {
        const { state: end, summary } = playGame(standardMode(0), 1, makeProfile('lookahead'))
        expect(end.status).not.toBe('playing')
        expect(summary.capped).toBe(false)
    })

    it('lookahead does not peek at the order of the real deck', () => {
        const bot = composePolicies(makeProfile('mixed').policies)
        const rng = createRng(3, 'bot')
        let base = newGame(LONG_MODE, 3).state
        for (let n = 0; n < 2000 && !(base.turn >= 8 && legalMoves(base).every((m) => m.type !== 'play')); n++) {
            base = applyMove(base, pickMove(base, legalMoves(base), bot, rng)!).state
        }
        const flipped = cloneState(base)
        flipped.deck.reverse()
        expect(flipped.deck.map((c) => c.id)).not.toEqual(base.deck.map((c) => c.id))
        const options = { rollouts: 3, horizon: 8, temperature: 1 }
        const weights = (s: typeof base) => {
            const policy = lookahead(() => makeProfile('mixed'), options)
            const all = legalMoves(s)
            return all.map((m) => policy.weight(s, m, all))
        }
        expect(base.status).toBe('playing')
        const before = weights(base)
        expect(before.some((w) => w !== 1)).toBe(true)
        expect(weights(flipped)).toEqual(before)
    })

    it('is deterministic for the same seeds', () => {
        const a = playGame(LONG_MODE, 9, makeProfile('smart'), 5)
        const b = playGame(LONG_MODE, 9, makeProfile('smart'), 5)
        expect(a.state).toEqual(b.state)
    })

    it('never proposes an illegal move', () => {
        const profile = makeProfile('mixed')
        const policy = composePolicies(profile.policies)
        const rng = createRng(1, 'bot')
        let s = newGame(standardMode(0), 4).state
        for (let i = 0; i < 300 && s.status === 'playing'; i++) {
            const legal = legalMoves(s)
            const move = pickMove(s, legal, policy, rng, profile.pick)!
            const result = applyMove(s, move)
            expect(result.events[0]?.type).not.toBe('rejected')
            s = result.state
        }
    })
})

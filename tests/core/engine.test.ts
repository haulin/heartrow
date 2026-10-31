import { describe, expect, it } from 'vitest'
import { LONG_MODE, applyMove, createRng, legalMoves, newGame, pick, chance, standardMode } from '../../src/core'
import type { GameEvent, GameState, ModeConfig, Move } from '../../src/core'

function randomGame(
    mode: ModeConfig,
    seed: number,
    hook?: (before: GameState, move: Move, after: GameState) => void,
): { state: GameState; events: GameEvent[]; moves: Move[] } {
    const rng = createRng(seed, 'fuzz')
    let { state } = newGame(mode, seed)
    const events: GameEvent[] = []
    const moves: Move[] = []
    for (let i = 0; i < 5000 && state.status === 'playing'; i++) {
        const legal = legalMoves(state)
        const others = legal.filter((m) => m.type !== 'endTurn' && !(m.type === 'redraw' && state.redraws > 1))
        const move = others.length === 0 || chance(rng, 0.12) ? { type: 'endTurn' as const } : pick(rng, others)
        const choice = state.pendingExile ? pick(rng, legal) : move
        const result = applyMove(state, choice)
        hook?.(state, choice, result.state)
        state = result.state
        events.push(...result.events)
        moves.push(choice)
    }
    return { state, events, moves }
}

describe('engine', () => {
    it('is deterministic for the same mode, seed and moves', () => {
        const a = randomGame(LONG_MODE, 21)
        const b = randomGame(LONG_MODE, 21)
        expect(b.moves).toEqual(a.moves)
        expect(b.state).toEqual(a.state)
        expect(b.events).toEqual(a.events)
        expect(randomGame(LONG_MODE, 22).state).not.toEqual(a.state)
    })

    it('survives a JSON round trip at every step', () => {
        randomGame(standardMode(1), 5, (_before, _move, after) => {
            expect(JSON.parse(JSON.stringify(after))).toEqual(after)
            expect(JSON.stringify(JSON.parse(JSON.stringify(after)))).toBe(JSON.stringify(after))
        })
    })

    it('never mutates the input state', () => {
        randomGame(LONG_MODE, 8, (before, move) => {
            const frozen = JSON.stringify(before)
            applyMove(before, move)
            expect(JSON.stringify(before)).toBe(frozen)
        })
    })

    it('does not share card objects between steps', () => {
        const s = newGame(standardMode(0), 4).state
        const next = applyMove(s, { type: 'play', handIndex: 0 }).state
        expect(next.hand[0]).not.toBe(s.hand[0])
        expect(s.hand[0]!.played).toBeUndefined()
    })

    it('accepts exactly the moves legalMoves lists', () => {
        randomGame(LONG_MODE, 12, (before) => {
            const key = (m: Move) => JSON.stringify(m)
            const legal = new Set(legalMoves(before).map(key))
            const candidates: Move[] = [{ type: 'endTurn' }, { type: 'redraw' }, { type: 'skipExile' }]
            for (let i = -1; i <= before.hand.length; i++) candidates.push({ type: 'play', handIndex: i }, { type: 'exile', handIndex: i })
            for (let i = -1; i <= before.row.length; i++) candidates.push({ type: 'take', rowIndex: i })
            for (const move of candidates) {
                const accepted = !applyMove(before, move).events.some((e) => e.type === 'rejected')
                expect(accepted, key(move)).toBe(legal.has(key(move)))
            }
        })
    })

    it('rejects a move of an unknown type', () => {
        const state = newGame(standardMode(0), 1).state
        const result = applyMove(state, { type: 'nope' } as unknown as Move)
        expect(result.events).toEqual([{ type: 'rejected', reason: 'unknownMove' }])
        expect(result.state).toBe(state)
    })

    it('starts with the documented setup', () => {
        const { state, events } = newGame(standardMode(0), 1)
        expect(state.hand).toHaveLength(5)
        expect(state.deck).toHaveLength(5)
        expect(state.row).toHaveLength(5)
        expect([state.redraws, state.turn, state.hearts, state.goal, state.mode]).toEqual([1, 1, 0, 48, 'standard'])
        const all = [...state.deck, ...state.hand]
        expect(all.filter((c) => c.gold === 1)).toHaveLength(6)
        expect(all.filter((c) => c.power === 1)).toHaveLength(4)
        expect(events).toEqual([{ type: 'drew', cardIds: state.hand.map((c) => c.id), requested: 5, cause: 'setup' }])
    })
})

describe('random-legal-move fuzz', () => {
    for (const mode of [standardMode(0), LONG_MODE]) {
        it(`finishes 300 ${mode.id} games without throwing`, () => {
            for (let seed = 1; seed <= 300; seed++) {
                const { state, events, moves } = randomGame(mode, seed)
                expect(state.status).not.toBe('playing')
                expect(state.turn).toBeLessThanOrEqual(mode.turns)
                expect(moves.length).toBeLessThan(5000)
                expect(events.some((e) => e.type === 'rejected')).toBe(false)
                const ids = [...state.deck, ...state.hand, ...state.discard, ...state.exile].map((c) => c.id)
                expect(new Set(ids).size).toBe(ids.length)
            }
        })
    }
})

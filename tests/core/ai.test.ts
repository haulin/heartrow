import { describe, expect, it } from 'vite-plus/test'
import {
    LONG_MODE,
    PROFILE_IDS,
    LAB_PROFILE_IDS,
    cloneState,
    lookahead,
    applyMove,
    buyEnemies,
    composePolicies,
    createRng,
    customMode,
    DEFAULT_CUSTOM,
    edgeFollowUp,
    exileByAverage,
    expectedCardCost,
    hasReasonableResources,
    humanPlayOrder,
    legalMoves,
    makeProfile,
    newGame,
    phaseBuy,
    pickMove,
    playGame,
    redrawMemory,
    redrawWhenStuck,
    standardMode,
} from '../../src/core'
import type { Card, GameState, Move, Policy } from '../../src/core'

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
    it('random is a uniform sampled control', () => {
        const profile = makeProfile('random')
        const policy = composePolicies(profile.policies)
        const rng = createRng(1, 'bot')
        const picked = new Set<string>()
        for (let i = 0; i < 100; i++) picked.add(pickMove(state, moves, policy, rng, profile.pick)!.type)
        expect(profile.policies).toHaveLength(0)
        expect(profile.pick.mode).toBe('sample')
        expect(picked).toEqual(new Set(['endTurn', 'redraw', 'skipExile']))
    })

    it('estimates the rising card cost curve for resource decisions', () => {
        const early = newGame(standardMode(0), 1).state
        const late = { ...early, turn: 24 }
        expect(expectedCardCost(early, 'recruit')).toBeCloseTo(3.17, 2)
        expect(expectedCardCost(early, 'enemy')).toBeCloseTo(1.17, 2)
        expect(expectedCardCost(late, 'recruit')).toBeCloseTo(6.57, 2)
        expect(expectedCardCost(late, 'enemy')).toBeCloseTo(4.57, 2)
        expect(hasReasonableResources({ ...early, gold: 1, power: 0 })).toBe(false)
        expect(hasReasonableResources({ ...early, gold: 4, power: 0 })).toBe(true)
        expect(hasReasonableResources({ ...early, gold: 0, power: 1 })).toBe(false)
        expect(hasReasonableResources({ ...early, gold: 0, power: 2 })).toBe(true)
    })

    it('values a Power Coin like its expected Power gain', () => {
        const initial = newGame(standardMode(0), 1).state
        const power = {
            ...initial.row[0]!,
            type: 'ember' as const,
            kind: 'recruit' as const,
            cost: 2,
            gold: 0,
            power: 3,
            hearts: 0,
            fx: [],
            main: 'power' as const,
        }
        const flip = {
            ...power,
            power: 0,
            fx: ['flip'] as Card['fx'],
            fxParams: { currency: 'power' as const },
        }
        const policy = phaseBuy()
        const plainWeight = policy.weight({ ...initial, row: [power, ...initial.row.slice(1)] }, { type: 'take', rowIndex: 0 }, [])
        const flipWeight = policy.weight({ ...initial, row: [flip, ...initial.row.slice(1)] }, { type: 'take', rowIndex: 0 }, [])
        expect(flipWeight).toBeGreaterThan(plainWeight)
    })

    it('takes more redraw risk when several redraws remain', () => {
        const early = newGame(standardMode(0), 1).state
        expect(hasReasonableResources({ ...early, gold: 3, power: 0, redraws: 1 })).toBe(false)
        expect(hasReasonableResources({ ...early, gold: 3, power: 0, redraws: 2 })).toBe(true)
    })

    it('ignores resources for card kinds disabled by a custom generator', () => {
        const noEnemies = newGame(
            customMode({ ...DEFAULT_CUSTOM, types: ['moss'], resources: ['gold', 'hearts'], starterPower: 4 }),
            1,
        ).state
        expect(expectedCardCost(noEnemies, 'enemy')).toBe(0)
        expect(hasReasonableResources({ ...noEnemies, gold: 0, power: 1 })).toBe(false)

        const noRecruits = newGame(
            customMode({ ...DEFAULT_CUSTOM, types: ['foe'], resources: ['power', 'hearts'], starterGold: 4, starterPower: 0 }),
            1,
        ).state
        expect(expectedCardCost(noRecruits, 'recruit')).toBe(0)
        expect(hasReasonableResources({ ...noRecruits, gold: 1, power: 0 })).toBe(false)
    })

    it('cycles only when replacement cards beat the discarded hand', () => {
        const initial = newGame(standardMode(0), 1).state
        const cycle = {
            ...initial.hand[0]!,
            kind: 'recruit' as const,
            fx: ['cycle'] as Card['fx'],
            gold: 0,
            power: 0,
            hearts: 0,
            retain: false,
        }
        const plain = { ...initial.hand[1]!, gold: 1, power: 0, hearts: 0, fx: [] }
        const replacement = { ...initial.hand[2]!, gold: 3, power: 0, hearts: 0, fx: [] }
        const policy = humanPlayOrder()
        const playCycle = { type: 'play' as const, handIndex: 0 }

        const deckState = { ...initial, hand: [cycle, plain], deck: [replacement], discard: [] }
        expect(policy.weight(deckState, playCycle, [])).toBe(8)

        const reshuffleState = { ...deckState, deck: [], discard: [replacement] }
        expect(policy.weight(reshuffleState, playCycle, [])).toBe(8)

        const weakDrawState = { ...deckState, deck: [{ ...replacement, gold: 0 }] }
        expect(policy.weight(weakDrawState, playCycle, [])).toBe(0)

        const poweredCycle = { ...cycle, power: 2 }
        const poweredState = { ...weakDrawState, hand: [poweredCycle, plain] }
        expect(policy.weight(poweredState, playCycle, [])).toBe(8)
    })

    it('prefers an enemy effect when enemy gains and position tie', () => {
        const initial = newGame(standardMode(0), 1).state
        const plain = { ...initial.row[0]!, kind: 'enemy' as const, cost: 1, hearts: 1, fx: [] }
        const effect = { ...plain, fx: ['flip'] as Card['fx'] }
        const state = { ...initial, row: [plain, effect, ...initial.row.slice(2)] }
        const policy = buyEnemies()

        expect(policy.weight(state, { type: 'take', rowIndex: 0 }, [])).toBe(5)
        expect(policy.weight(state, { type: 'take', rowIndex: 1 }, [])).toBe(6)
    })

    it('allows an affordable take after a stuck redraw', () => {
        const initial = newGame(standardMode(0), 1).state
        const before = { ...initial, gold: 1, power: 0, redraws: 1, row: initial.row.map((card) => ({ ...card, cost: 99 })) }
        const affordable = { ...before.row[0]!, kind: 'recruit' as const, cost: 1, gold: 1 }
        const after = { ...before, redraws: 0, row: [affordable, ...before.row.slice(1)] }
        const policy = redrawWhenStuck(redrawMemory())

        policy.weight(before, { type: 'endTurn' }, [{ type: 'endTurn' }])
        expect(policy.weight(after, { type: 'take', rowIndex: 0 }, [{ type: 'take', rowIndex: 0 }])).toBe(1)
    })

    it('does not count a take the buying policies veto as something to buy', () => {
        const initial = newGame(standardMode(0), 1).state
        const cheap = { ...initial.row[0]!, kind: 'recruit' as const, cost: 1, gold: 1 }
        const poor = { ...initial, gold: 1, power: 0, row: [cheap, ...initial.row.slice(1)] }
        const legal: Move[] = [{ type: 'take', rowIndex: 0 }, { type: 'redraw' }, { type: 'endTurn' }]
        const veto = fixed('veto', { take: 0 })
        const redraw = (buyers: Policy[]) => redrawWhenStuck(redrawMemory(), { buyers }).weight(poor, { type: 'redraw' }, legal)

        expect(redraw([])).toBeGreaterThan(0)
        expect(redraw([veto])).toBe(0)
    })

    it('exiles a played Basic only when the deck average of its resource stays within the allowed drop', () => {
        const initial = newGame(standardMode(0), 1).state
        const all = [...initial.deck, ...initial.hand, ...initial.discard]
        const gold = { ...all.find((card) => card.kind === 'basic' && card.gold)!, played: true }
        const power = { ...all.find((card) => card.kind === 'basic' && card.power)!, played: true }
        const rest = all.filter((card) => card.id !== gold.id && card.id !== power.id)
        const state = { ...initial, hand: [gold, power], deck: rest, discard: [] }
        const policy = exileByAverage()

        // Six Gold and four Power Basics: losing a Gold Basic cuts the Gold average 7%, losing a Power Basic cuts Power 17%.
        expect(policy.weight(state, { type: 'exile', handIndex: 0 }, [])).toBeGreaterThan(0)
        expect(policy.weight(state, { type: 'exile', handIndex: 1 }, [])).toBe(0)
    })

    it('redraws before defeating the edge enemy only when its neighbour would escape and nothing else is worth buying', () => {
        const initial = newGame(standardMode(0), 1).state
        const enemy = { ...initial.row[0]!, kind: 'enemy' as const, cost: 3, fx: [] }
        const row = [...initial.row.slice(0, 3), enemy, enemy]
        const state = { ...initial, power: 4, row }
        const legal: Move[] = [{ type: 'take', rowIndex: 4 }, { type: 'take', rowIndex: 3 }, { type: 'redraw' }, { type: 'endTurn' }]
        const onlyEdge: Policy = { id: 'onlyEdge', weight: (_s, m) => (m.type === 'take' && m.rowIndex !== 4 ? 0 : 1) }
        const weights = (buyers: Policy[], from = state) =>
            legal.map((move) => edgeFollowUp(redrawMemory(), buyers).weight(from, move, legal))

        // 4 Power pays the edge (3) and leaves 1, which cannot pay the neighbour (3).
        expect(weights([onlyEdge])).toEqual([0, 1, 8, 1])
        expect(weights([])).toEqual([1, 1, 1, 1])
        expect(weights([onlyEdge], { ...state, power: 6 })).toEqual([1, 1, 1, 1])
    })

    for (const config of [standardMode(0), LONG_MODE]) {
        for (const id of [...PROFILE_IDS, ...LAB_PROFILE_IDS]) {
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

    it('lab profiles can switch between greedy and sampled selection', () => {
        for (const id of LAB_PROFILE_IDS) {
            expect(makeProfile(id, 'greedy').pick.mode).toBe('greedy')
            expect(makeProfile(id, 'sample').pick.mode).toBe('sample')
        }
    })

    it('lookahead finishes a standard game within the move cap', () => {
        const { state: end, summary } = playGame(standardMode(0), 1, makeProfile('lookahead'))
        expect(end.status).not.toBe('playing')
        expect(summary.capped).toBe(false)
    })

    it('lookahead does not peek at the order of the real deck', () => {
        const bot = composePolicies(makeProfile('mixed').policies)
        const options = { rollouts: 3, horizon: 8, temperature: 1 }
        const weights = (s: GameState) => {
            const policy = lookahead(() => makeProfile('mixed'), options)
            const all = legalMoves(s)
            return all.map((m) => policy.weight(s, m, all))
        }
        const quiet = (s: GameState) => s.turn >= 8 && s.deck.length > 3 && legalMoves(s).every((m) => m.type !== 'play')
        // A quiet state where the rollouts actually rank the moves; some seeds reach only states where every weight is 1.
        const informative = (s: GameState) => s.status === 'playing' && quiet(s) && weights(s).some((w) => w !== 1)
        let base = newGame(LONG_MODE, 3).state
        for (let seed = 3; seed < 30 && !informative(base); seed++) {
            const rng = createRng(seed, 'bot')
            base = newGame(LONG_MODE, seed).state
            for (let n = 0; n < 2000 && base.status === 'playing' && !informative(base); n++) {
                base = applyMove(base, pickMove(base, legalMoves(base), bot, rng, { mode: 'greedy', epsilon: 0 })!).state
            }
        }
        expect(informative(base)).toBe(true)
        const flipped = cloneState(base)
        flipped.deck.reverse()
        expect(flipped.deck.map((c) => c.id)).not.toEqual(base.deck.map((c) => c.id))
        const before = weights(base)
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

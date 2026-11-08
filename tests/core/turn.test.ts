import { describe, expect, it } from 'vitest'
import { LONG_MODE, applyMove, cloneState, legalMoves, makeCard, makeRiverCard, standardMode } from '../../src/core'
import { CARDS_PER_EXTRA_TURN } from '../../src/core/generator/budget'
import { basicCard, blank, enemy, eventTypes, mk } from './helpers'

describe('endTurn ordering', () => {
    it('lets an escaping enemy undo a reached goal', () => {
        const s = blank()
        s.goal = 10
        s.hearts = 10
        s.row = [mk(), mk(), mk(), mk(), enemy({ hearts: 3 })]
        const { state, events } = applyMove(s, { type: 'endTurn' })
        expect(state.hearts).toBe(7)
        expect(state.status).toBe('playing')
        expect(state.turn).toBe(2)
        expect(state.stats.lostToEscapes).toBe(3)
        expect(eventTypes(events).slice(0, 2)).toEqual(['escaped', 'rowRefilled'])
    })

    it('counts reaped hearts towards the goal and wins', () => {
        const s = blank()
        s.goal = 10
        s.hearts = 9
        s.reapGold = 1
        s.gold = 3
        const { state, events } = applyMove(s, { type: 'endTurn' })
        expect(state.status).toBe('won')
        expect(state.turn).toBe(1)
        expect(eventTypes(events).slice(-2)).toEqual(['reaped', 'gameOver'])
    })

    it('only emits goalReached mid-turn, once', () => {
        const s = blank()
        s.goal = 2
        s.hand = [mk({ hearts: 2 }), mk({ hearts: 1 })]
        const first = applyMove(s, { type: 'play', handIndex: 0 })
        expect(first.state.status).toBe('playing')
        expect(eventTypes(first.events)).toContain('goalReached')
        expect(eventTypes(applyMove(first.state, { type: 'play', handIndex: 1 }).events)).not.toContain('goalReached')
    })

    it('ends on the last turn as lost or won', () => {
        const s = blank()
        s.turn = s.maxTurns
        s.hearts = s.goal! - 1
        expect(applyMove(s, { type: 'endTurn' }).state.status).toBe('lost')
        const long = blank(LONG_MODE)
        long.turn = long.maxTurns
        long.hearts = -5
        const done = applyMove(long, { type: 'endTurn' })
        expect(done.state.status).toBe('lost')
        expect(done.state.turn).toBe(42)
        expect(legalMoves(done.state)).toEqual([])
        expect(applyMove(done.state, { type: 'endTurn' }).events).toEqual([{ type: 'rejected', reason: 'gameOver' }])
    })

    it('stops at the goal, and a continued run plays on and still counts the win after hearts are lost', () => {
        const s = blank(LONG_MODE)
        s.hearts = s.goal!
        const won = applyMove(s, { type: 'endTurn' }).state
        expect(won).toMatchObject({ status: 'won', goalMetTurn: 1, continued: false, turn: 1 })
        expect(legalMoves(won)).toEqual([])
        const { state: after, events } = applyMove(won, { type: 'continue' })
        expect(after).toMatchObject({ status: 'playing', continued: true, turn: 2 })
        expect(eventTypes(events)).toContain('turnStarted')
        // The goal was met at the end of the turn, so a run that plays on does not announce it as reached later.
        after.hand = [mk({ gold: 1 })]
        expect(eventTypes(applyMove(after, { type: 'play', handIndex: 0 }).events)).not.toContain('goalReached')
        after.hearts = 0
        after.turn = after.maxTurns
        const done = applyMove(after, { type: 'endTurn' }).state
        expect(done).toMatchObject({ status: 'won', goalMetTurn: 1 })
        expect(applyMove(done, { type: 'continue' }).events).toEqual([{ type: 'rejected', reason: 'cannotContinue' }])
    })

    it('cannot continue a run that is playing, lost, already continued or won on the last turn', () => {
        const playing = blank()
        expect(applyMove(playing, { type: 'continue' }).events).toEqual([{ type: 'rejected', reason: 'cannotContinue' }])
        const last = blank()
        last.turn = last.maxTurns
        last.hearts = last.goal!
        const wonLast = applyMove(last, { type: 'endTurn' }).state
        expect(wonLast.status).toBe('won')
        expect(applyMove(wonLast, { type: 'continue' }).state).toBe(wonLast)
        last.hearts = 0
        expect(applyMove(applyMove(last, { type: 'endTurn' }).state, { type: 'continue' }).state.status).toBe('lost')
    })

    it('refills the row with the next turn difficulty and discards, retains and draws five', () => {
        const s = blank(LONG_MODE, 5)
        s.turn = 24
        s.hand = [mk({ retain: true }), mk({ retain: true, played: true }), mk(), basicCard()]
        s.deck = Array.from({ length: 8 }, () => mk())
        const expected = makeCard(cloneState(s), 25)
        const { state, events } = applyMove(s, { type: 'endTurn' })
        expect(state.row[0]).toEqual(expected)
        expect(state.hand).toHaveLength(1 + 5)
        expect(state.hand[0]!.played).toBe(false)
        expect(state.discard).toHaveLength(3)
        expect(events.find((e) => e.type === 'retained')).toMatchObject({ count: 1 })
    })

    it('grants a flush when entering turns 4, 7, ...', () => {
        let s = blank()
        const gained: boolean[] = []
        for (let i = 0; i < 6; i++) {
            const r = applyMove(s, { type: 'endTurn' })
            s = r.state
            gained.push((r.events.find((e) => e.type === 'turnStarted') as { flushGained: boolean }).flushGained)
        }
        expect(gained).toEqual([false, false, true, false, false, true])
        expect(s.flushes).toBe(3)
    })
})

describe('flush and rejections', () => {
    it('replaces the four left cards, keeps the edge card and spends a flush', () => {
        const s = blank()
        const edge = s.row[4]!
        const generated = cloneState(s)
        const expected = Array.from({ length: 4 }, () => makeCard(generated, generated.turn))
            .map((card) => card.id)
            .reverse()
        const { state, events } = applyMove(s, { type: 'flush' })
        expect(state.flushes).toBe(0)
        expect(state.row[4]).toEqual(edge)
        expect(state.row.slice(0, 4).map((card) => card.id)).toEqual(expected)
        expect(state.row.slice(0, 4).every((c, i) => c.id !== s.row[i]!.id)).toBe(true)
        expect(eventTypes(events)).toEqual(['rowFlushed'])
        expect(applyMove(state, { type: 'flush' }).events).toEqual([{ type: 'rejected', reason: 'noFlushes' }])
    })

    it('returns the same state and one rejected event for invalid moves', () => {
        const s = blank()
        s.hand = [mk({ played: true })]
        for (const [move, reason] of [
            [{ type: 'play', handIndex: 0 }, 'alreadyPlayed'],
            [{ type: 'play', handIndex: 4 }, 'noSuchCard'],
            [{ type: 'take', rowIndex: -1 }, 'noSuchCard'],
            [{ type: 'exile', handIndex: 0 }, 'noExilePending'],
            [{ type: 'skipExile' }, 'noExilePending'],
        ] as const) {
            const r = applyMove(s, move)
            expect(r.state).toBe(s)
            expect(r.events).toEqual([{ type: 'rejected', reason }])
        }
    })

    it('lists only unplayed plays, affordable takes, flush and endTurn', () => {
        const s = blank(standardMode(0))
        s.hand = [mk({ played: true }), mk()]
        s.row = [mk({ cost: 2 }), mk({ cost: 5 }), enemy({ cost: 3 }), enemy({ cost: 1 }), mk({ cost: 9 })]
        s.gold = 2
        s.power = 1
        expect(legalMoves(s)).toEqual([
            { type: 'play', handIndex: 1 },
            { type: 'take', rowIndex: 0 },
            { type: 'take', rowIndex: 3 },
            { type: 'flush' },
            { type: 'endTurn' },
        ])
    })

    it('exiles a recruit from the river and refills the left edge', () => {
        const s = blank()
        const first = mk({ id: 101 })
        const target = mk({ id: 102 })
        const middleEnemy = enemy({ id: 103 })
        const fourth = mk({ id: 104 })
        const edge = enemy({ id: 105 })
        s.pendingExile = true
        s.row = [first, target, middleEnemy, fourth, edge]
        const expected = makeCard(cloneState(s), s.turn)

        expect(legalMoves(s)).toEqual([
            { type: 'exile', rowIndex: 0 },
            { type: 'exile', rowIndex: 1 },
            { type: 'exile', rowIndex: 3 },
            { type: 'skipExile' },
        ])
        const result = applyMove(s, { type: 'exile', rowIndex: 1 })
        expect(result.state.exile.map((card) => card.id)).toEqual([target.id])
        expect(result.state.row).toEqual([expected, first, middleEnemy, fourth, edge])
        expect(eventTypes(result.events)).toEqual(['exiled', 'rowRefilled'])
        expect(applyMove(s, { type: 'exile', rowIndex: 2 }).events).toEqual([{ type: 'rejected', reason: 'cannotExile' }])
        expect(applyMove(s, { type: 'exile', rowIndex: 4 }).events).toEqual([{ type: 'rejected', reason: 'cannotExile' }])
    })
})

describe('river cards of a long turn', () => {
    const meanCost = (generated: number) => {
        const s = blank(standardMode(0))
        let total = 0
        for (let i = 0; i < 300; i++) {
            s.generatedThisTurn = generated
            total += makeRiverCard(s, 1).cost
        }
        return total / 300
    }

    it('are as hard as the next turn for every seven made this turn', () => {
        expect(meanCost(CARDS_PER_EXTRA_TURN - 1)).toBe(meanCost(0))
        expect(meanCost(CARDS_PER_EXTRA_TURN * 20)).toBeGreaterThan(meanCost(0) + 2)
    })

    it('count the cards of a flush and a purchase, and start again with the turn', () => {
        const s = blank()
        s.power = 1
        s.row = [enemy({ cost: 1 }), ...s.row.slice(1)]
        const bought = applyMove(s, { type: 'take', rowIndex: 0 }).state
        expect(bought.generatedThisTurn).toBe(1)
        expect(applyMove(bought, { type: 'flush' }).state.generatedThisTurn).toBe(5)
        expect(applyMove(bought, { type: 'endTurn' }).state.generatedThisTurn).toBe(1)
    })
})

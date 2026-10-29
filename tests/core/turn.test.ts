import { describe, expect, it } from 'vitest'
import { LONG_MODE, applyMove, cloneState, legalMoves, makeCard, standardMode } from '../../src/core'
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

    it('ends on the last turn as lost, won or finished', () => {
        const s = blank()
        s.turn = s.maxTurns
        s.hearts = s.goal! - 1
        expect(applyMove(s, { type: 'endTurn' }).state.status).toBe('lost')
        const long = blank(LONG_MODE)
        long.turn = long.maxTurns
        long.hearts = -5
        const done = applyMove(long, { type: 'endTurn' })
        expect(done.state.status).toBe('finished')
        expect(done.state.turn).toBe(42)
        expect(legalMoves(done.state)).toEqual([])
        expect(applyMove(done.state, { type: 'endTurn' }).events).toEqual([{ type: 'rejected', reason: 'gameOver' }])
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

    it('grants a redraw when entering turns 4, 7, ...', () => {
        let s = blank()
        const gained: boolean[] = []
        for (let i = 0; i < 6; i++) {
            const r = applyMove(s, { type: 'endTurn' })
            s = r.state
            gained.push((r.events.find((e) => e.type === 'turnStarted') as { redrawGained: boolean }).redrawGained)
        }
        expect(gained).toEqual([false, false, true, false, false, true])
        expect(s.redraws).toBe(3)
    })
})

describe('redraw and rejections', () => {
    it('replaces the four left cards, keeps the edge card and spends a redraw', () => {
        const s = blank()
        const edge = s.row[4]!
        const { state, events } = applyMove(s, { type: 'redraw' })
        expect(state.redraws).toBe(0)
        expect(state.row[4]).toEqual(edge)
        expect(state.row.slice(0, 4).every((c, i) => c.id !== s.row[i]!.id)).toBe(true)
        expect(eventTypes(events)).toEqual(['rowRedrawn'])
        expect(applyMove(state, { type: 'redraw' }).events).toEqual([{ type: 'rejected', reason: 'noRedraws' }])
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

    it('lists only unplayed plays, affordable takes, redraw and endTurn', () => {
        const s = blank(standardMode(0))
        s.hand = [mk({ played: true }), mk()]
        s.row = [mk({ cost: 2 }), mk({ cost: 5 }), enemy({ cost: 3 }), enemy({ cost: 1 }), mk({ cost: 9 })]
        s.gold = 2
        s.power = 1
        expect(legalMoves(s)).toEqual([
            { type: 'play', handIndex: 1 },
            { type: 'take', rowIndex: 0 },
            { type: 'take', rowIndex: 3 },
            { type: 'redraw' },
            { type: 'endTurn' },
        ])
    })
})

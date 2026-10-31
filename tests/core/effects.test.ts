import { describe, expect, it } from 'vitest'
import { EFFECT_BY_ID, EFFECTS, applyMove, cardCost, legalMoves } from '../../src/core'
import type { GameState, Move } from '../../src/core'
import { basicCard, blank, enemy, eventTypes, mk } from './helpers'

function playAll(state: GameState, ...indexes: number[]): GameState {
    let s = state
    for (const handIndex of indexes) s = applyMove(s, { type: 'play', handIndex }).state
    return s
}

describe('effect registry', () => {
    it('has one entry per effect id, with draw priced per card', () => {
        expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(18)
        expect(EFFECT_BY_ID.draw.perDrawCard).toBe(true)
        expect(EFFECTS.filter((e) => !e.enemies).map((e) => e.id)).toEqual(['all3', 'bond', 'kin', 'army'])
    })

    // A tripwire: a new or changed effect fails here until its needs are decided on purpose. The generator and the custom
    // generator dialog read `needs`, so a wrong table means dead effects (or missing ones) in limited generators.
    it('declares what each effect needs from a generator', () => {
        expect(Object.fromEntries(EFFECTS.map((e) => [e.id, e.needs ?? []]))).toEqual({
            draw: [],
            coin: ['gold'],
            exile: [],
            cheap: ['gold'],
            foes: ['foe', 'power'],
            all3: ['moss', 'ember', 'tide', 'hearts'],
            vault: ['exile', 'hearts'],
            basics: ['gold'],
            pile: ['power'],
            bond: [],
            kin: [],
            weak: ['foe', 'power'],
            army: [],
            cycle: [],
            purge: [],
            swap: ['gold', 'power'],
            reapG: ['gold', 'hearts'],
            reapP: ['power', 'hearts'],
        })
    })
})

describe('type effects', () => {
    it('all3 needs three coloured types and ignores basics', () => {
        const hand = () => [basicCard(), mk({ type: 'moss' }), mk({ type: 'ember', main: 'power' }), mk({ type: 'tide', fx: ['all3'] })]
        const s = blank()
        s.hand = hand()
        expect(playAll(s, 0, 1, 2, 3).hearts).toBe(2)
        const t = blank()
        t.hand = [basicCard(), basicCard(), mk({ type: 'moss' }), mk({ type: 'tide', fx: ['all3'] })]
        expect(playAll(t, 0, 1, 2, 3).hearts).toBe(0)
    })

    it('bond pays only when its type was already played', () => {
        const bonded = () => mk({ type: 'moss', fx: ['bond'], bondCount: 2 })
        const first = blank()
        first.hand = [bonded(), mk({ type: 'moss' })]
        expect(playAll(first, 0, 1).gold).toBe(0)
        const second = blank()
        second.hand = [mk({ type: 'moss' }), bonded(), mk({ type: 'ember' }), mk({ type: 'ember', fx: ['bond'], main: 'power' })]
        const done = playAll(second, 0, 1, 2, 3)
        expect(done.gold).toBe(2)
        expect(done.power).toBe(1)
    })

    it('kin counts only other played cards of the type still in hand', () => {
        const s = blank()
        s.hand = [mk(), mk(), mk(), mk({ type: 'ember' }), mk({ fx: ['kin'], kinCurrency: 'power' })]
        expect(playAll(s, 0, 1, 3, 4).power).toBe(2)
    })

    it('army counts the card type in deck, hand and discard but not exile', () => {
        const s = blank()
        const tide = (n: number) => Array.from({ length: n }, () => mk({ type: 'tide' }))
        s.hand = [mk({ type: 'tide', fx: ['army'], kinCurrency: 'gold' })]
        s.deck = tide(3)
        s.discard = tide(3)
        s.exile = tide(5)
        expect(playAll(s, 0).gold).toBe(1)
        s.discard = tide(4)
        expect(playAll(s, 0).gold).toBe(2)
    })
})

describe('draw and cycle', () => {
    it('cycle draws before it discards, so the discarded cards cannot return', () => {
        const s = blank()
        const unplayed = mk()
        s.hand = [mk({ fx: ['cycle'] }), unplayed]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect(state.hand.map((c) => c.id)).toEqual([s.hand[0]!.id])
        expect(state.discard.map((c) => c.id)).toEqual([unplayed.id])
        expect(events.find((e) => e.type === 'cycled')).toMatchObject({ count: 1, purge: false })
    })

    it('cycle keeps Retain and played cards, purge discards unplayed Retain too', () => {
        const build = (fx: 'cycle' | 'purge') => {
            const s = blank()
            s.hand = [mk({ gold: 1 }), mk({ fx: [fx] }), mk({ retain: true }), mk()]
            s.deck = [mk(), mk(), mk()]
            return playAll(s, 0, 1)
        }
        expect(build('cycle').hand).toHaveLength(2 + 1 + 1)
        expect(build('cycle').hand.some((c) => c.retain)).toBe(true)
        expect(build('purge').hand.some((c) => c.retain)).toBe(false)
        expect(build('purge').hand).toHaveLength(2 + 2)
    })

    it('draw reshuffles the discard when the deck runs out', () => {
        const s = blank()
        s.hand = [mk({ fx: ['draw'], drawCount: 3 })]
        s.deck = [mk()]
        s.discard = [mk(), mk(), mk()]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect(state.hand).toHaveLength(4)
        expect(state.deck).toHaveLength(1)
        expect(state.discard).toHaveLength(0)
        expect(eventTypes(events)).toContain('reshuffled')
        expect(events.find((e) => e.type === 'drew')).toMatchObject({ requested: 3, cause: 'effect' })
    })

    it('draw stops quietly when nothing is left', () => {
        const s = blank()
        s.hand = [mk({ fx: ['draw'], drawCount: 4 })]
        expect(applyMove(s, { type: 'play', handIndex: 0 }).state.hand).toHaveLength(1)
    })
})

describe('exile', () => {
    it('opens a pending choice that only exile and skipExile can resolve', () => {
        const s = blank()
        const a = mk()
        s.hand = [mk({ fx: ['exile'] }), a]
        s.row = [mk({ cost: 0 }), ...s.row.slice(1)]
        const pending = applyMove(s, { type: 'play', handIndex: 0 }).state
        expect(pending.pendingExile).toBe(true)
        expect(legalMoves(pending)).toEqual<Move[]>([
            { type: 'exile', handIndex: 0 },
            { type: 'exile', handIndex: 1 },
            { type: 'skipExile' },
        ])
        for (const move of [
            { type: 'take', rowIndex: 0 },
            { type: 'endTurn' },
            { type: 'redraw' },
            { type: 'play', handIndex: 1 },
        ] as Move[]) {
            expect(applyMove(pending, move).events).toEqual([{ type: 'rejected', reason: 'pendingExile' }])
        }
        const done = applyMove(pending, { type: 'exile', handIndex: 1 }).state
        expect(done.exile.map((c) => c.id)).toEqual([a.id])
        expect(done.stats.exiled).toBe(1)
        expect(done.pendingExile).toBe(false)
        expect(applyMove(pending, { type: 'skipExile' }).state.pendingExile).toBe(false)
    })

    it('does not open for an enemy defeat with an empty hand', () => {
        const s = blank()
        s.power = 5
        s.row = [enemy({ fx: ['exile'] }), ...s.row.slice(1)]
        expect(applyMove(s, { type: 'take', rowIndex: 0 }).state.pendingExile).toBe(false)
        s.hand = [mk()]
        expect(applyMove(s, { type: 'take', rowIndex: 0 }).state.pendingExile).toBe(true)
    })
})

describe('resources', () => {
    it('reap pays at end of turn per card on unspent leftovers', () => {
        const s = blank()
        s.hand = [mk({ fx: ['reapG'] }), mk({ fx: ['reapG'] }), mk({ fx: ['reapP'] })]
        s.gold = 7
        s.power = 5
        const { state, events } = applyMove(playAll(s, 0, 1, 2), { type: 'endTurn' })
        expect(state.hearts).toBe(2 * 2 + 2)
        expect(events.find((e) => e.type === 'reaped')).toMatchObject({ hearts: 6 })
        expect(state.reapGold + state.reapPower + state.gold + state.power).toBe(0)
        // Only the remainders (7 mod 3 and 5 mod 2) count as wasted; the rest was turned into hearts.
        expect(state.stats.wastedGold).toBe(1)
        expect(state.stats.wastedPower).toBe(1)
    })

    it('swap runs after the card gains', () => {
        const s = blank()
        s.hand = [mk({ gold: 2, fx: ['swap'] })]
        s.power = 1
        const done = playAll(s, 0)
        expect([done.gold, done.power]).toEqual([1, 2])
    })

    it('discounts floor costs at zero and reset at end of turn', () => {
        const s = blank()
        s.hand = [mk({ fx: ['cheap'] }), mk({ fx: ['weak'] })]
        const done = playAll(s, 0, 1)
        expect(cardCost(done, mk({ cost: 1 }))).toBe(0)
        expect(cardCost(done, enemy({ cost: 2 }))).toBe(1)
        expect(cardCost(done, enemy({ cost: 1, kind: 'enemy' }))).toBe(0)
        const next = applyMove(done, { type: 'endTurn' }).state
        expect(cardCost(next, mk({ cost: 3 }))).toBe(3)
    })

    it('coin flips use the flip stream only', () => {
        const s = blank()
        s.hand = [mk({ fx: ['coin'] })]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect([2, 4]).toContain(state.gold)
        expect(events.find((e) => e.type === 'coinFlipped')).toMatchObject({ gold: state.gold })
        expect(state.streams.gen).toEqual(s.streams.gen)
        expect(state.streams.flip).not.toEqual(s.streams.flip)
    })

    it('vault, basics and pile read the right piles', () => {
        const s = blank()
        s.exile = [mk(), mk(), mk(), mk()]
        s.deck = [basicCard(), basicCard()]
        s.hand = [basicCard(), mk({ fx: ['vault'] }), mk({ fx: ['basics'] }), mk({ fx: ['pile'] })]
        s.discard = [basicCard(), basicCard(), mk(), mk(), mk(), mk()]
        const done = playAll(s, 1, 2, 3)
        expect([done.hearts, done.gold, done.power]).toEqual([1, 1, 2])
    })
})

describe('enemies', () => {
    it('foes counts the row on play but includes the defeated enemy on defeat', () => {
        const s = blank()
        s.row = [enemy(), enemy({ fx: ['foes'], cost: 1 }), mk(), mk(), enemy()]
        s.hand = [mk({ type: 'ember', fx: ['foes'], main: 'power' })]
        expect(playAll(s, 0).power).toBe(3)
        s.power = 1
        const { state, events } = applyMove(s, { type: 'take', rowIndex: 1 })
        expect(state.power).toBe(3)
        expect(events.find((e) => e.type === 'defeated')).toMatchObject({ paid: 1, gains: { power: 3, hearts: 1, gold: 0 } })
    })

    it('defeating gives hearts, refills at index 0 and shifts the cards on its left', () => {
        const s = blank()
        const [c0, c1, c2, c3, c4] = [mk(), mk(), enemy({ hearts: 3, cost: 2 }), mk(), mk()]
        s.row = [c0, c1, c2, c3, c4]
        s.power = 2
        const { state, events } = applyMove(s, { type: 'take', rowIndex: 2 })
        expect(state.hearts).toBe(3)
        expect(state.power).toBe(0)
        expect(state.row.slice(1).map((c) => c.id)).toEqual([c0.id, c1.id, c3.id, c4.id])
        expect(eventTypes(events)).toEqual(['defeated', 'rowRefilled'])
        expect(state.row[0]!.id).toBe((events[1] as { card: { id: number } }).card.id)
    })

    it('recruiting pays the discounted cost and sends the card to discard', () => {
        const s = blank()
        const target = mk({ cost: 4 })
        s.row = [target, ...s.row.slice(1)]
        s.gold = 3
        expect(applyMove(s, { type: 'take', rowIndex: 0 }).events).toEqual([
            { type: 'rejected', reason: 'cannotAfford', short: 1, currency: 'gold' },
        ])
        s.recruitDiscount = 1
        const { state } = applyMove(s, { type: 'take', rowIndex: 0 })
        expect(state.gold).toBe(0)
        expect(state.discard.map((c) => c.id)).toEqual([target.id])
    })
})

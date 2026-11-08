import { describe, expect, it } from 'vitest'
import { EFFECT_BY_ID, EFFECT_FAMILIES, EFFECTS, applyMove, cardCost, legalMoves } from '../../src/core'
import type { GameState, Move } from '../../src/core'
import { basicCard, blank, enemy, eventTypes, mk } from './helpers'

function playAll(state: GameState, ...indexes: number[]): GameState {
    let s = state
    for (const handIndex of indexes) s = applyMove(s, { type: 'play', handIndex }).state
    return s
}

describe('effect registry', () => {
    it('has one entry per effect id, with draw priced per card', () => {
        expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(24)
        expect(EFFECT_BY_ID.draw.perDrawCard).toBe(true)
        expect(EFFECTS.filter((e) => !e.enemies).map((e) => e.id)).toEqual(['all3', 'bond', 'kin', 'army', 'echo'])
    })

    it('puts every effect in a listed family', () => {
        const listed = EFFECT_FAMILIES.map((family) => family.id)
        for (const effect of EFFECTS) expect(listed, effect.id).toContain(effect.family)
        for (const family of listed)
            expect(
                EFFECTS.some((e) => e.family === family),
                family,
            ).toBe(true)
    })

    it('writes the sentence of an effect once, for a card and for the generator list', () => {
        const hoard = mk({ fx: ['hoard'], fxParams: { amount: 2, perCards: 5, currency: 'power' } })
        expect(EFFECT_BY_ID.hoard.describe(hoard)).toBe('+2 ⚔ per 5 cards in your deck')
        expect(EFFECT_BY_ID.hoard.describe()).toBe('+[1-2] [●/⚔] per [4-6] cards in your deck')
        expect(EFFECT_BY_ID.flip.describe()).toBe('+2 or +4 [●/⚔]')
        expect(EFFECT_BY_ID.kin.describe()).toBe('+1 [●/⚔/♥] per other [Moss/Ember/Tide] card played this turn')
        expect(EFFECT_BY_ID.kin.describe(mk({ type: 'ember', main: 'power', fx: ['kin'] }))).toBe(
            '+1 ⚔ per other Ember card played this turn',
        )
    })

    // A tripwire: a new or changed effect fails here until its needs are decided on purpose. The generator and the custom
    // generator dialog read these fields, so a wrong table means dead effects (or missing ones) in limited generators.
    it('declares what each effect needs from a generator', () => {
        expect(Object.fromEntries(EFFECTS.map((e) => [e.id, e.needs ?? []]))).toEqual({
            draw: [],
            flip: [],
            exile: [],
            cheap: ['gold'],
            foes: ['foe', 'power'],
            all3: ['moss', 'ember', 'tide', 'hearts'],
            vault: ['exile', 'hearts'],
            basics: [],
            pile: [],
            hoard: [],
            bulk: ['foe', 'power'],
            bond: [],
            kin: [],
            weak: ['foe', 'power'],
            army: [],
            cycle: [],
            redraw: [],
            swap: ['gold', 'power'],
            reapG: ['gold', 'hearts'],
            reapP: ['power', 'hearts'],
            reload: ['foe'],
            push: ['foe'],
            shift: [],
            echo: [],
        })
        expect(Object.fromEntries(EFFECTS.map((e) => [e.id, e.needsAny ?? []]))).toMatchObject({
            flip: ['gold', 'power'],
            basics: ['gold', 'power'],
            pile: ['gold', 'power'],
            hoard: ['gold', 'power'],
            kin: ['moss', 'ember', 'tide'],
            bond: ['moss', 'ember', 'tide'],
            army: ['moss', 'ember', 'tide'],
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
        const bonded = () => mk({ type: 'moss', fx: ['bond'], fxParams: { bondCount: 2 } })
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
        s.hand = [mk(), mk(), mk(), mk({ type: 'ember' }), mk({ fx: ['kin'], fxParams: { currency: 'power' } })]
        expect(playAll(s, 0, 1, 3, 4).power).toBe(2)
    })

    it('army counts the card type in deck, hand and discard but not exile', () => {
        const s = blank()
        const tide = (n: number) => Array.from({ length: n }, () => mk({ type: 'tide' }))
        s.hand = [mk({ type: 'tide', fx: ['army'], fxParams: { currency: 'gold' } })]
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
        expect(events.find((e) => e.type === 'cycled')).toMatchObject({ count: 1, redraw: false })
    })

    it('cycle keeps Retain and played cards, redraw discards unplayed Retain too', () => {
        const build = (fx: 'cycle' | 'redraw') => {
            const s = blank()
            s.hand = [mk({ gold: 1 }), mk({ fx: [fx] }), mk({ retain: true }), mk()]
            s.deck = [mk(), mk(), mk()]
            return playAll(s, 0, 1)
        }
        expect(build('cycle').hand).toHaveLength(2 + 1 + 1)
        expect(build('cycle').hand.some((c) => c.retain)).toBe(true)
        expect(build('redraw').hand.some((c) => c.retain)).toBe(false)
        expect(build('redraw').hand).toHaveLength(2 + 2)
    })

    it('draw reshuffles the discard when the deck runs out', () => {
        const s = blank()
        s.hand = [mk({ fx: ['draw'], fxParams: { drawCount: 3 } })]
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
        s.hand = [mk({ fx: ['draw'], fxParams: { drawCount: 4 } })]
        expect(applyMove(s, { type: 'play', handIndex: 0 }).state.hand).toHaveLength(1)
    })
})

describe('exile', () => {
    it('opens a pending choice that only exile and skipExile can resolve', () => {
        const s = blank()
        const a = mk()
        s.hand = [mk({ fx: ['exile'] }), a]
        s.row = [enemy(), enemy(), enemy(), enemy(), enemy()]
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
            { type: 'flush' },
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

    it('lists a river recruit as an additional exile target', () => {
        const s = blank()
        s.hand = [mk({ fx: ['exile'] })]
        s.row = [mk(), enemy(), enemy(), enemy(), enemy()]
        const pending = applyMove(s, { type: 'play', handIndex: 0 }).state
        expect(pending.pendingExile).toBe(true)
        expect(legalMoves(pending)).toEqual<Move[]>([
            { type: 'exile', handIndex: 0 },
            { type: 'exile', rowIndex: 0 },
            { type: 'skipExile' },
        ])
    })

    it('opens only when an enemy defeat leaves an exile target', () => {
        const s = blank()
        s.power = 5
        s.row = [enemy({ fx: ['exile'] }), ...s.row.slice(1)]
        const result = applyMove(s, { type: 'take', rowIndex: 0 }).state
        expect(result.pendingExile).toBe(result.row.slice(0, -1).some((card) => card.kind === 'recruit'))
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

    it('discount amounts stack', () => {
        const s = blank()
        s.hand = [mk({ fx: ['cheap'], fxParams: { amount: 2 } }), mk({ fx: ['weak'], fxParams: { amount: 2 } }), mk({ fx: ['weak'] })]
        const done = playAll(s, 0, 1, 2)
        expect(cardCost(done, mk({ cost: 5 }))).toBe(3)
        expect(cardCost(done, enemy({ cost: 5 }))).toBe(2)
    })

    it('flips use the flip stream only', () => {
        const s = blank()
        s.hand = [mk({ fx: ['flip'] })]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect([2, 4]).toContain(state.gold)
        expect(events.find((e) => e.type === 'flipped')).toMatchObject({ currency: 'gold', amount: state.gold })
        expect(state.streams.gen).toEqual(s.streams.gen)
        expect(state.streams.flip).not.toEqual(s.streams.flip)
    })

    it('vault, basics and pile read the right piles', () => {
        const s = blank()
        s.exile = [mk(), mk(), mk(), mk()]
        s.deck = [basicCard(), basicCard()]
        s.hand = [
            basicCard(),
            mk({ fx: ['vault'] }),
            mk({ fx: ['basics'], fxParams: { currency: 'gold' } }),
            mk({ fx: ['pile'], fxParams: { currency: 'power' } }),
        ]
        s.discard = [basicCard(), basicCard(), mk(), mk(), mk(), mk()]
        const done = playAll(s, 1, 2, 3)
        expect([done.hearts, done.gold, done.power]).toEqual([1, 1, 2])
    })

    it('supports parameterized output currencies', () => {
        const s = blank()
        s.deck = [basicCard(), basicCard(), basicCard(), basicCard()]
        s.discard = [mk(), mk(), mk()]
        s.hand = [
            mk({ type: 'tide' }),
            mk({ type: 'tide', fx: ['kin'], fxParams: { currency: 'hearts' } }),
            mk({ fx: ['basics'], fxParams: { currency: 'power' } }),
            mk({ fx: ['pile'], fxParams: { currency: 'gold' } }),
        ]
        const done = playAll(s, 0, 1, 2, 3)
        expect(done.hearts).toBe(1)
        expect(done.power).toBe(1)
        expect(done.gold).toBe(1)
    })

    it('hoard counts the whole deck, hand and discard, and multiplies by its amount', () => {
        const s = blank()
        s.deck = Array.from({ length: 5 }, () => basicCard())
        s.discard = Array.from({ length: 5 }, () => basicCard())
        s.exile = [basicCard(), basicCard(), basicCard()]
        s.hand = [mk({ fx: ['hoard'], fxParams: { currency: 'power', amount: 2, perCards: 4 } })]
        expect(playAll(s, 0).power).toBe(4)
    })
})

describe('bulk', () => {
    it('lowers the enemy cost by 1 per step of cards in the deck, never below 0', () => {
        const s = blank()
        const bulky = enemy({ cost: 5, fx: ['bulk'], fxParams: { costPerCards: 4 } })
        s.hand = Array.from({ length: 9 }, () => basicCard())
        expect(cardCost(s, bulky)).toBe(3)
        s.discard = Array.from({ length: 12 }, () => basicCard())
        expect(cardCost(s, bulky)).toBe(0)
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

    it('reports a Flip on a defeated enemy in the defeat event', () => {
        const s = blank()
        s.power = 1
        s.row = [enemy({ cost: 1, fx: ['flip'], fxParams: { currency: 'gold' } }), ...s.row.slice(1)]
        const { state, events } = applyMove(s, { type: 'take', rowIndex: 0 })
        expect([2, 4]).toContain(state.gold)
        expect(events.find((event) => event.type === 'defeated')).toMatchObject({ gains: { gold: state.gold, power: 0, hearts: 1 } })
    })

    it('reports direct enemy gains in the defeat event', () => {
        const s = blank()
        s.power = 1
        s.row = [enemy({ cost: 1, gold: 2, power: 1 }), ...s.row.slice(1)]
        const { state, events } = applyMove(s, { type: 'take', rowIndex: 0 })
        expect([state.gold, state.power]).toEqual([2, 1])
        expect(events.find((event) => event.type === 'defeated')).toMatchObject({
            gains: { gold: 2, power: 1, hearts: 1 },
        })
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

describe('reload', () => {
    it('draws one card per enemy defeated this turn, up to its limit', () => {
        const s = blank()
        s.power = 3
        s.deck = [mk(), mk(), mk(), mk(), mk()]
        s.row = [enemy({ cost: 1 }), enemy({ cost: 1 }), enemy({ cost: 1 }), mk(), mk()]
        s.hand = [mk({ fx: ['reload'] })]
        const first = applyMove(s, { type: 'take', rowIndex: 0 }).state
        const second = applyMove(first, { type: 'take', rowIndex: 1 }).state
        expect(first.defeatedThisTurn).toBe(1)
        expect(applyMove(first, { type: 'play', handIndex: 0 }).state.hand).toHaveLength(2)
        expect(applyMove(second, { type: 'play', handIndex: 0 }).state.hand).toHaveLength(3)
    })

    it('counts the enemy that carries it, and starts again every turn', () => {
        const s = blank()
        s.power = 1
        s.deck = [mk(), mk()]
        s.row = [enemy({ cost: 1, fx: ['reload'] }), ...s.row.slice(1)]
        const done = applyMove(s, { type: 'take', rowIndex: 0 }).state
        expect(done.hand).toHaveLength(1)
        expect(applyMove(done, { type: 'endTurn' }).state.defeatedThisTurn).toBe(0)
    })
})

describe('push', () => {
    it('moves the right-most enemy to the left end, even when a recruit is on the edge', () => {
        const s = blank()
        const [a, b, c, d, e] = [enemy(), mk(), enemy(), mk(), mk()]
        s.row = [a, b, c, d, e]
        s.hand = [mk({ fx: ['push'] })]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect(state.row.map((card) => card.id)).toEqual([c.id, a.id, b.id, d.id, e.id])
        expect(events.find((event) => event.type === 'pushed')).toMatchObject({ card: { id: c.id } })
    })

    it('does nothing when the right-most enemy is already at the left end or there is none', () => {
        const s = blank()
        s.row = [enemy(), mk(), mk(), mk(), mk()]
        s.hand = [mk({ fx: ['push'] })]
        const before = s.row.map((card) => card.id)
        expect(applyMove(s, { type: 'play', handIndex: 0 }).state.row.map((card) => card.id)).toEqual(before)
        s.row = [mk(), mk(), mk(), mk(), mk()]
        expect(eventTypes(applyMove(s, { type: 'play', handIndex: 0 }).events)).not.toContain('pushed')
    })

    it('saves the edge enemy from escaping', () => {
        const s = blank()
        s.row = [mk(), mk(), mk(), mk(), enemy({ hearts: 4 })]
        s.hand = [mk({ fx: ['push'] })]
        const { state } = applyMove(applyMove(s, { type: 'play', handIndex: 0 }).state, { type: 'endTurn' })
        expect(state.hearts).toBe(0)
    })
})

describe('shift', () => {
    it('drops the right-edge card and enters new cards on the left, once per shift', () => {
        const s = blank()
        s.row = [mk(), mk(), mk(), enemy({ hearts: 3 }), enemy({ hearts: 2 })]
        const kept = s.row.slice(0, 3).map((card) => card.id)
        s.hand = [mk({ fx: ['shift'], fxParams: { shiftCount: 2 } })]
        const { state, events } = applyMove(s, { type: 'play', handIndex: 0 })
        expect(state.row).toHaveLength(5)
        expect(state.row.slice(2).map((card) => card.id)).toEqual(kept)
        expect(state.hearts).toBe(-5)
        expect(state.stats.lostToEscapes).toBe(5)
        expect(eventTypes(events).filter((type) => type === 'rowRefilled')).toHaveLength(2)
    })

    it('loses nothing when the edge is a recruit', () => {
        const s = blank()
        s.row = [mk(), mk(), mk(), mk(), mk()]
        s.hand = [mk({ fx: ['shift'] })]
        expect(applyMove(s, { type: 'play', handIndex: 0 }).state.hearts).toBe(0)
    })
})

describe('echo', () => {
    it('repeats the effects and the gains of the card played just before', () => {
        const s = blank()
        s.deck = [mk(), mk(), mk(), mk()]
        s.hand = [mk({ gold: 1, fx: ['draw'], fxParams: { drawCount: 2 } }), mk({ fx: ['echo'] })]
        const done = playAll(s, 0, 1)
        expect(done.hand).toHaveLength(2 + 2 + 2)
        expect(done.gold).toBe(2)
    })

    it('repeats the hearts, gains and effects of the enemy defeated just before', () => {
        const s = blank()
        s.power = 1
        s.deck = [mk(), mk()]
        s.row = [enemy({ cost: 1, hearts: 3, gold: 2, fx: ['draw'], fxParams: { drawCount: 1 } }), ...s.row.slice(1)]
        s.hand = [mk({ fx: ['echo'] })]
        const defeated = applyMove(s, { type: 'take', rowIndex: 0 }).state
        const done = applyMove(defeated, { type: 'play', handIndex: 0 }).state
        expect([done.hearts, done.gold]).toEqual([6, 4])
        expect(done.hand).toHaveLength(1 + 1 + 1)
        expect(done.stats.heartsFrom.echo).toBe(3)
    })

    it('does nothing as the first card, and a second Echo repeats the first one without its effect', () => {
        const first = blank()
        first.hand = [mk({ fx: ['echo'] })]
        const { events } = applyMove(first, { type: 'play', handIndex: 0 })
        expect(events.find((event) => event.type === 'echoed')).toMatchObject({ card: null })
        const chain = blank()
        chain.deck = [mk(), mk()]
        chain.hand = [
            mk({ gold: 1, fx: ['draw'], fxParams: { drawCount: 1 } }),
            mk({ gold: 1, fx: ['echo'] }),
            mk({ gold: 1, fx: ['echo'] }),
        ]
        const done = playAll(chain, 0, 1, 2)
        expect(done.hand).toHaveLength(3 + 1 + 1)
        expect(done.gold).toBe(5)
    })

    it('repeats Exile, which asks again, and Bond, which counts the card just played as its type', () => {
        const s = blank()
        s.hand = [mk({ fx: ['exile'] }), mk({ fx: ['echo'] }), mk()]
        const afterExile = applyMove(playAll(s, 0), { type: 'skipExile' }).state
        expect(applyMove(afterExile, { type: 'play', handIndex: 1 }).state.pendingExile).toBe(true)
        const bond = blank()
        bond.hand = [mk({ type: 'moss', fx: ['bond'], fxParams: { bondCount: 2 } }), mk({ type: 'moss', fx: ['echo'] })]
        expect(playAll(bond, 0, 1).gold).toBe(2)
    })
})

import { describe, expect, it } from 'vitest'
import { EFFECT_BY_ID, EFFECTS, LONG_MODE, makeCard, newGame, SIMPLE_MODE, standardMode, unmetNeeds } from '../../src/core'
import type { Card, GeneratorConfig, ModeConfig } from '../../src/core'
import { BOND_EXTRA_PRICE, RETAIN_PRICE } from '../../src/core/generator/budget'

const PER_TURN = 400

/** A Level 1 mode whose generator allows everything except what the test overrides. */
function limited(generator: Partial<GeneratorConfig>): ModeConfig {
    return {
        ...standardMode(0),
        generator: {
            allowedTypes: ['moss', 'ember', 'tide', 'foe'],
            allowedResources: ['gold', 'power', 'hearts'],
            allowedEffects: EFFECTS.map((e) => e.id),
            ...generator,
        },
    }
}

function spentBudget(card: Card): number {
    let spent = card.gold + card.power + card.hearts * 1.5
    for (const id of card.fx) {
        const effect = EFFECT_BY_ID[id]
        spent += effect.perDrawCard ? effect.price * (card.drawCount ?? 1) : effect.price
        if (id === 'bond') spent += BOND_EXTRA_PRICE[(card.bondCount ?? 1) - 1]!
    }
    return spent + (card.retain ? RETAIN_PRICE : 0)
}

function check(mode: ModeConfig, turns: number): number {
    const state = newGame(mode, 11).state
    let count = 0
    for (let turn = 1; turn <= turns; turn++) {
        for (let i = 0; i < PER_TURN; i++, count++) {
            const card = makeCard(state, turn)
            const enemy = card.kind === 'enemy'
            expect(card.fx.length).toBeLessThanOrEqual(1)
            expect(card.cost).toBeGreaterThanOrEqual(enemy ? 1 : 2)
            const spent = spentBudget(card)
            const budgetAt = (cost: number) => (enemy ? cost * 1.4 : cost * 0.85 + 0.3) + 1e-6
            const minCost = enemy ? 1 : 2
            if (card.cost > minCost) {
                // An enemy always gets one free heart after its budget is spent, so only recruits are held to the upper bound.
                if (!enemy) expect(spent).toBeLessThanOrEqual(budgetAt(card.cost))
                expect(spent).toBeGreaterThan(budgetAt(card.cost - 1))
            }
            if (enemy) {
                expect(card.hearts).toBeGreaterThanOrEqual(1)
                expect([card.gold, card.power, card.retain]).toEqual([0, 0, undefined])
                expect(card.type).toBe('foe')
            } else {
                expect(card.gold + card.power + card.hearts + card.fx.length).toBeGreaterThan(0)
                expect(spentBudget(card)).toBeLessThanOrEqual(card.cost * 0.85 + 0.3 + 1e-6)
            }
            for (const id of card.fx) {
                expect(EFFECTS.map((e) => e.id)).toContain(id)
                if (enemy) expect(EFFECT_BY_ID[id].enemies).toBe(true)
                if (card.retain) expect(EFFECT_BY_ID[id].retainable).toBe(true)
            }
            if (card.drawCount !== undefined) expect(card.drawCount).toBeLessThanOrEqual(4)
            if (card.bondCount !== undefined) expect(card.fx).toEqual(['bond'])
            if (card.kinCurrency !== undefined) expect(['kin', 'army']).toContain(card.fx[0])
        }
    }
    return count
}

describe('makeCard', () => {
    it('keeps budget, cost and pool invariants over thousands of cards', () => {
        expect(check(standardMode(0), 24) + check(LONG_MODE, 42)).toBeGreaterThan(20000)
    })

    it('caps cost rolls by turn and adds long-run cost bonus', () => {
        const maxCost = (mode: ModeConfig, turn: number) => {
            const state = newGame(mode, 3).state
            return Math.max(
                ...Array.from({ length: 2000 }, () => makeCard(state, turn))
                    .filter((c) => c.kind === 'recruit')
                    .map((c) => c.cost),
            )
        }
        expect(maxCost(standardMode(0), 24)).toBeLessThanOrEqual(11)
        expect(maxCost(standardMode(0), 60)).toBeLessThanOrEqual(11)
        expect(maxCost(LONG_MODE, 40)).toBeGreaterThan(11)
    })

    it('makes only plain cards when no effects are allowed', () => {
        const state = newGame(SIMPLE_MODE, 5).state
        for (let turn = 1; turn <= 24; turn++) {
            for (let i = 0; i < 200; i++) expect(makeCard(state, turn).fx).toEqual([])
        }
        expect(state.row.every((c) => c.fx.length === 0)).toBe(true)
    })

    it('never makes a banned card type, and makes only enemies when no recruit types are allowed', () => {
        const noTide = newGame(limited({ allowedTypes: ['moss', 'ember', 'foe'], allowedEffects: [] }), 5).state
        const noFoes = newGame(limited({ allowedTypes: ['tide'], allowedEffects: [] }), 5).state
        const onlyFoes = newGame(limited({ allowedTypes: ['foe'], allowedEffects: [] }), 5).state
        for (let i = 0; i < 500; i++) {
            expect(makeCard(noTide, 3).type).not.toBe('tide')
            expect(makeCard(noFoes, 3).type).toBe('tide')
            expect(makeCard(onlyFoes, 3).type).toBe('foe')
        }
    })

    it('keeps the generated sequence the same for the same seed', () => {
        const a = newGame(SIMPLE_MODE, 9).state
        const b = newGame(SIMPLE_MODE, 9).state
        expect(a.row.map((c) => c.id)).toEqual(b.row.map((c) => c.id))
        expect(a.row).toEqual(b.row)
    })

    it('makes the same cards with no generator as with a generator that allows everything', () => {
        const plain = newGame(standardMode(0), 21).state
        const open = newGame(limited({}), 21).state
        for (let turn = 1; turn <= 24; turn++) {
            for (let i = 0; i < 100; i++) expect(makeCard(open, turn)).toEqual(makeCard(plain, turn))
        }
    })

    it('makes no power and no enemies when power is off, and no hearts on recruits when hearts are off', () => {
        const noPower = newGame(limited({ allowedResources: ['gold', 'hearts'] }), 4).state
        const noHearts = newGame(limited({ allowedResources: ['gold', 'power'] }), 4).state
        for (let turn = 1; turn <= 24; turn++) {
            for (let i = 0; i < 100; i++) {
                const a = makeCard(noPower, turn)
                expect(a.power).toBe(0)
                expect(a.kind).toBe('recruit')
                expect(a.kinCurrency ?? 'gold').toBe('gold')
                const b = makeCard(noHearts, turn)
                expect(b.hearts).toBe(0)
                expect(b.kind).toBe('recruit')
            }
        }
    })

    it('can make a power-only deck: no gold on cards, only enemies when only enemies are allowed', () => {
        const noGold = newGame(limited({ allowedResources: ['power', 'hearts'] }), 4).state
        const attackOnly = newGame(limited({ allowedTypes: ['foe'], allowedResources: ['power', 'hearts'] }), 4).state
        for (let turn = 1; turn <= 24; turn++) {
            for (let i = 0; i < 100; i++) {
                const a = makeCard(noGold, turn)
                expect(a.gold).toBe(0)
                expect(a.kinCurrency ?? 'power').toBe('power')
                const b = makeCard(attackOnly, turn)
                expect(b.kind).toBe('enemy')
                expect(b.gold).toBe(0)
            }
        }
    })

    it('skips effects whose needs are off', () => {
        const rolled = (generator: Partial<GeneratorConfig>) => {
            const state = newGame(limited(generator), 6).state
            const ids = new Set<string>()
            for (let turn = 1; turn <= 24; turn++) for (let i = 0; i < 300; i++) for (const id of makeCard(state, turn).fx) ids.add(id)
            return ids
        }
        const noPower = rolled({ allowedResources: ['gold', 'hearts'] })
        for (const id of ['swap', 'pile', 'reapP', 'foes', 'weak']) expect(noPower.has(id)).toBe(false)
        expect(noPower.has('reapG')).toBe(true)
        const noEmber = rolled({ allowedTypes: ['moss', 'tide', 'foe'] })
        expect(noEmber.has('all3')).toBe(false)
        const noExile = rolled({ allowedEffects: EFFECTS.map((e) => e.id).filter((id) => id !== 'exile') })
        expect(noExile.has('vault')).toBe(false)
        expect(unmetNeeds({ allowedTypes: ['moss'], allowedResources: ['gold'], allowedEffects: [] }, 'swap')).toEqual(['power'])
        expect(unmetNeeds(undefined, 'swap')).toEqual([])
    })
})

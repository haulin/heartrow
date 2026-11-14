import { describe, expect, it } from 'vitest'
import { EFFECT_BY_ID, EFFECTS, LONG_MODE, makeCard, newGame, standardMode, unmetNeeds } from '../../src/core'
import type { Card, Colour, EffectId, GeneratorConfig, ModeConfig } from '../../src/core'
import { scaleTerms, tierPrice } from '../../src/core/effects/tiers'
import { countGainPrice } from '../../src/core/effects/countGain'
import {
    ALL3_PRICE_FACTOR,
    COUNT_GAIN_TERMS,
    RECRUIT_BUDGET_BASE,
    REFERENCE_DECK_SIZE,
    RESOURCE_PRICE,
    RETAIN_PRICE,
    TIER_TERMS,
} from '../../src/core/generator/budget'

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

/** Which tier terms price an effect, and which `fxParams` field holds the rolled tier. */
const TIERED_EFFECTS: Partial<Record<string, { terms: keyof typeof TIER_TERMS; param: 'amount' | 'bondCount' | 'drawCount' }>> = {
    draw: { terms: 'draw', param: 'drawCount' },
    weak: { terms: 'discount', param: 'amount' },
    cheap: { terms: 'discount', param: 'amount' },
    exile: { terms: 'exile', param: 'amount' },
    flip: { terms: 'flip', param: 'amount' },
    bond: { terms: 'bond', param: 'bondCount' },
}

function spentBudget(card: Card): number {
    let spent = card.gold + card.power + card.hearts * 1.5
    for (const id of card.fx) {
        spent += effectSpend(card, id)
    }
    return spent + (card.retain ? RETAIN_PRICE : 0)
}

/** What one effect of the card costs, with a payout effect priced in the resource it rolled. */
function effectSpend(card: Card, id: EffectId): number {
    const effect = EFFECT_BY_ID[id]
    const factor = RESOURCE_PRICE[card.fxParams?.currency ?? 'gold']
    const tiered = TIERED_EFFECTS[id]
    if (id === 'all3') return all3RolledPrice(card)
    if (id in COUNT_GAIN_TERMS) return countGainRolledPrice(id as keyof typeof COUNT_GAIN_TERMS, card, factor)
    if (tiered) return tierPrice(scaleTerms(TIER_TERMS[tiered.terms], factor), card.fxParams?.[tiered.param] ?? 1)
    if (id === 'shift') return effect.price * (card.fxParams?.shiftCount ?? 1)
    return effect.price * factor
}

function all3RolledPrice(card: Card): number {
    const resource = card.fxParams?.currency ?? 'hearts'
    return Math.round(ALL3_PRICE_FACTOR * (card.fxParams?.amount ?? 2) * RESOURCE_PRICE[resource] * 10) / 10
}

function countGainRolledPrice(id: keyof typeof COUNT_GAIN_TERMS, card: Card, factor: number): number {
    const terms = COUNT_GAIN_TERMS[id]
    const { amount = 1, perCards = terms.defaultPerCards } = card.fxParams ?? {}
    return countGainPrice(terms, amount, perCards, factor)
}

/** Bulk prints a cost premium on top of the cost the budget was fitted to. */
function fittedCost(card: Card): number {
    return card.cost - (card.fxParams?.costPerCards ? Math.floor(REFERENCE_DECK_SIZE / card.fxParams.costPerCards) : 0)
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
            const recruitBase = enemy ? 0 : RECRUIT_BUDGET_BASE[card.type as Colour]
            const budgetAt = (cost: number) => (enemy ? cost * 1.4 : cost * 0.85 + recruitBase) + 1e-6
            const minCost = enemy ? 1 : 2
            const cost = fittedCost(card)
            if (cost > minCost) {
                if (!enemy) expect(spent).toBeLessThanOrEqual(budgetAt(cost))
                expect(spent).toBeGreaterThan(budgetAt(cost - 1))
            }
            if (enemy) {
                expect(card.hearts).toBeGreaterThanOrEqual(1)
                // The gain is a share of the cost rolled before the budget was fitted, and fitting can lower the cost by up to two.
                expect(card.gold + card.power).toBeLessThanOrEqual(Math.max(1, Math.floor((cost + 2) * 0.4)))
                expect(card.retain).toBeUndefined()
                expect(card.type).toBe('foe')
            } else {
                expect(card.gold + card.power + card.hearts + card.fx.length).toBeGreaterThan(0)
                expect(spentBudget(card)).toBeLessThanOrEqual(card.cost * 0.85 + recruitBase + 1e-6)
            }
            for (const id of card.fx) {
                expect(EFFECTS.map((e) => e.id)).toContain(id)
                if (enemy) expect(EFFECT_BY_ID[id].enemies).toBe(true)
                if (!enemy) expect(EFFECT_BY_ID[id].enemyOnly).toBeUndefined()
                if (card.retain) expect(EFFECT_BY_ID[id].retain).toBeDefined()
            }
            if (card.fxParams?.drawCount !== undefined) expect(card.fxParams.drawCount).toBeLessThanOrEqual(4)
            if (card.fxParams?.bondCount !== undefined) expect(card.fx).toEqual(['bond'])
            if (card.fxParams?.currency !== undefined)
                expect(['kin', 'army', 'basics', 'pile', 'hoard', 'flip', 'bond', 'all3']).toContain(card.fx[0])
            if (card.fxParams?.costPerCards !== undefined) expect(card.fx).toEqual(['bulk'])
        }
    }
    return count
}

function effectCount(generator: Partial<GeneratorConfig>): number {
    const state = newGame(limited(generator), 17).state
    let count = 0
    for (let i = 0; i < 4000; i++) if (makeCard(state, 24).fx.length > 0) count++
    return count
}

describe('makeCard', () => {
    it('gives every recruit effect Retain terms', () => {
        for (const effect of EFFECTS.filter((e) => !e.enemyOnly)) expect(effect.retain, effect.id).toBeDefined()
    })

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
        const state = newGame(limited({ allowedEffects: [] }), 5).state
        for (let turn = 1; turn <= 24; turn++) {
            for (let i = 0; i < 200; i++) expect(makeCard(state, turn).fx).toEqual([])
        }
        expect(state.row.every((c) => c.fx.length === 0)).toBe(true)
    })

    it('reduces effect density for a narrow effect pool', () => {
        const all = effectCount({})
        const narrow = effectCount({ allowedEffects: ['exile'] })
        expect(all).toBeGreaterThan(1200)
        expect(narrow).toBeGreaterThan(300)
        expect(narrow).toBeLessThan(all / 2)
    })

    it('occasionally gives enemies a scaled alternate resource', () => {
        const state = newGame(
            limited({
                allowedTypes: ['foe'],
                allowedResources: ['gold', 'power', 'hearts'],
                allowedEffects: [],
            }),
            23,
        ).state
        const cards = Array.from({ length: 2000 }, () => makeCard(state, 24))
        const alternate = cards.filter((card) => card.gold + card.power > 0)
        expect(alternate.length).toBeGreaterThan(200)
        expect(alternate.length).toBeLessThan(400)
        for (const card of alternate) expect(card.gold + card.power).toBe(Math.max(1, Math.floor(card.cost * 0.4)))
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
        const a = newGame(limited({ allowedEffects: [] }), 9).state
        const b = newGame(limited({ allowedEffects: [] }), 9).state
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
                expect(['gold', 'hearts']).toContain(a.fxParams?.currency ?? 'gold')
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
                expect(['power', 'hearts']).toContain(a.fxParams?.currency ?? 'power')
                const b = makeCard(attackOnly, turn)
                expect(b.kind).toBe('enemy')
                expect(b.gold).toBe(0)
            }
        }
    })

    it('gives about one plain recruit in ten Retain, and none when the keyword is off', () => {
        const retainShare = (generator: Partial<GeneratorConfig>) => {
            const state = newGame(limited(generator), 4).state
            let plain = 0
            let kept = 0
            let keptOnEnemy = 0
            for (let turn = 1; turn <= 24; turn++) {
                for (let i = 0; i < 300; i++) {
                    const card = makeCard(state, turn)
                    if (card.kind === 'enemy') keptOnEnemy += card.retain ? 1 : 0
                    else if (card.fx.length === 0) {
                        plain++
                        kept += card.retain ? 1 : 0
                    }
                }
            }
            expect(keptOnEnemy).toBe(0)
            return kept / plain
        }
        expect(retainShare({})).toBeGreaterThan(0.07)
        expect(retainShare({})).toBeLessThan(0.13)
        expect(retainShare({ allowedKeywords: [] })).toBe(0)
    })

    it('skips effects whose needs are off', () => {
        const rolled = (generator: Partial<GeneratorConfig>) => {
            const state = newGame(limited(generator), 6).state
            const ids = new Set<string>()
            for (let turn = 1; turn <= 24; turn++) for (let i = 0; i < 300; i++) for (const id of makeCard(state, turn).fx) ids.add(id)
            return ids
        }
        const noPower = rolled({ allowedResources: ['gold', 'hearts'] })
        for (const id of ['swap', 'reapP', 'foes', 'weak']) expect(noPower.has(id)).toBe(false)
        expect(noPower.has('reapG')).toBe(true)
        const noEmber = rolled({ allowedTypes: ['moss', 'tide', 'foe'] })
        expect(noEmber.has('all3')).toBe(false)
        const noExile = rolled({ allowedEffects: EFFECTS.map((e) => e.id).filter((id) => id !== 'exile') })
        expect(noExile.has('vault')).toBe(false)
        expect(unmetNeeds({ allowedTypes: ['moss'], allowedResources: ['gold'], allowedEffects: [] }, 'swap')).toEqual(['power'])
        expect(unmetNeeds(undefined, 'swap')).toEqual([])
    })
})

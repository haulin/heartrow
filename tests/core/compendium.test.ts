import { describe, expect, it } from 'vite-plus/test'
import { EFFECTS, EFFECT_BY_ID, GENERATION, exampleCard, priceTable } from '../../src/core'

describe('compendium data', () => {
    it('gives every effect a blurb', () => {
        for (const effect of EFFECTS) expect(effect.blurb.trim().length, effect.id).toBeGreaterThan(20)
    })

    it('makes a real example card for every effect, the same one for the same seed', () => {
        for (const effect of EFFECTS) {
            const card = exampleCard(effect.id, 1)
            expect(card, effect.id).not.toBeNull()
            expect(card!.fx, effect.id).toContain(effect.id)
            expect(exampleCard(effect.id, 1)).toEqual(card)
        }
    })

    it('rolls another card for another seed', () => {
        const texts = new Set(Array.from({ length: 12 }, (_, seed) => JSON.stringify(exampleCard('flip', seed))))
        expect(texts.size).toBeGreaterThan(1)
    })

    it('reads the price of every roll from the effect itself, with a hearts price only where hearts can be rolled', () => {
        const flip = priceTable(EFFECT_BY_ID.flip)!
        expect(flip.columns).toEqual(['Tier'])
        expect(flip.rows.map((row) => [...row.values, row.price, row.heartsPrice])).toEqual([
            [1, 1.5, 2.3],
            [2, 3, 4.5],
            [3, 4.5, 6.8],
        ])
        expect(priceTable(EFFECT_BY_ID.draw)!.rows.every((row) => row.heartsPrice === null)).toBe(true)
        const shift = priceTable(EFFECT_BY_ID.shift)!
        expect(shift.columns).toEqual(['Shift by'])
        expect(shift.rows.map((row) => [...row.values, row.price])).toEqual([
            [1, 0.75],
            [2, 1.5],
            [3, 2.25],
        ])
    })

    it('lists every amount and step of a count effect, cheapest first', () => {
        const vault = priceTable(EFFECT_BY_ID.vault)!
        expect(vault.columns).toEqual(['Amount', 'Per cards'])
        expect(vault.rows).toHaveLength(6)
        const prices = vault.rows.map((row) => row.price ?? 0)
        expect(prices).toEqual(prices.slice().sort((a, b) => a - b))
        expect(vault.rows.every((row) => row.heartsPrice === null)).toBe(true)
        const hoard = priceTable(EFFECT_BY_ID.hoard)!
        expect(hoard.rows.every((row) => row.price !== null && row.heartsPrice !== null && row.heartsPrice >= row.price)).toBe(true)
    })

    it('has a price list for every effect whose price is not one plain number', () => {
        const withoutList = EFFECTS.filter((effect) => effect.roll && !priceTable(effect)).map((effect) => effect.id)
        expect(withoutList).toEqual(['bulk'])
        expect(priceTable(EFFECT_BY_ID.all3)!.columns).toEqual(['Amount'])
        // All 3 rolls 3 to 5 on gold and power but 2 to 4 on hearts, so an amount can have only one of the two prices.
        expect(priceTable(EFFECT_BY_ID.all3)!.rows.find((row) => row.values[0] === 2)?.price).toBeNull()
        expect(priceTable(EFFECT_BY_ID.swap)).toBeNull()
    })

    it('reads the enemy share from the difficulty steps', () => {
        expect(GENERATION.enemyShareSteps[0]).toEqual({ fromTurn: 1, share: 0.2 })
        expect(GENERATION.enemyShareSteps.length).toBeGreaterThan(1)
    })
})

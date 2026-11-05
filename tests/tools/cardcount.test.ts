import { describe, expect, it } from 'vite-plus/test'
import { countCards } from '../../tools/cardcount.ts'

describe('card variety estimator', () => {
    it('counts the current Standard recruit and enemy pools', () => {
        const counts = countCards(2000, 1)
        expect(counts.effects).toBe(18)
        expect(counts.recruit.observed).toBeGreaterThan(0)
        expect(counts.enemy.observed).toBeGreaterThan(0)
        expect(Object.keys(counts.recruit.byCost).length).toBeGreaterThan(0)
        expect(Object.keys(counts.enemy.byCost).length).toBeGreaterThan(0)
        expect(counts.recruit.distribution.cardsWith.gold).toBeGreaterThan(0)
        expect(counts.recruit.distribution.units.hearts).toBeGreaterThan(0)
        expect(Object.keys(counts.recruit.distribution.effects).length).toBeGreaterThan(0)
    })
})

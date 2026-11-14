import type { TierTerms } from '../generator/budget'
import { nextInt } from '../rng'
import type { Rng } from '../rng'
import type { Card } from '../types'

const roundToTenth = (value: number): number => Math.round(value * 10) / 10

/** A tier costs its unit price times the tier, minus a base offset, so the first tier is cheaper than one bare unit. */
export function tierPrice(terms: TierTerms, tier: number): number {
    return roundToTenth(terms.unitPrice * tier - terms.offset)
}

/** The same tiers priced for a resource that costs `factor` times as much per unit. */
export function scaleTerms(terms: TierTerms, factor: number): TierTerms {
    return { ...terms, unitPrice: terms.unitPrice * factor, offset: terms.offset * factor }
}

/** The tier a card rolls: any the budget allows, with the lowest one as the floor. */
export function rollTier(rng: Rng, budget: number, terms: TierTerms): number {
    const affordable = terms.tiers.filter((tier) => tierPrice(terms, tier) <= budget)
    return affordable[nextInt(rng, affordable.length)] ?? terms.tiers[0]!
}

/** A roll function for an effect whose only parameter is its tier, kept in `fxParams.amount`. Returns the price. */
export function rollAmountTier(terms: TierTerms): (rng: Rng, card: Card, budget: number) => number {
    return (rng, card, budget) => {
        const amount = rollTier(rng, budget, terms)
        card.fxParams = { ...card.fxParams, amount }
        return tierPrice(terms, amount)
    }
}

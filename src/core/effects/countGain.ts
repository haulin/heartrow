import { COUNT_GAIN_PRICE_FACTOR, RESOURCE_PRICE } from '../generator/budget'
import { nextInt } from '../rng'
import type { Rng } from '../rng'
import type { Card, GeneratorResource } from '../types'
import { rollPayoutCurrency } from './payout'
import type { EffectContext, EffectRollContext } from './types'

type GainResource = Parameters<EffectContext['gain']>[0]

/** Gains `amount` of a resource for every `perCards` cards counted. */
export function gainPerCards({ gain }: EffectContext, resource: GainResource, counted: number, perCards: number, amount = 1): void {
    gain(resource, Math.floor(counted / perCards) * amount)
}

export function rolledCurrency(card: Card, fallback: GeneratorResource): GeneratorResource {
    return card.fxParams?.currency ?? fallback
}

/** What an effect of the "+amount per N cards" shape may roll, and how many cards it is priced against. */
export interface CountGainTerms {
    amounts: readonly number[]
    perCards: readonly number[]
    /** The `perCards` of a card that rolled none. */
    defaultPerCards: number
    /** How many of the counted cards a typical turn has, which the price is worked out at. */
    reference: number
    /** Budget price of one unit of what it gives. */
    unitPrice: number
}

export interface CountGainVariant {
    amount: number
    perCards: number
    price: number
}

const roundToTenth = (value: number): number => Math.round(value * 10) / 10

/** The payoff at the reference count, scaled down by the shared factor because early turns count fewer cards. */
export function countGainPrice(terms: CountGainTerms, amount: number, perCards: number, factor = 1): number {
    return roundToTenth((COUNT_GAIN_PRICE_FACTOR * amount * terms.unitPrice * factor * terms.reference) / perCards)
}

/** Every amount with every step, cheapest first. `factor` prices a resource that costs that many times the one in the terms. */
export function countGainVariants(terms: CountGainTerms, factor = 1): CountGainVariant[] {
    return terms.perCards
        .flatMap((perCards) =>
            terms.amounts.map((amount) => ({ amount, perCards, price: countGainPrice(terms, amount, perCards, factor) })),
        )
        .sort((a, b) => a.price - b.price)
}

/** Rolls one affordable variant onto the card and returns its price. */
export function rollCountGainVariant(rng: Rng, card: Card, budget: number, variants: readonly CountGainVariant[]): number {
    const affordable = variants.filter((variant) => variant.price <= budget)
    const { amount, perCards, price } = affordable[nextInt(rng, affordable.length)]!
    card.fxParams = { ...card.fxParams, amount, perCards }
    return price
}

/** Rolls the resource the effect pays and then one affordable variant of it. */
export function rollCountGain(rng: Rng, card: Card, budget: number, context: EffectRollContext, terms: CountGainTerms): number {
    const variantsFor = (resource: GeneratorResource) => countGainVariants(terms, RESOURCE_PRICE[resource])
    const resource = rollPayoutCurrency(rng, card, context, (r) => variantsFor(r)[0]!.price <= budget)
    return rollCountGainVariant(rng, card, budget, variantsFor(resource))
}

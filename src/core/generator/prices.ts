import { createRng } from '../rng'
import type { Card, Colour, Currency, EffectParams } from '../types'
import type { EffectDef } from '../effects/types'

export interface PriceRow {
    /** The rolled parameters that differ between rows, in the order of `PriceTable.columns`. */
    values: number[]
    /** The budget price on a gold or power card; null when the effect only rolls this variant for hearts. */
    price: number | null
    /** The price when the effect rolled hearts, which cost more per unit; null when it never does. */
    heartsPrice: number | null
}

export interface PriceTable {
    columns: string[]
    rows: PriceRow[]
}

/** Parameters in the order their columns appear, with the name each gets unless the effect names it. */
type RolledParam = Exclude<keyof EffectParams, 'currency'>
const PARAMETERS: readonly (readonly [RolledParam, string])[] = [
    ['drawCount', 'Cards'],
    ['bondCount', 'Cards'],
    ['shiftCount', 'Shift by'],
    ['amount', 'Amount'],
    ['perCards', 'Per cards'],
]

/** Budgets from nothing to more than any card has, fine enough that every roll becomes affordable at some step. */
const BUDGET_STEP = 0.1
const BUDGET_LIMIT = 16
const SEEDS = 6
const SAMPLE_TYPES: readonly Colour[] = ['moss', 'tide']
const SAMPLE_MAINS: readonly Currency[] = ['gold', 'power']

interface Sample {
    key: string
    params: Omit<EffectParams, 'currency'>
    price: number
    hearts: boolean
}

/** Asks the effect's own roll what it does at every budget, so the list cannot disagree with the generator. */
function sampleRolls(effect: EffectDef): Sample[] {
    if (!effect.roll) return []
    const samples: Sample[] = []
    let seed = 0
    for (const type of SAMPLE_TYPES) {
        for (const main of SAMPLE_MAINS) {
            for (let run = 0; run < SEEDS; run++) {
                const rng = createRng(seed++, effect.id)
                for (let budget = effect.price; budget <= BUDGET_LIMIT; budget += BUDGET_STEP) {
                    const card: Card = { id: 0, type, kind: 'recruit', cost: 5, gold: 0, power: 0, hearts: 0, fx: [effect.id], main }
                    const price = effect.roll(rng, card, budget, { currencies: ['gold', 'power'], hearts: true })
                    const { currency, ...params } = card.fxParams ?? {}
                    samples.push({ key: JSON.stringify(params), params, price, hearts: currency === 'hearts' })
                }
            }
        }
    }
    return samples
}

const cheapest = (row: PriceRow): number => Math.min(row.price ?? Infinity, row.heartsPrice ?? Infinity)

/**
 * The price of every roll the effect can make, read from the effect's own `roll`: one row for each combination of rolled parameters,
 * with a second price when hearts cost more. Null when there is one price and nothing to show about it.
 */
export function priceTable(effect: EffectDef): PriceTable | null {
    const samples = sampleRolls(effect)
    if (samples.length === 0) return null
    const variants: Record<string, { params: Sample['params']; price?: number; heartsPrice?: number }> = {}
    for (const sample of samples) {
        const variant = variants[sample.key] ?? { params: sample.params }
        if (sample.hearts) variant.heartsPrice = sample.price
        else variant.price = sample.price
        variants[sample.key] = variant
    }
    const found = Object.values(variants)
    const differs = (key: RolledParam) =>
        found.map((variant) => variant.params[key]).filter((value, i, all) => all.indexOf(value) === i).length > 1
    const shown = PARAMETERS.filter(([key]) => differs(key))
    const hasHearts = found.some((variant) => variant.heartsPrice !== undefined)
    if (shown.length === 0 && !hasHearts) return null
    const rows = found
        .map((variant) => ({
            values: shown.map(([key]) => variant.params[key] ?? 0),
            price: variant.price ?? null,
            heartsPrice: variant.heartsPrice ?? null,
        }))
        .sort((a, b) => cheapest(a) - cheapest(b) || a.values.join().localeCompare(b.values.join()))
    return { columns: shown.map(([key, name]) => effect.paramNames?.[key] ?? name), rows }
}

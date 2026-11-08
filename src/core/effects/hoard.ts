import { HOARD_AMOUNTS, HOARD_CARDS_PER_STEP, HOARD_PRICE_FACTOR, REFERENCE_DECK_SIZE, RETAIN_RARELY } from '../generator/budget'
import { nextInt } from '../rng'
import { ownedCards } from '../state'
import { gainPerCards, rollMainCurrency, rolledCurrency } from './countGain'
import type { EffectDef } from './types'
import { rangeOf, resourceSlot, slot } from './wording'

const roundToTenth = (value: number): number => Math.round(value * 10) / 10

const VARIANTS = HOARD_CARDS_PER_STEP.flatMap((perCards) =>
    HOARD_AMOUNTS.map((amount) => ({
        amount,
        perCards,
        price: roundToTenth((HOARD_PRICE_FACTOR * amount * REFERENCE_DECK_SIZE) / perCards),
    })),
).sort((a, b) => a.price - b.price)

export const hoard: EffectDef = {
    id: 'hoard',
    price: VARIANTS[0]!.price,
    family: 'count',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(HOARD_AMOUNTS))} ${resourceSlot(card, 'gold')} per ${slot(card, (c) => c.fxParams?.perCards ?? 1, rangeOf(HOARD_CARDS_PER_STEP))} cards in your deck`,
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: [],
    pays: 'rolled',
    retain: RETAIN_RARELY,
    roll(rng, card, budget) {
        const affordable = VARIANTS.filter((variant) => variant.price <= budget)
        const { amount, perCards, price } = affordable[nextInt(rng, affordable.length)]!
        rollMainCurrency(card)
        card.fxParams = { ...card.fxParams, amount, perCards }
        return price
    },
    apply(ctx) {
        const { amount = 1, perCards = HOARD_CARDS_PER_STEP[0] } = ctx.card.fxParams ?? {}
        gainPerCards(ctx, rolledCurrency(ctx.card, 'gold'), ownedCards(ctx.state).length, perCards, amount)
    },
}

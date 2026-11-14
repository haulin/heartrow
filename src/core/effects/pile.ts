import { COUNT_GAIN_TERMS, RETAIN_OFTEN } from '../generator/budget'
import { countGainVariants, gainPerCards, rollCountGain, rolledCurrency } from './countGain'
import type { EffectDef } from './types'
import { ALL_RESOURCES, rangeOf, resourceSlot, slot } from './wording'

const TERMS = COUNT_GAIN_TERMS.pile
const VARIANTS = countGainVariants(TERMS)

export const pile: EffectDef = {
    id: 'pile',
    price: VARIANTS[0]!.price,
    family: 'count',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.amounts))} ${resourceSlot(card, 'power', ALL_RESOURCES)} per ${slot(card, (c) => c.fxParams?.perCards ?? TERMS.defaultPerCards, rangeOf(TERMS.perCards))} cards in your discard`,
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['ember'],
    pays: 'rolled',
    retain: RETAIN_OFTEN,
    roll: (rng, card, budget, context) => rollCountGain(rng, card, budget, context, TERMS),
    apply(ctx) {
        const { amount = 1, perCards = TERMS.defaultPerCards } = ctx.card.fxParams ?? {}
        gainPerCards(ctx, rolledCurrency(ctx.card, 'power'), ctx.state.discard.length, perCards, amount)
    },
}

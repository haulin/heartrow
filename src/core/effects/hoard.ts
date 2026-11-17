import { COUNT_GAIN_TERMS, RETAIN_RARELY } from '../generator/budget'
import { ownedCards } from '../state'
import { countGainVariants, gainPerCards, rollCountGain, rolledCurrency } from './countGain'
import type { EffectDef } from './types'
import { ALL_RESOURCES, rangeOf, resourceSlot, slot } from './wording'

const TERMS = COUNT_GAIN_TERMS.hoard
const VARIANTS = countGainVariants(TERMS)

export const hoard: EffectDef = {
    id: 'hoard',
    blurb: 'Pays for every few cards in your deck, so it rewards a big deck.',
    price: VARIANTS[0]!.price,
    family: 'count',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.amounts))} ${resourceSlot(card, 'gold', ALL_RESOURCES)} per ${slot(card, (c) => c.fxParams?.perCards ?? TERMS.defaultPerCards, rangeOf(TERMS.perCards))} cards in your deck`,
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss', 'tide'],
    pays: 'rolled',
    retain: RETAIN_RARELY,
    roll: (rng, card, budget, context) => rollCountGain(rng, card, budget, context, TERMS),
    apply(ctx) {
        const { amount = 1, perCards = TERMS.defaultPerCards } = ctx.card.fxParams ?? {}
        gainPerCards(ctx, rolledCurrency(ctx.card, 'gold'), ownedCards(ctx.state).length, perCards, amount)
    },
}

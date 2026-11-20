import { COUNT_GAIN_TERMS, RETAIN_SOMETIMES } from '../generator/budget'
import { ownedCards } from '../state'
import { countGainVariants, gainPerCards, rollCountGain, rolledCurrency } from './countGain'
import type { EffectDef } from './types'
import { ALL_RESOURCES, rangeOf, resourceSlot, slot } from './wording'

const TERMS = COUNT_GAIN_TERMS.basics
const VARIANTS = countGainVariants(TERMS)

export const basics: EffectDef = {
    id: 'basics',
    blurb: 'Pays for every few Basic cards (your starter cards) that you still own, so it is best early and fades as you exile them.',
    price: VARIANTS[0]!.price,
    family: 'count',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.amounts))} ${resourceSlot(card, 'gold', ALL_RESOURCES)} per ${slot(card, (c) => c.fxParams?.perCards ?? TERMS.defaultPerCards, rangeOf(TERMS.perCards))} basic cards in your deck`,
    unconditional: true,
    enemies: true,
    needsAny: ['gold', 'power'],
    lean: ['moss'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll: (rng, card, budget, context) => rollCountGain(rng, card, budget, context, TERMS),
    apply(ctx) {
        const { amount = 1, perCards = TERMS.defaultPerCards } = ctx.card.fxParams ?? {}
        const basicCards = ownedCards(ctx.state).filter((card) => card.kind === 'basic').length
        gainPerCards(ctx, rolledCurrency(ctx.card, 'gold'), basicCards, perCards, amount)
    },
}

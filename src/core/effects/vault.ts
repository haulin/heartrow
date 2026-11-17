import { COUNT_GAIN_TERMS, RETAIN_RARELY } from '../generator/budget'
import { countGainVariants, gainPerCards, rollCountGainVariant } from './countGain'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = COUNT_GAIN_TERMS.vault
const VARIANTS = countGainVariants(TERMS)

export const vault: EffectDef = {
    id: 'vault',
    blurb: 'Pays hearts for the cards in your exile pile, so every card you exile makes it worth more.',
    price: VARIANTS[0]!.price,
    family: 'count',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.amounts))} ♥ per ${slot(card, (c) => c.fxParams?.perCards ?? TERMS.defaultPerCards, rangeOf(TERMS.perCards))} cards in exile`,
    enemies: true,
    needs: ['exile', 'hearts'],
    lean: ['ember'],
    pays: 'hearts',
    retain: RETAIN_RARELY,
    roll(rng, card, budget) {
        return rollCountGainVariant(rng, card, budget, VARIANTS)
    },
    apply(ctx) {
        const { amount = 1, perCards = TERMS.defaultPerCards } = ctx.card.fxParams ?? {}
        gainPerCards(ctx, 'hearts', ctx.state.exile.length, perCards, amount)
    },
}

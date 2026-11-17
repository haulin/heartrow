import { RETAIN_OFTEN, TIER_TERMS } from '../generator/budget'
import { rollAmountTier, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = TIER_TERMS.discount

export const cheap: EffectDef = {
    id: 'cheap',
    blurb: 'Every recruit in the river costs less gold for the rest of this turn.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'price',
    describe: (card) => `Recruits cost −${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.tiers))} ● this turn`,
    enemies: true,
    needs: ['gold'],
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    roll: rollAmountTier(TERMS),
    apply({ state, card }) {
        state.recruitDiscount += card.fxParams?.amount ?? 1
    },
}

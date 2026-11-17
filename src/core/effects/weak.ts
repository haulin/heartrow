import { RETAIN_OFTEN, TIER_TERMS } from '../generator/budget'
import { rollAmountTier, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = TIER_TERMS.discount

export const weak: EffectDef = {
    id: 'weak',
    blurb: 'Every enemy in the river needs less power to defeat for the rest of this turn.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'price',
    describe: (card) => `Enemies need −${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.tiers))} ⚔ this turn`,
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    retain: RETAIN_OFTEN,
    roll: rollAmountTier(TERMS),
    apply({ state, card }) {
        state.enemyDiscount += card.fxParams?.amount ?? 1
    },
}

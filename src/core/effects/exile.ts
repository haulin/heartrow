import { RETAIN_OFTEN, TIER_TERMS } from '../generator/budget'
import { hasExileTarget } from '../state'
import { rollAmountTier, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = TIER_TERMS.exile

export const exile: EffectDef = {
    id: 'exile',
    blurb: 'Removes a card from the game for good: a card in your hand, or a recruit in the river (never an enemy, and never the card in the Gate). A smaller deck brings your best cards round more often. You may skip it.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'cards',
    describe: (card) =>
        card && (card.fxParams?.amount ?? 1) === 1
            ? 'Exile a card or river recruit'
            : `Exile ${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(TERMS.tiers))} cards or river recruits`,
    enemies: true,
    lean: ['moss', 'ember', 'tide'],
    mildLean: [],
    retain: RETAIN_OFTEN,
    roll: rollAmountTier(TERMS),
    apply({ state, card }) {
        if (hasExileTarget(state)) state.pendingExile = card.fxParams?.amount ?? 1
    },
}

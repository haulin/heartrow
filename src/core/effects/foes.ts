import { RETAIN_OFTEN, TIER_TERMS } from '../generator/budget'
import { rollAmountTier, tierPrice } from './tiers'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

const TERMS = TIER_TERMS.foes

const powerPerEnemy = (amount: number | undefined): number => amount ?? 1

export const foes: EffectDef = {
    id: 'foes',
    blurb: 'Pays power for every enemy in the river, so it is strongest when the river is full of them.',
    price: tierPrice(TERMS, TERMS.tiers[0]),
    family: 'resource',
    describe: (card) => `+${slot(card, (c) => powerPerEnemy(c.fxParams?.amount), rangeOf(TERMS.tiers))} ⚔ per enemy in the river`,
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    pays: 'power',
    retain: RETAIN_OFTEN,
    roll: rollAmountTier(TERMS),
    apply({ state, source, rowEnemies, card, gain }) {
        const enemies = source === 'play' ? state.row.filter((row) => row.kind === 'enemy').length : rowEnemies
        gain('power', enemies * powerPerEnemy(card.fxParams?.amount))
    },
}

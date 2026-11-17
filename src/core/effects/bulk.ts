import { BULK_CARDS_PER_STEP } from '../generator/budget'
import type { EffectDef } from './types'

/** Passive: `cardCost` reads `fxParams.costPerCards`, and the generator prints the matching cost premium. */
export const bulk: EffectDef = {
    id: 'bulk',
    blurb: 'Enemies only. The more cards you own, the less power it takes to defeat it, so a thin deck pays more for the same hearts.',
    price: 0,
    family: 'price',
    describe: (card) => `Needs −1 ⚔ per ${card?.fxParams?.costPerCards ?? BULK_CARDS_PER_STEP} cards in your deck`,
    passive: true,
    enemies: true,
    enemyOnly: true,
    needs: ['foe', 'power'],
    lean: [],
    roll(_rng, card) {
        card.fxParams = { ...card.fxParams, costPerCards: BULK_CARDS_PER_STEP }
        return 0
    },
    apply() {},
}

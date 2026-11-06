import { BULK_CARDS_PER_STEP } from '../generator/budget'
import type { EffectDef } from './types'

/** Passive: `cardCost` reads `fxParams.costPerCards`, and the generator prints the matching cost premium. */
export const bulk: EffectDef = {
    id: 'bulk',
    price: 0,
    text: 'Needs −1 ⚔ per {d} cards in your deck',
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

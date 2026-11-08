import { DISCOUNT_AMOUNTS, RETAIN_OFTEN } from '../generator/budget'
import { rollDiscount } from './discount'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

export const weak: EffectDef = {
    id: 'weak',
    price: 1.5,
    family: 'price',
    describe: (card) => `Enemies need −${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(DISCOUNT_AMOUNTS))} ⚔ this turn`,
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    retain: RETAIN_OFTEN,
    roll: rollDiscount,
    apply({ state, card }) {
        state.enemyDiscount += card.fxParams?.amount ?? 1
    },
}

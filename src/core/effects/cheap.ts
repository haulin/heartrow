import { DISCOUNT_AMOUNTS, RETAIN_OFTEN } from '../generator/budget'
import { rollDiscount } from './discount'
import type { EffectDef } from './types'
import { rangeOf, slot } from './wording'

export const cheap: EffectDef = {
    id: 'cheap',
    price: 1.5,
    family: 'price',
    describe: (card) => `Recruits cost −${slot(card, (c) => c.fxParams?.amount ?? 1, rangeOf(DISCOUNT_AMOUNTS))} ● this turn`,
    enemies: true,
    needs: ['gold'],
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    roll: rollDiscount,
    apply({ state, card }) {
        state.recruitDiscount += card.fxParams?.amount ?? 1
    },
}

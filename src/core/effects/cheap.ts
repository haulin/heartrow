import { RETAIN_OFTEN } from '../generator/budget'
import { rollDiscount } from './discount'
import type { EffectDef } from './types'

export const cheap: EffectDef = {
    id: 'cheap',
    price: 1.5,
    text: 'Recruits cost −{a} ● this turn',
    enemies: true,
    needs: ['gold'],
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    roll: rollDiscount,
    apply({ state, card }) {
        state.recruitDiscount += card.fxParams?.amount ?? 1
    },
}

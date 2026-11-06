import { RETAIN_OFTEN } from '../generator/budget'
import { rollDiscount } from './discount'
import type { EffectDef } from './types'

export const weak: EffectDef = {
    id: 'weak',
    price: 1.5,
    text: 'Enemies need −{a} ⚔ this turn',
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    retain: RETAIN_OFTEN,
    roll: rollDiscount,
    apply({ state, card }) {
        state.enemyDiscount += card.fxParams?.amount ?? 1
    },
}

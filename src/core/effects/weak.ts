import type { EffectDef } from './types'

export const weak: EffectDef = {
    id: 'weak',
    price: 1.5,
    text: 'Enemies cost 1 less ⚔ this turn',
    enemies: true,
    lean: ['ember'],
    apply({ state }) {
        state.enemyDiscount++
    },
}

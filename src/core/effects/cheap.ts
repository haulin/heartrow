import type { EffectDef } from './types'

export const cheap: EffectDef = {
    id: 'cheap',
    price: 1.5,
    text: 'Recruits cost 1 less ● this turn',
    enemies: true,
    lean: ['tide'],
    apply({ state }) {
        state.recruitDiscount++
    },
}

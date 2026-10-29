import type { EffectDef } from './types'

export const all3: EffectDef = {
    id: 'all3',
    price: 2,
    text: '+2 ♥ if you played all 3 types this turn',
    enemies: false,
    lean: ['tide'],
    retainable: true,
    apply({ state, source }) {
        if (source === 'play' && state.typesPlayed.length >= 3) state.hearts += 2
    },
}

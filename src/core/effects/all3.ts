import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const all3: EffectDef = {
    id: 'all3',
    price: 2,
    family: 'streak',
    describe: () => '+2 ♥ if you played all 3 types this turn',
    enemies: false,
    needs: ['moss', 'ember', 'tide', 'hearts'],
    lean: ['tide'],
    pays: 'hearts',
    retain: RETAIN_OFTEN,
    apply({ state, source, gain }) {
        if (source === 'play' && state.typesPlayed.length >= 3) gain('hearts', 2)
    },
}

import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const reapP: EffectDef = {
    id: 'reapP',
    price: 1.5,
    family: 'reap',
    describe: () => 'End of turn: +1 ♥ per 2 unspent ⚔',
    enemies: true,
    needs: ['power', 'hearts'],
    lean: ['ember'],
    pays: 'hearts',
    retain: RETAIN_OFTEN,
    apply({ state }) {
        state.reapPower++
    },
}

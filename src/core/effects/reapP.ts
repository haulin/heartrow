import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const reapP: EffectDef = {
    id: 'reapP',
    blurb: 'At the end of the turn, pays hearts for the power you did not spend.',
    price: 1.5,
    family: 'reap',
    unconditional: true,
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

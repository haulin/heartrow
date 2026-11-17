import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const reapG: EffectDef = {
    id: 'reapG',
    blurb: 'At the end of the turn, pays hearts for the gold you did not spend. The hearts come from saving, not from buying.',
    price: 1.5,
    family: 'reap',
    unconditional: true,
    describe: () => 'End of turn: +1 ♥ per 3 unspent ●',
    enemies: true,
    needs: ['gold', 'hearts'],
    lean: ['moss'],
    pays: 'hearts',
    retain: RETAIN_OFTEN,
    apply({ state }) {
        state.reapGold++
    },
}

import type { EffectDef } from './types'

export const reapG: EffectDef = {
    id: 'reapG',
    price: 1.5,
    text: 'End of turn: +1 ♥ per 3 unspent ●',
    enemies: true,
    needs: ['gold', 'hearts'],
    lean: ['moss'],
    apply({ state }) {
        state.reapGold++
    },
}

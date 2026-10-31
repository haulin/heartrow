import type { EffectDef } from './types'

export const reapP: EffectDef = {
    id: 'reapP',
    price: 1.5,
    text: 'End of turn: +1 ♥ per 2 unspent ⚔',
    enemies: true,
    needs: ['power', 'hearts'],
    lean: ['ember'],
    apply({ state }) {
        state.reapPower++
    },
}

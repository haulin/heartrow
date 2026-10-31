import type { EffectDef } from './types'

export const vault: EffectDef = {
    id: 'vault',
    price: 2,
    text: '+1 ♥ per 3 cards in exile',
    enemies: true,
    needs: ['exile', 'hearts'],
    lean: [],
    retainable: true,
    apply({ state, gain }) {
        gain('hearts', Math.floor(state.exile.length / 3))
    },
}

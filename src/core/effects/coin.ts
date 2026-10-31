import { chance } from '../rng'
import type { EffectDef } from './types'

export const coin: EffectDef = {
    id: 'coin',
    price: 2.5,
    text: 'Flip: +2 or +4 ●',
    enemies: true,
    needs: ['gold'],
    lean: ['moss'],
    apply({ state, events }) {
        const gold = chance(state.streams.flip, 0.5) ? 2 : 4
        state.gold += gold
        events.push({ type: 'coinFlipped', gold })
    },
}

import { RETAIN_SOMETIMES } from '../generator/budget'
import type { EffectDef } from './types'

export const swap: EffectDef = {
    id: 'swap',
    price: 1.5,
    family: 'resource',
    describe: () => 'Swap ● and ⚔',
    enemies: true,
    needs: ['gold', 'power'],
    lean: ['moss', 'ember'],
    retain: RETAIN_SOMETIMES,
    apply({ state, events }) {
        const gold = state.gold
        state.gold = state.power
        state.power = gold
        events.push({ type: 'swapped', gold: state.gold, power: state.power })
    },
}

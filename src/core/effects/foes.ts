import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const foes: EffectDef = {
    id: 'foes',
    price: 2,
    family: 'resource',
    describe: () => '+1 ⚔ per enemy in the recruit row',
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    pays: 'power',
    retain: RETAIN_OFTEN,
    apply({ state, source, rowEnemies, gain }) {
        gain('power', source === 'play' ? state.row.filter((card) => card.kind === 'enemy').length : rowEnemies)
    },
}

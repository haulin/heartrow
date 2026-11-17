import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const foes: EffectDef = {
    id: 'foes',
    blurb: 'Pays power for every enemy in the river, so it is strongest when the river is full of them.',
    price: 2,
    family: 'resource',
    describe: () => '+1 ⚔ per enemy in the river',
    enemies: true,
    needs: ['foe', 'power'],
    lean: ['ember'],
    pays: 'power',
    retain: RETAIN_OFTEN,
    apply({ state, source, rowEnemies, gain }) {
        gain('power', source === 'play' ? state.row.filter((card) => card.kind === 'enemy').length : rowEnemies)
    },
}

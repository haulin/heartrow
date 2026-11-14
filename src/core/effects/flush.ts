import { FLUSH_PRICE, RETAIN_RARELY } from '../generator/budget'
import type { EffectDef } from './types'

/** The one way to get more flushes than the one every few turns. Enemies may carry it too, like most effects. */
export const flush: EffectDef = {
    id: 'flush',
    family: 'river',
    price: FLUSH_PRICE,
    describe: () => 'Gain a flush',
    enemies: true,
    lean: ['ember'],
    retain: RETAIN_RARELY,
    apply({ state, events }) {
        state.flushes++
        events.push({ type: 'flushEarned' })
    },
}

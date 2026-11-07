import { RETAIN_SOMETIMES } from '../generator/budget'
import { discardUnplayed } from './cycle'
import type { EffectDef } from './types'

export const purge: EffectDef = {
    id: 'purge',
    price: 1.25,
    text: 'Redraw all unplayed cards, even Retain ones',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_SOMETIMES,
    apply(ctx) {
        discardUnplayed(ctx, true)
    },
}

import { RETAIN_SOMETIMES } from '../generator/budget'
import { discardUnplayed } from './cycle'
import type { EffectDef } from './types'

export const redraw: EffectDef = {
    id: 'redraw',
    price: 1.25,
    family: 'cards',
    describe: () => 'Redraw all unplayed cards, even Retain ones',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_SOMETIMES,
    apply(ctx) {
        discardUnplayed(ctx, true)
    },
}

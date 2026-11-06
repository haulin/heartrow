import { RETAIN_SOMETIMES } from '../generator/budget'
import { discardUnplayed } from './cycle'
import type { EffectDef } from './types'

export const purge: EffectDef = {
    id: 'purge',
    price: 1.25,
    text: 'Discard all your unplayed cards, even Retain, draw as many',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_SOMETIMES,
    apply(ctx) {
        discardUnplayed(ctx, true)
    },
}

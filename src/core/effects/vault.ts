import { gainPerCards } from './countGain'
import { RETAIN_RARELY } from '../generator/budget'
import type { EffectDef } from './types'

export const vault: EffectDef = {
    id: 'vault',
    price: 2,
    text: '+1 ♥ per 3 cards in exile',
    enemies: true,
    needs: ['exile', 'hearts'],
    lean: [],
    pays: 'hearts',
    retain: RETAIN_RARELY,
    apply(ctx) {
        gainPerCards(ctx, 'hearts', ctx.state.exile.length, 3)
    },
}

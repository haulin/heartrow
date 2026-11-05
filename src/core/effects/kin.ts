import { nextInt } from '../rng'
import type { Rng } from '../rng'
import type { Card, GeneratorResource } from '../types'
import type { EffectDef, EffectRollContext } from './types'

export function rollKinCurrency(rng: Rng, card: Card, context: EffectRollContext, allowHearts: boolean): GeneratorResource {
    const currencies: GeneratorResource[] = [...context.currencies]
    if (allowHearts && card.type === 'tide' && context.hearts) currencies.push('hearts')
    const currency = currencies[nextInt(rng, currencies.length)] ?? card.main
    card.fxParams = { ...card.fxParams, currency }
    return currency
}

export const kin: EffectDef = {
    id: 'kin',
    price: 1.5,
    text: '+1 {k} per other {T} card played this turn',
    enemies: false,
    lean: ['moss', 'ember'],
    retainable: true,
    roll(rng, card, budget, context) {
        const currency = rollKinCurrency(rng, card, context, budget >= kin.price * 1.5)
        return kin.price * (currency === 'hearts' ? 1.5 : 1)
    },
    apply({ state, card }) {
        const currency = card.fxParams?.currency ?? card.main
        state[currency] += state.hand.filter((other) => other.played && other !== card && other.type === card.type).length
    },
}

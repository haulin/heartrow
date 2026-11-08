import { nextInt } from '../rng'
import type { Rng } from '../rng'
import type { Card, GeneratorResource } from '../types'
import { RETAIN_SOMETIMES } from '../generator/budget'
import type { EffectDef, EffectRollContext } from './types'
import { MAIN_RESOURCES, resourceSlot, typeSlot } from './wording'

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
    family: 'streak',
    describe: (card) =>
        `+1 ${resourceSlot(card, card?.main ?? 'gold', `${MAIN_RESOURCES}/♥`)} per other ${typeSlot(card)} card played this turn`,
    needsAny: ['moss', 'ember', 'tide'],
    enemies: false,
    lean: ['moss', 'ember'],
    pays: 'rolled',
    retain: RETAIN_SOMETIMES,
    roll(rng, card, budget, context) {
        const currency = rollKinCurrency(rng, card, context, budget >= kin.price * 1.5)
        return kin.price * (currency === 'hearts' ? 1.5 : 1)
    },
    apply({ state, card, gain }) {
        const currency = card.fxParams?.currency ?? card.main
        gain(currency, state.hand.filter((other) => other.played && other !== card && other.type === card.type).length)
    },
}

import { ALL3_AMOUNTS, ALL3_PRICE_FACTOR, RESOURCE_PRICE, RETAIN_OFTEN } from '../generator/budget'
import { nextInt } from '../rng'
import type { GeneratorResource } from '../types'
import { rollPayoutCurrency } from './payout'
import type { EffectDef } from './types'
import { resourceSlot, slot } from './wording'

const DEFAULT_AMOUNT = 2
const DEFAULT_RESOURCE: GeneratorResource = 'hearts'

const variantPrice = (resource: GeneratorResource, amount: number): number =>
    Math.round(ALL3_PRICE_FACTOR * amount * RESOURCE_PRICE[resource] * 10) / 10

export const all3: EffectDef = {
    id: 'all3',
    blurb: 'Pays a bonus when you played a Moss, an Ember and a Tide card this turn.',
    price: variantPrice('hearts', ALL3_AMOUNTS.hearts[0]),
    family: 'streak',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.amount ?? DEFAULT_AMOUNT, '1-4')} ${resourceSlot(card, DEFAULT_RESOURCE, '●/⚔/♥')} if you played all 3 types this turn`,
    enemies: false,
    needs: ['moss', 'ember', 'tide'],
    lean: ['tide'],
    pays: 'rolled',
    retain: RETAIN_OFTEN,
    roll(rng, card, budget, context) {
        const resource = rollPayoutCurrency(rng, card, context, (r) => variantPrice(r, ALL3_AMOUNTS[r][0]) <= budget)
        const options = ALL3_AMOUNTS[resource].filter((amount) => variantPrice(resource, amount) <= budget)
        const amount = options[nextInt(rng, options.length)] ?? ALL3_AMOUNTS[resource][0]
        card.fxParams = { ...card.fxParams, currency: resource, amount }
        return variantPrice(resource, amount)
    },
    apply({ state, card, source, gain }) {
        if (source !== 'play' || state.typesPlayed.length < 3) return
        const resource = card.fxParams?.currency ?? DEFAULT_RESOURCE
        gain(resource, card.fxParams?.amount ?? DEFAULT_AMOUNT)
    },
}

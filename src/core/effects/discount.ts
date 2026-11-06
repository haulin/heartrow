import { DISCOUNT_AMOUNTS, DISCOUNT_BASE_OFFSET, DISCOUNT_UNIT_PRICE } from '../generator/budget'
import { nextInt } from '../rng'
import type { Rng } from '../rng'
import type { Card } from '../types'

export function discountPrice(amount: number): number {
    return DISCOUNT_UNIT_PRICE * amount - DISCOUNT_BASE_OFFSET
}

/** Rolls how many units of discount a Weak or Cheap card gives, as many as the budget allows. Returns the price. */
export function rollDiscount(rng: Rng, card: Card, budget: number): number {
    const affordable = DISCOUNT_AMOUNTS.filter((amount) => discountPrice(amount) <= budget)
    const amount = affordable[nextInt(rng, affordable.length)]!
    card.fxParams = { ...card.fxParams, amount }
    return discountPrice(amount)
}

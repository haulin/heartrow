import type { Card, Currency } from '../types'
import type { EffectContext } from './types'

type GainResource = Parameters<EffectContext['gain']>[0]

/** Gains `amount` of a resource for every `perCards` cards counted. */
export function gainPerCards({ gain }: EffectContext, resource: GainResource, counted: number, perCards: number, amount = 1): void {
    gain(resource, Math.floor(counted / perCards) * amount)
}

export function rollMainCurrency(card: Card): void {
    card.fxParams = { ...card.fxParams, currency: card.main }
}

export function rolledCurrency(card: Card, fallback: Currency): Currency {
    const currency = card.fxParams?.currency
    return currency === 'gold' || currency === 'power' ? currency : fallback
}

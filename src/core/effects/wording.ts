import type { Card, CardType, GeneratorResource } from '../types'

export const TYPE_NAMES: Record<CardType, string> = {
    moss: 'Moss',
    ember: 'Ember',
    tide: 'Tide',
    plain: 'Basic',
    foe: 'Enemy',
}

export const symbol = (currency: GeneratorResource | undefined): string => (currency === 'power' ? '⚔' : currency === 'hearts' ? '♥' : '●')

/** The values an effect can roll, as one range: `[1, 2]` reads "1-2". */
export function rangeOf(values: readonly number[]): string {
    const low = Math.min(...values)
    const high = Math.max(...values)
    return low === high ? `${low}` : `${low}-${high}`
}

/** The resources a rolled value can name, and the recruit types a card can have, as the generator list shows them. */
export const MAIN_RESOURCES = '●/⚔'
export const RECRUIT_TYPES = 'Moss/Ember/Tide'

/**
 * One value in an effect's text. On a card it is the value that card rolled; in the generator list (no card) it is the set of values
 * the effect can roll, in brackets. An effect writes its sentence once and so shows both.
 */
export function slot(card: Card | undefined, rolled: (card: Card) => string | number, set: string): string {
    return card ? String(rolled(card)) : `[${set}]`
}

/** The resource a card's effect gives: the one it rolled, or `fallback` for a card that rolled none. */
export function resourceSlot(card: Card | undefined, fallback: GeneratorResource, set = MAIN_RESOURCES): string {
    return slot(card, (c) => symbol(c.fxParams?.currency ?? fallback), set)
}

/** The type of the card that carries the effect, as "Moss", or the types the effect can sit on. */
export function typeSlot(card: Card | undefined): string {
    return slot(card, (c) => TYPE_NAMES[c.type], RECRUIT_TYPES)
}

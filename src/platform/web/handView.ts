import { EFFECTS } from '../../core'
import type { Card, CardType, EffectId } from '../../core'

/** How the hand is laid out: in the order cards were drawn, grouped by type, or grouped by effect. It changes the view only, never the game. */
export type HandSort = 'draw' | 'type' | 'effect'

export const HAND_SORTS: readonly { id: HandSort; letter: string; name: string }[] = [
    { id: 'draw', letter: 'D', name: 'draw order' },
    { id: 'type', letter: 'T', name: 'type' },
    { id: 'effect', letter: 'E', name: 'effect' },
]

const TYPE_ORDER: readonly CardType[] = ['moss', 'ember', 'tide', 'plain']
const EFFECT_ORDER: readonly EffectId[] = EFFECTS.map((effect) => effect.id)

/** The sort that a click on the sort button moves to. */
export function nextHandSort(sort: HandSort): HandSort {
    const index = HAND_SORTS.findIndex((candidate) => candidate.id === sort)
    return HAND_SORTS[(index + 1) % HAND_SORTS.length]!.id
}

/** A card without an effect sorts after every card with one. */
function effectRank(card: Card): number {
    const first = card.fx[0]
    return first === undefined ? EFFECT_ORDER.length : EFFECT_ORDER.indexOf(first)
}

const SORT_KEYS: Record<HandSort, (card: Card) => number> = {
    draw: () => 0,
    type: (card) => TYPE_ORDER.indexOf(card.type),
    effect: effectRank,
}

/** The cards to draw, in order. Cards that rank the same keep the order they were drawn in. */
export function arrangeHand(hand: readonly Card[], sort: HandSort, hidePlayed: boolean): Card[] {
    const key = SORT_KEYS[sort]
    return hand
        .map((card, drawn) => ({ card, drawn }))
        .filter(({ card }) => !(hidePlayed && card.played))
        .sort((a, b) => key(a.card) - key(b.card) || a.drawn - b.drawn)
        .map(({ card }) => card)
}

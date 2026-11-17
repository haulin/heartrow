import { EFFECT_BY_ID } from '../../core'
import type { Card } from '../../core'

/**
 * "Play simple" plays plain gains and cards whose effects need no decision (see `unconditional` on an effect).
 * A Retain card is a decision to hold it, so it stays in the hand.
 */
export function isSimplePlay(card: Card): boolean {
    return card.fx.every((id) => EFFECT_BY_ID[id].unconditional === true) && !card.played && !card.retain
}

export type AutoplayKind = 'simple' | 'rest'

/** Simple cards come first; once none are left the same button plays everything that is still in the hand. */
export function autoplayKind(hand: readonly Card[]): AutoplayKind | undefined {
    if (hand.some(isSimplePlay)) return 'simple'
    return hand.some((card) => !card.played) ? 'rest' : undefined
}

export function playsInAutoplay(kind: AutoplayKind, card: Card): boolean {
    return kind === 'simple' ? isSimplePlay(card) : !card.played
}

import type { Card } from '../../core'

/** "Play simple" plays plain gains only. A Retain card is a decision to hold it, so it stays in the hand. */
export function isSimplePlay(card: Card): boolean {
    return card.fx.length === 0 && !card.played && !card.retain
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

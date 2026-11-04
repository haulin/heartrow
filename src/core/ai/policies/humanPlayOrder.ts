import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { handCard } from './util'

const CYCLE_EFFECTS = ['cycle', 'purge']
const USEFUL_EFFECTS = ['coin', 'draw']
const CONDITIONAL_EFFECTS = ['all3', 'army', 'basics', 'bond', 'kin', 'pile', 'reapG', 'reapP', 'vault']

/** Keeps plain gains before Exile for the lab human bot, with cycling as the main deliberate exception. */
export function humanPlayOrder(): Policy {
    return {
        id: 'humanPlayOrder',
        weight(state, move) {
            const card = handCard(state, move)
            if (move.type !== 'play' || !card) return 1
            if (card.fx.some((fx) => CYCLE_EFFECTS.includes(fx))) return cycleIsWorthwhile(state, card) ? 8 : 0
            if (card.fx.some((fx) => USEFUL_EFFECTS.includes(fx))) return 4
            if (card.fx.some((fx) => CONDITIONAL_EFFECTS.includes(fx))) return 1
            return card.fx.length === 0 ? 4 : 2
        },
    }
}

function cycleIsWorthwhile(state: GameState, card: Card): boolean {
    const discard = state.hand.filter((other) => !other.played && other !== card && (card.fx.includes('purge') || !other.retain))
    if (discard.length === 0) return false
    return directGain(card) + expectedDrawGain(state, discard.length) > totalDirectGain(discard)
}

function expectedDrawGain(state: GameState, count: number): number {
    const fromDeck = Math.min(count, state.deck.length)
    const fromDiscard = Math.min(Math.max(count - fromDeck, 0), state.discard.length)
    return fromDeck * averageGain(state.deck) + fromDiscard * averageGain(state.discard)
}

function averageGain(cards: readonly Card[]): number {
    if (cards.length === 0) return 0
    return totalDirectGain(cards) / cards.length
}

function totalDirectGain(cards: readonly Card[]): number {
    return cards.reduce((total, card) => total + directGain(card), 0)
}

function directGain(card: Card): number {
    return card.gold + card.power + card.hearts
}

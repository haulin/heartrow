import { cloneRng, shuffle } from './rng'
import type { Card, DrawCause, GameEvent, GameState } from './types'

export const HAND_SIZE = 5
export const ROW_SIZE = 5

export function cloneCard(card: Card): Card {
    return { ...card, fx: card.fx.slice() }
}

export function cloneState(state: GameState): GameState {
    const cards = (list: Card[]) => list.map(cloneCard)
    return {
        ...state,
        config: { ...state.config, steps: state.config.steps.map((step) => ({ ...step })), starter: { ...state.config.starter } },
        typesPlayed: state.typesPlayed.slice(),
        deck: cards(state.deck),
        hand: cards(state.hand),
        discard: cards(state.discard),
        exile: cards(state.exile),
        row: cards(state.row),
        stats: { ...state.stats },
        streams: { gen: cloneRng(state.streams.gen), shuffle: cloneRng(state.streams.shuffle), flip: cloneRng(state.streams.flip) },
    }
}

export function cardCost(state: GameState, card: Card): number {
    if (card.kind === 'recruit') return Math.max(0, card.cost - state.recruitDiscount)
    if (card.kind === 'enemy') return Math.max(0, card.cost - state.enemyDiscount)
    return card.cost
}

export function canAfford(state: GameState, card: Card): boolean {
    return (card.kind === 'recruit' ? state.gold : state.power) >= cardCost(state, card)
}

export function ownedCards(state: GameState): Card[] {
    return [...state.deck, ...state.hand, ...state.discard]
}

export function drawCards(state: GameState, n: number, events: GameEvent[], cause: DrawCause): void {
    const cardIds: number[] = []
    for (let i = 0; i < n; i++) {
        if (state.deck.length === 0) {
            state.deck = shuffle(state.streams.shuffle, state.discard)
            state.discard = []
            if (state.deck.length > 0) events.push({ type: 'reshuffled' })
        }
        const card = state.deck.pop()
        if (!card) break
        state.hand.push(card)
        cardIds.push(card.id)
    }
    if (n > 0) events.push({ type: 'drew', cardIds, requested: n, cause })
}

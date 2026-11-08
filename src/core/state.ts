import { cloneRng, shuffle } from './rng'
import type { Card, DrawCause, GameEvent, GameState, HeartSource } from './types'

export const HAND_SIZE = 5
export const ROW_SIZE = 5

export function cloneCard(card: Card): Card {
    return { ...card, fx: card.fx.slice(), ...(card.fxParams && { fxParams: { ...card.fxParams } }) }
}

export function cloneState(state: GameState): GameState {
    const cards = (list: Card[]) => list.map(cloneCard)
    return {
        ...state,
        config: {
            ...state.config,
            steps: state.config.steps.map((step) => ({ ...step })),
            starter: { ...state.config.starter },
            ...(state.config.generator && {
                generator: {
                    ...state.config.generator,
                    allowedTypes: [...state.config.generator.allowedTypes],
                    allowedResources: [...state.config.generator.allowedResources],
                    allowedEffects: [...state.config.generator.allowedEffects],
                },
            }),
        },
        typesPlayed: state.typesPlayed.slice(),
        lastUsed: state.lastUsed && cloneCard(state.lastUsed),
        deck: cards(state.deck),
        hand: cards(state.hand),
        discard: cards(state.discard),
        exile: cards(state.exile),
        row: cards(state.row),
        stats: { ...state.stats, heartsFrom: { ...state.stats.heartsFrom } },
        streams: { gen: cloneRng(state.streams.gen), shuffle: cloneRng(state.streams.shuffle), flip: cloneRng(state.streams.flip) },
    }
}

/** The right-edge card leaves the river. An enemy that leaves costs its hearts. */
export function dropEdge(state: GameState, events: GameEvent[]): void {
    const out = state.row.pop()!
    if (out.kind !== 'enemy') return
    state.hearts -= out.hearts
    state.stats.lostToEscapes += out.hearts
    events.push({ type: 'escaped', card: cloneCard(out), hearts: out.hearts })
}

/** Notes hearts that were just added to the state, so a finished run can say where they came from. */
export function creditHearts(state: GameState, source: HeartSource, amount: number): void {
    if (amount > 0) state.stats.heartsFrom[source] = (state.stats.heartsFrom[source] ?? 0) + amount
}

export function cardCost(state: GameState, card: Card): number {
    if (card.kind === 'recruit') return Math.max(0, card.cost - state.recruitDiscount)
    if (card.kind === 'enemy') return Math.max(0, card.cost - state.enemyDiscount - deckSizeDiscount(state, card))
    return card.cost
}

function deckSizeDiscount(state: GameState, card: Card): number {
    const perCards = card.fxParams?.costPerCards
    return perCards ? Math.floor(ownedCards(state).length / perCards) : 0
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

import { FLIP_LOW, applyMove, cloneState } from '../../core'
import type { Card, EffectId, GameEvent, GameState } from '../../core'

type Resource = 'gold' | 'power' | 'hearts'

export interface HandPreview {
    gold: number
    power: number
    hearts: number
    /** True for a resource that may grow further, so its number is a minimum: a Flip rolls at least its low amount, a draw brings unseen cards. */
    atLeast: Record<Resource, boolean>
}

/** Effects that move or copy what is held. They add nothing of their own, and an Echo depends on what was played last. */
const GIVES_NOTHING: readonly EffectId[] = ['swap', 'echo']

/**
 * What the cards still in the hand give: each card's printed gains, plus the effects that pay by a condition (Vault, Hoard, Army,
 * Bond, a count of enemies in the river and so on), worked out on the board as it is now. Every card is judged on its own, on
 * the current board, so the order of the hand and what you hold or buy do not matter. Swap and Echo count as nothing.
 * Chance and hidden cards stay hidden: a Flip counts at its low amount, and a draw or a cycle brings unseen cards. Those numbers
 * are minimums (`atLeast`). Returns null once the run is over.
 */
export function previewHand(state: GameState): HandPreview | null {
    if (state.status !== 'playing') return null
    const board = state.pendingExile ? applyMove(state, { type: 'skipExile' }).state : state
    const preview: HandPreview = { gold: 0, power: 0, hearts: 0, atLeast: { gold: false, power: false, hearts: false } }
    board.hand.forEach((card, handIndex) => {
        if (!card.played) addCard(preview, board, card, handIndex)
    })
    return preview
}

function addCard(preview: HandPreview, board: GameState, card: Card, handIndex: number): void {
    const probe = cloneState(board)
    probe.hand[handIndex] = { ...card, fx: card.fx.filter((id) => !GIVES_NOTHING.includes(id)) }
    const { events } = applyMove(probe, { type: 'play', handIndex })
    for (const event of events) {
        if (event.type === 'played') {
            preview.gold += event.gains.gold
            preview.power += event.gains.power
            preview.hearts += event.gains.hearts
        }
        noteUnknowns(event, preview)
    }
}

function noteUnknowns(event: GameEvent, preview: HandPreview): void {
    if (event.type === 'flipped') {
        const resource = event.currency === 'power' ? 'power' : 'gold'
        preview[resource] -= event.amount - FLIP_LOW
        preview.atLeast[resource] = true
    } else if (event.type === 'drew' || event.type === 'cycled') {
        preview.atLeast.gold = preview.atLeast.power = preview.atLeast.hearts = true
    }
}

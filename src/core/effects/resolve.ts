import type { Card, Gains, GameEvent, GameState } from '../types'
import { creditHearts } from '../state'
import { EFFECT_BY_ID } from './index'
import type { EffectContext } from './types'

/** Applies a card's gains and effects. Returns defeat gains excluding the card's printed hearts, which the caller adds. */
export function resolveCard(state: GameState, card: Card, source: 'play' | 'defeat', events: GameEvent[], rowEnemies = 0): Gains {
    const tracked: Gains = { gold: source === 'defeat' ? card.gold : 0, power: source === 'defeat' ? card.power : 0, hearts: 0 }
    state.gold += card.gold
    state.power += card.power
    state.hearts += card.hearts
    creditHearts(state, source === 'defeat' ? 'defeat' : 'plain', card.hearts)
    let hadType = false
    if (source === 'play') {
        hadType = state.typesPlayed.includes(card.type)
        if (card.type !== 'plain' && !hadType) state.typesPlayed.push(card.type)
    }
    const ctx: EffectContext = {
        state,
        card,
        events,
        source,
        hadType,
        rowEnemies,
        gain(resource, amount) {
            state[resource] += amount
            if (source === 'defeat') tracked[resource] += amount
        },
    }
    for (const id of card.fx) {
        const before = state.hearts
        EFFECT_BY_ID[id].apply(ctx)
        creditHearts(state, id, state.hearts - before)
    }
    return tracked
}

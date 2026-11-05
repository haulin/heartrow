import { ownedCards } from '../../state'
import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { expectedGain, handCard, LIGHT_WEIGHT, STRONG_WEIGHT } from './util'

/** 10% beat 5%, 15%, 25%, 35% and 50% in a seed sweep and held up on a fresh seed window; see docs/history.md. */
const DEFAULT_MAX_AVERAGE_DROP = 0.1
const UNPLAYED_EXILE_FROM_TURN = 4
/** Weak and Foes act as roughly one Power. */
const ENEMY_EFFECT_POWER = 1
const ENEMY_EFFECTS = ['weak', 'foes']

type Resource = (card: Card) => number

const RESOURCES: readonly Resource[] = [
    (card) => expectedGain(card, 'gold'),
    (card) => expectedGain(card, 'power') + (card.fx.some((fx) => ENEMY_EFFECTS.includes(fx)) ? ENEMY_EFFECT_POWER : 0),
    (card) => card.hearts,
]

function isPlain(card: Card): boolean {
    return card.fx.every((fx) => ENEMY_EFFECTS.includes(fx))
}

function keepsAverages(state: GameState, card: Card, maxDrop: number): boolean {
    const owned = ownedCards(state)
    if (owned.length < 2) return false
    return RESOURCES.every((resource) => {
        const total = owned.reduce((sum, other) => sum + resource(other), 0)
        if (total <= 0) return true
        const before = total / owned.length
        const after = (total - resource(card)) / (owned.length - 1)
        return after >= before * (1 - maxDrop)
    })
}

/** Exiles a plain hand card when the deck's average Gold, Power and Hearts per card each drop by less than `maxDrop`. */
export function exileByAverage(maxDrop: number = DEFAULT_MAX_AVERAGE_DROP): Policy {
    return {
        id: 'exileByAverage',
        weight(state, move) {
            if (move.type === 'skipExile') return 1
            if (move.type !== 'exile') return 1
            const card = handCard(state, move)
            if (!card || !isPlain(card) || !keepsAverages(state, card, maxDrop)) return 0
            if (card.played) return STRONG_WEIGHT
            return state.turn >= UNPLAYED_EXILE_FROM_TURN ? LIGHT_WEIGHT : 0
        },
    }
}

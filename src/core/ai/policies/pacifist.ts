import { cardCost } from '../../state'
import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { handCard, HEART_FX, rowCard, scoreWeight, turnsLeft } from './util'

const isHeart = (card: Card) => card.hearts > 0 || card.fx.some((fx) => HEART_FX[fx])

function playTier(card: Card): number {
    if (isHeart(card)) return 8
    if (card.fx.includes('purge')) return 6
    if (card.gold > 0) return 4
    if (card.fx.length && !card.fx.includes('cycle')) return 2
    return card.fx.length ? 1 : 0
}

function buyScore(state: GameState, card: Card): number {
    if (card.kind === 'enemy') return 0
    if (card.power && !card.gold && !card.hearts && !card.fx.length) return 0
    const heartFx = card.fx.reduce((v, fx) => v + (HEART_FX[fx] ?? 0), 0)
    const exile = card.fx.includes('exile') ? 18 : 0
    const draw = card.fx.includes('draw') ? 8 : 0
    const cycle = card.fx.some((fx) => fx === 'cycle' || fx === 'purge') ? 14 : 0
    return 20 + card.hearts * 25 + card.gold * 4 + heartFx + exile + draw + cycle + card.fx.length * 4 - cardCost(state, card)
}

/** Never fights. Plays heart effects first, buys recruits that give hearts, gold, exile and cycling, and ignores power-only cards. */
export function pacifist(): Policy {
    return {
        id: 'pacifist',
        weight(state, move) {
            const hand = move.type === 'play' ? handCard(state, move) : undefined
            if (hand) return playTier(hand)
            const card = rowCard(state, move)
            if (!card) return 1
            return turnsLeft(state) < 3 ? 0 : scoreWeight(buyScore(state, card), 20)
        },
    }
}

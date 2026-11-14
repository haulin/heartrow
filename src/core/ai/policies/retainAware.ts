import { cardCost, ownedCards } from '../../state'
import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { handCard } from './util'

/** Whether playing a Retain card changes anything. Playing it ends its Retain, so a card that does nothing now is better kept. */
export function retainChanges(state: GameState, card: Card): boolean {
    if (!card.retain) return true
    if (!card.fx.length && !card.hearts) return plainGainChanges(state, card)
    if (card.gold || card.power || card.hearts) return true
    const owned = () => ownedCards(state)
    for (const fx of card.fx) {
        switch (fx) {
            case 'draw':
                return state.deck.length + state.discard.length > 0
            case 'flip':
            case 'cheap':
            case 'reapG':
            case 'reapP':
            case 'exile':
                return true
            case 'swap':
                if (state.gold !== state.power) return true
                break
            case 'foes':
            case 'weak':
                if (state.row.some((c) => c.kind === 'enemy')) return true
                break
            case 'all3':
                if (state.typesPlayed.length >= 3) return true
                break
            case 'vault':
                if (state.exile.length >= 3) return true
                break
            case 'basics':
                if (owned().filter((c) => c.kind === 'basic').length >= 4) return true
                break
            case 'shift':
                if (shiftIsWorthwhile(state, card)) return true
                break
            case 'pile':
                if (state.discard.length >= 3) return true
                break
            case 'bond':
                if (state.typesPlayed.includes(card.type)) return true
                break
            case 'kin':
                if (state.hand.some((c) => c.played && c !== card && c.type === card.type)) return true
                break
            case 'army':
                if (owned().filter((c) => c.type === card.type).length >= 4) return true
                break
            case 'cycle':
            case 'redraw':
                if (state.hand.some((c) => !c.played && c !== card && (fx === 'redraw' || !c.retain))) return true
                break
        }
    }
    return false
}

/** Spare resources that a Shift could turn into a buy from the new river cards. */
const SHIFT_MIN_SPARE = 2
/** A held gain is worth it when a buy it would reach is this close beyond what it adds now: one more turn of income. */
const NEXT_TURN_INCOME = 3

/** Shift only when no enemy would fall off the Gate and there is something left to spend on what it brings. */
export function shiftIsWorthwhile(state: GameState, card: Card): boolean {
    const dropped = state.row.slice(-(card.fxParams?.shiftCount ?? 1))
    if (dropped.some((c) => c.kind === 'enemy')) return false
    return Math.max(state.gold, state.power) >= SHIFT_MIN_SPARE
}

/** A plain gain is held when playing it opens no new buy and a bigger one is about a turn away. */
function plainGainChanges(state: GameState, card: Card): boolean {
    const currency = card.gold ? 'gold' : 'power'
    const have = state[currency]
    const gain = card[currency]
    const costs = state.row.filter((c) => (c.kind === 'recruit') === (currency === 'gold')).map((c) => cardCost(state, c))
    if (costs.some((cost) => cost > have && cost <= have + gain)) return true
    return !costs.some((cost) => cost > have + gain && cost <= have + gain + NEXT_TURN_INCOME)
}

export function retainAware(): Policy {
    return {
        id: 'retainAware',
        weight(state, move) {
            const card = move.type === 'play' ? handCard(state, move) : undefined
            return card && !retainChanges(state, card) ? 0 : 1
        },
    }
}

import { ownedCards } from '../../state'
import type { Card, GameState } from '../../types'
import type { Policy } from '../types'
import { handCard } from './util'

/** Whether playing a Retain card changes anything. Playing it ends its Retain, so a card that does nothing now is better kept. */
export function retainChanges(state: GameState, card: Card): boolean {
    if (!card.retain) return true
    if (card.gold || card.power || card.hearts) return true
    const owned = () => ownedCards(state)
    for (const fx of card.fx) {
        switch (fx) {
            case 'draw':
                return state.deck.length + state.discard.length > 0
            case 'coin':
            case 'cheap':
            case 'weak':
            case 'reapG':
            case 'reapP':
            case 'exile':
                return true
            case 'swap':
                if (state.gold !== state.power) return true
                break
            case 'foes':
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
            case 'purge':
                if (state.hand.some((c) => !c.played && c !== card && (fx === 'purge' || !c.retain))) return true
                break
        }
    }
    return false
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

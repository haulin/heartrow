import { ownedCards } from '../state'
import type { EffectDef } from './types'

export const basics: EffectDef = {
    id: 'basics',
    price: 1.5,
    text: '+1 ● per 4 basic cards in your deck',
    enemies: true,
    lean: ['moss'],
    apply({ state, gain }) {
        gain('gold', Math.floor(ownedCards(state).filter((card) => card.kind === 'basic').length / 4))
    },
}

import { RETAIN_OFTEN } from '../generator/budget'
import type { EffectDef } from './types'

export const exile: EffectDef = {
    id: 'exile',
    price: 1,
    family: 'cards',
    describe: () => 'Exile a card or river recruit',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    extraFor: ['moss', 'ember'],
    apply({ state }) {
        const handTarget = state.hand.length > 0
        const riverTarget = state.row.some((card, index) => index < state.row.length - 1 && card.kind === 'recruit')
        if (handTarget || riverTarget) state.pendingExile = true
    },
}

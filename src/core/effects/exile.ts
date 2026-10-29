import type { EffectDef } from './types'

export const exile: EffectDef = {
    id: 'exile',
    price: 1,
    text: 'Exile a card from hand',
    enemies: true,
    lean: ['tide'],
    extraFor: ['moss', 'ember'],
    apply({ state }) {
        if (state.hand.length > 0) state.pendingExile = true
    },
}

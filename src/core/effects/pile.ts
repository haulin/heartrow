import type { EffectDef } from './types'

export const pile: EffectDef = {
  id: 'pile',
  price: 1.5,
  text: '+1 ⚔ per 3 cards in your discard',
  enemies: true,
  lean: ['ember'],
  retainable: true,
  apply({ state, gain }) {
    gain('power', Math.floor(state.discard.length / 3))
  },
}

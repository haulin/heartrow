import { nextInt } from '../rng'
import { BOND_EXTRA_PRICE, BOND_MAX } from '../generator/budget'
import type { EffectDef } from './types'

const BASE_PRICE = 0.5

export const bond: EffectDef = {
  id: 'bond',
  price: BASE_PRICE,
  text: 'Bond: +{n} {m} if you played {T} earlier this turn',
  enemies: false,
  lean: ['moss'],
  retainable: true,
  roll(rng, card, budget) {
    const left = budget - BASE_PRICE
    let n = 1 + nextInt(rng, BOND_MAX)
    while (n > 1 && (BOND_EXTRA_PRICE[n - 1] as number) > left) n--
    card.bondCount = n
    return BASE_PRICE + (BOND_EXTRA_PRICE[n - 1] as number)
  },
  apply({ state, card, source, hadType }) {
    if (source === 'play' && hadType) state[card.main] += card.bondCount ?? 1
  },
}

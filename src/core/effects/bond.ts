import { nextInt } from '../rng'
import { BOND_EXTRA_PRICE, BOND_MAX } from '../generator/budget'
import { RETAIN_SOMETIMES } from '../generator/budget'
import type { EffectDef } from './types'

const BASE_PRICE = 0.5

export const bond: EffectDef = {
    id: 'bond',
    price: BASE_PRICE,
    text: '+{n} {m} if you played {T} earlier this turn',
    enemies: false,
    lean: ['moss'],
    pays: 'main',
    retain: RETAIN_SOMETIMES,
    roll(rng, card, budget) {
        const left = budget - BASE_PRICE
        let n = 1 + nextInt(rng, BOND_MAX)
        while (n > 1 && (BOND_EXTRA_PRICE[n - 1] as number) > left) n--
        card.fxParams = { ...card.fxParams, bondCount: n }
        return BASE_PRICE + (BOND_EXTRA_PRICE[n - 1] as number)
    },
    apply({ state, card, source, hadType }) {
        if (source === 'play' && hadType) state[card.main] += card.fxParams?.bondCount ?? 1
    },
}

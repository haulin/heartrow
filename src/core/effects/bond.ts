import { nextInt } from '../rng'
import { BOND_EXTRA_PRICE, BOND_MAX } from '../generator/budget'
import { RETAIN_SOMETIMES } from '../generator/budget'
import type { EffectDef } from './types'
import { MAIN_RESOURCES, slot, symbol, typeSlot } from './wording'

const BASE_PRICE = 0.5

export const bond: EffectDef = {
    id: 'bond',
    price: BASE_PRICE,
    family: 'streak',
    describe: (card) =>
        `+${slot(card, (c) => c.fxParams?.bondCount ?? 1, `1-${BOND_MAX}`)} ${slot(card, (c) => symbol(c.main), MAIN_RESOURCES)} if you played ${typeSlot(card)} earlier this turn`,
    needsAny: ['moss', 'ember', 'tide'],
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
    apply({ card, source, hadType, gain }) {
        if (source === 'play' && hadType) gain(card.main, card.fxParams?.bondCount ?? 1)
    },
}

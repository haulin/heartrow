import type { Colour, Currency } from '../types'

/** Enemy budget per point of cost. */
export const HM = 1.4
export const ENEMY_COST_REDUCTION = 2
export const ENEMY_MIN_COST = 1
export const RECRUIT_MIN_COST = 2

export const RECRUIT_BUDGET_PER_COST = 0.85
/**
 * Budget added on top of the per-cost budget, by type. A recruit's cost steps by less than a whole budget unit, so every type skips one cost
 * on whole-number spends; different bases make each type skip a different cost and the mix has no notch. Moss pays the most gold, so it gets the least.
 */
export const RECRUIT_BUDGET_BASE: Record<Colour, number> = { moss: 0.1, ember: 0.3, tide: 0.5 }
/** Guards the recruit cost recompute against float noise. */
export const COST_EPSILON = 1e-9

export const TIDE_POWER_CHANCE = 0.5
export const EFFECT_CHANCE = 0.45
export const TIDE_EFFECT_CHANCE = 0.75
/** Four available effects retain the normal density; narrower pools scale down from there. */
export const EFFECT_DENSITY_FULL_POOL = 4

export const COST_BUMP_CHANCE = 0.1
export const COST_BUMP = 2
export const CHEAP_COST_MIN = 2
export const CHEAP_COST_SPREAD = 3

export const RESOURCE_PRICE: Record<Currency | 'hearts', number> = { gold: 1, power: 1, hearts: 1.5 }
export const HEARTS_CHANCE_FIRST = 0.075
export const HEARTS_CHANCE_FIRST_TIDE = 0.165
export const HEARTS_CHANCE_AFTER_HEARTS = 0.75
export const OTHER_RESOURCE_CHANCE = 0.15
export const ENEMY_GAIN_SHARE = 0.4

/** Deck size at which deck-size effects are priced and at which Bulk costs its rolled enemy cost. */
export const REFERENCE_DECK_SIZE = 16
/** Early turns count fewer cards than the reference count, so a "+N per M cards" effect is priced below its payoff at that count. */
export const COUNT_GAIN_PRICE_FACTOR = 0.75
/** What each "+N per M cards" effect may roll. The `reference` is the count it is priced at; the first step of Vault, Pile and Basics is the old fixed text. */
export const COUNT_GAIN_TERMS = {
    hoard: { amounts: [1, 2], perCards: [4, 5, 6], defaultPerCards: 4, reference: REFERENCE_DECK_SIZE, unitPrice: 1 },
    basics: { amounts: [1, 2], perCards: [3, 4, 5], defaultPerCards: 4, reference: 8, unitPrice: 1 },
    pile: { amounts: [1, 2], perCards: [3, 4, 5], defaultPerCards: 3, reference: 6, unitPrice: 1 },
    vault: { amounts: [1, 2], perCards: [3, 4, 5], defaultPerCards: 3, reference: 5.3, unitPrice: RESOURCE_PRICE.hearts },
} as const
/** All3 pays its resource for playing all three types, at two thirds of the value, so 2 ♥ costs 2 as the fixed text did. Hearts roll smaller amounts. */
export const ALL3_PRICE_FACTOR = 2 / 3
export const ALL3_AMOUNTS = { gold: [2, 3, 4], power: [2, 3, 4], hearts: [1, 2, 3] } as const
export const BULK_CARDS_PER_STEP = 4
/** Effects that roll a tier: a tier costs `unitPrice × tier − offset`. */
export interface TierTerms {
    tiers: readonly number[]
    unitPrice: number
    offset: number
}
/**
 * Weak, Cheap and Exile: a deeper tier costs more per unit, minus a base offset, so one unit costs 1.5 and two cost 4.5.
 * Bond: one card costs 0.5 and each extra one 0.7. Flip pays `tier` or `2 × tier + 1`, and costs 1.5 per tier.
 */
export const TIER_TERMS = {
    discount: { tiers: [1, 2], unitPrice: 3, offset: 1.5 },
    exile: { tiers: [1, 2], unitPrice: 3, offset: 1.5 },
    draw: { tiers: [1, 2, 3, 4], unitPrice: 2.5, offset: 1 },
    bond: { tiers: [1, 2, 3], unitPrice: 0.7, offset: 0.2 },
    flip: { tiers: [1, 2, 3], unitPrice: 1.5, offset: 0 },
} as const satisfies Record<string, TierTerms>
/** Retain terms by how often waiting helps the effect: the more useful it is, the more often a card with that effect gets Retain. */
export const RETAIN_PRICE = 0.5
/** The chance that a plain recruit (no effect) rolls Retain. Not a setting, like the effect chances. */
export const PLAIN_RETAIN_CHANCE = 0.1
export const RETAIN_USUALLY = { price: RETAIN_PRICE, chance: 0.7 }
export const RETAIN_OFTEN = { price: RETAIN_PRICE, chance: 0.5 }
export const RETAIN_SOMETIMES = { price: RETAIN_PRICE, chance: 0.3 }
export const RETAIN_RARELY = { price: RETAIN_PRICE, chance: 0.1 }

/** Reload draws a card per enemy defeated this turn, up to this many. It is priced for that many, a cap that a chain turn would pass. */
export const RELOAD_MAX = 3
export const RELOAD_PRICE = 2
/** Shift makes 1 to this many river cards and lets as many cards fall off the right edge. */
export const SHIFT_MAX = 3
export const SHIFT_PRICE_PER_CARD = 0.75
export const PUSH_PRICE = 1.25
/** More than Exile (1) and as much as Cycle (1.5): a flush replaces four river cards, and the card dilutes the deck as well. */
export const FLUSH_PRICE = 1.5
export const ECHO_PRICE = 3

/**
 * River cards made in one turn (the ones that replace what you buy, a flush and the end of the turn) before the next one is as hard
 * as a card of the following turn. The count starts again every turn, so a long chain of purchases gets harder and a normal turn does not.
 */
export const CARDS_PER_EXTRA_TURN = 7

/** Share of the effect pool given to lean effects. */
export const LEAN_SHARE = 0.7

export const FILLER_MAX_COST = 4
export const FILLER_REROLL_CHANCE = 0.8
export const FILLER_MAX_ATTEMPTS = 3

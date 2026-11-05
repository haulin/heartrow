import type { Currency } from '../types'

/** Enemy budget per point of cost. */
export const HM = 1.4
export const ENEMY_COST_REDUCTION = 2
export const ENEMY_MIN_COST = 1
export const RECRUIT_MIN_COST = 2

export const RECRUIT_BUDGET_PER_COST = 0.85
export const RECRUIT_BUDGET_BASE = 0.3
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

export const DRAW_PRICE_PER_CARD = 1.5
export const DRAW_MAX = 4
export const BOND_MAX = 3
export const BOND_EXTRA_PRICE = [0, 0.7, 1.5] as const
export const RETAIN_PRICE = 0.5
export const RETAIN_CHANCE = 0.8

/** Share of the effect pool given to lean effects. */
export const LEAN_SHARE = 0.7

export const FILLER_MAX_COST = 4
export const FILLER_REROLL_CHANCE = 0.8
export const FILLER_MAX_ATTEMPTS = 3

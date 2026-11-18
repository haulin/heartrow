import { GOALS } from '../modes'
import {
    EFFECT_CHANCE,
    HM,
    PLAIN_RETAIN_CHANCE,
    RECRUIT_BUDGET_BASE,
    RECRUIT_BUDGET_PER_COST,
    RESOURCE_PRICE,
    TIDE_EFFECT_CHANCE,
    TIDE_POWER_CHANCE,
    LEAN_SHARE,
} from './budget'

/** The share of new cards that are enemies from a turn on. Long Run has the most steps, and the levels use the first one. */
export interface EnemyShareStep {
    fromTurn: number
    share: number
}

/** The numbers the generator works with, for the compendium. They are the constants the generator reads, so a page built from them cannot drift. */
export const GENERATION = {
    enemyShareSteps: GOALS[GOALS.length - 1]!.steps.map((step): EnemyShareStep => ({ fromTurn: step.fromTurn, share: step.foeChance })),
    /** The chance that a card of the type carries an effect (before the pool of effects thins it; see `effectChance` in `make.ts`). */
    effectChance: { moss: EFFECT_CHANCE, ember: EFFECT_CHANCE, tide: TIDE_EFFECT_CHANCE, foe: EFFECT_CHANCE },
    plainRetainChance: PLAIN_RETAIN_CHANCE,
    tidePowerChance: TIDE_POWER_CHANCE,
    recruitBudgetPerCost: RECRUIT_BUDGET_PER_COST,
    recruitBudgetBase: RECRUIT_BUDGET_BASE,
    enemyBudgetPerCost: HM,
    resourcePrice: RESOURCE_PRICE,
    leanShare: LEAN_SHARE,
} as const

import { EFFECT_BY_ID, EFFECTS, effectPrice } from '../effects'
import { stepForTurn } from '../modes'
import { chance, nextFloat, nextInt } from '../rng'
import type { Card, CardType, Colour, Currency, EffectId, GameState } from '../types'
import {
  CHEAP_COST_MIN,
  CHEAP_COST_SPREAD,
  COST_BUMP,
  COST_BUMP_CHANCE,
  COST_EPSILON,
  EFFECT_CHANCE,
  ENEMY_COST_REDUCTION,
  ENEMY_MIN_COST,
  FILLER_MAX_ATTEMPTS,
  FILLER_MAX_COST,
  FILLER_REROLL_CHANCE,
  HEARTS_CHANCE_AFTER_HEARTS,
  HEARTS_CHANCE_FIRST,
  HEARTS_CHANCE_FIRST_TIDE,
  HM,
  LEAN_SHARE,
  OTHER_RESOURCE_CHANCE,
  RECRUIT_BUDGET_BASE,
  RECRUIT_BUDGET_PER_COST,
  RECRUIT_MIN_COST,
  RESOURCE_PRICE,
  RETAIN_CHANCE,
  RETAIN_PRICE,
  TIDE_EFFECT_CHANCE,
  TIDE_POWER_CHANCE,
} from './budget'

const COLOURS: readonly Colour[] = ['moss', 'ember', 'tide']

function effectPool(type: CardType, enemy: boolean, budget: number): EffectId[] {
  const pool = EFFECTS.filter((e) => effectPrice(e.id) <= budget && (!enemy || e.enemies)).map((e) => e.id)
  const lean = enemy ? [] : pool.filter((id) => EFFECT_BY_ID[id].lean.includes(type as Colour))
  const copies = Math.max(1, Math.round((LEAN_SHARE * (pool.length - lean.length)) / ((1 - LEAN_SHARE) * Math.max(1, lean.length))))
  for (let i = 1; i < copies; i++) pool.push(...lean)
  if (!enemy) for (const e of EFFECTS) if (e.extraFor?.includes(type as Colour) && pool.includes(e.id)) pool.push(e.id)
  return pool
}

export function makeCard(state: GameState, turn: number, attempt = 0): Card {
  const config = state.config
  const rng = state.streams.gen
  const r = () => nextFloat(rng)
  const step = stepForTurn(config, turn)
  const t = Math.min(turn, config.difficultyCapTurn) / config.difficultyCapTurn
  const enemy = chance(rng, step.foeChance)
  const type: CardType = enemy ? 'foe' : (COLOURS[nextInt(rng, 3)] as Colour)

  const lo = 2 + Math.round(t * 3) + step.costBonus
  const hi = 4 + Math.round(t * 5) + step.costBonus
  let cost = lo + nextInt(rng, hi - lo + 1)
  if (chance(rng, COST_BUMP_CHANCE)) cost += COST_BUMP
  if (chance(rng, step.cheapChance)) cost = CHEAP_COST_MIN + nextInt(rng, CHEAP_COST_SPREAD)
  if (enemy) cost = Math.max(ENEMY_MIN_COST, cost - ENEMY_COST_REDUCTION)

  const card: Card = { id: state.nextCardId++, type, kind: enemy ? 'enemy' : 'recruit', cost, gold: 0, power: 0, hearts: 0, fx: [], main: 'gold' }
  let budget = enemy ? cost * HM : cost * RECRUIT_BUDGET_PER_COST + RECRUIT_BUDGET_BASE
  const budget0 = budget
  const main: Currency = type === 'ember' || (type === 'tide' && chance(rng, TIDE_POWER_CHANCE)) ? 'power' : 'gold'
  card.main = main
  const other: Currency = main === 'gold' ? 'power' : 'gold'

  if (chance(rng, type === 'tide' ? TIDE_EFFECT_CHANCE : EFFECT_CHANCE)) {
    const pool = effectPool(type, enemy, budget)
    if (pool.length > 0) {
      const id = pool[nextInt(rng, pool.length)] as EffectId
      const effect = EFFECT_BY_ID[id]
      card.fx.push(id)
      budget -= effect.roll ? effect.roll(rng, card, budget) : effect.price
      if (!enemy && effect.retainable && budget >= RETAIN_PRICE && chance(rng, RETAIN_CHANCE)) {
        card.retain = true
        budget -= RETAIN_PRICE
      }
    }
  }

  while (budget >= 1) {
    const heartsChance = card.hearts ? HEARTS_CHANCE_AFTER_HEARTS : type === 'tide' ? HEARTS_CHANCE_FIRST_TIDE : HEARTS_CHANCE_FIRST
    const q = r()
    let res: Currency | 'hearts' | '' = enemy ? 'hearts' : q < heartsChance ? 'hearts' : q < heartsChance + OTHER_RESOURCE_CHANCE ? other : main
    if (budget < RESOURCE_PRICE[res]) res = main
    if (enemy && res !== 'hearts') break
    card[res]++
    budget -= RESOURCE_PRICE[res]
  }

  const spent = budget0 - budget
  const fitted = enemy ? Math.ceil(spent / HM) : Math.ceil((spent - RECRUIT_BUDGET_BASE) / RECRUIT_BUDGET_PER_COST - COST_EPSILON)
  card.cost = Math.max(enemy ? ENEMY_MIN_COST : RECRUIT_MIN_COST, Math.min(cost, fitted))
  if (enemy && !card.hearts) card.hearts = 1
  if (!enemy && !card.gold && !card.power && !card.hearts && !card.fx.length) card.gold = 1

  const fillerFrom = config.lateFillerFromTurn
  if (fillerFrom !== null && turn > fillerFrom - 1 && card.kind === 'recruit' && card.cost <= FILLER_MAX_COST && !card.fx.length && attempt < FILLER_MAX_ATTEMPTS && chance(rng, FILLER_REROLL_CHANCE)) {
    return makeCard(state, turn, attempt + 1)
  }
  return card
}

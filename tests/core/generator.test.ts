import { describe, expect, it } from 'vitest'
import { EFFECT_BY_ID, EFFECTS, LONG_MODE, makeCard, newGame, standardMode } from '../../src/core'
import type { Card, ModeConfig } from '../../src/core'
import { BOND_EXTRA_PRICE, RETAIN_PRICE } from '../../src/core/generator/budget'

const PER_TURN = 400

function spentBudget(card: Card): number {
  let spent = card.gold + card.power + card.hearts * 1.5
  for (const id of card.fx) {
    const effect = EFFECT_BY_ID[id]
    spent += effect.perDrawCard ? effect.price * (card.drawCount ?? 1) : effect.price
    if (id === 'bond') spent += BOND_EXTRA_PRICE[(card.bondCount ?? 1) - 1]!
  }
  return spent + (card.retain ? RETAIN_PRICE : 0)
}

function check(mode: ModeConfig, turns: number): number {
  const state = newGame(mode, 11).state
  let count = 0
  for (let turn = 1; turn <= turns; turn++) {
    for (let i = 0; i < PER_TURN; i++, count++) {
      const card = makeCard(state, turn)
      const enemy = card.kind === 'enemy'
      expect(card.fx.length).toBeLessThanOrEqual(1)
      expect(card.cost).toBeGreaterThanOrEqual(enemy ? 1 : 2)
      if (enemy) {
        expect(card.hearts).toBeGreaterThanOrEqual(1)
        expect([card.gold, card.power, card.retain]).toEqual([0, 0, undefined])
        expect(card.type).toBe('foe')
      } else {
        expect(card.gold + card.power + card.hearts + card.fx.length).toBeGreaterThan(0)
        expect(spentBudget(card)).toBeLessThanOrEqual(card.cost * 0.85 + 0.3 + 1e-6)
      }
      for (const id of card.fx) {
        expect(EFFECTS.map((e) => e.id)).toContain(id)
        if (enemy) expect(EFFECT_BY_ID[id].enemies).toBe(true)
        if (card.retain) expect(EFFECT_BY_ID[id].retainable).toBe(true)
      }
      if (card.drawCount !== undefined) expect(card.drawCount).toBeLessThanOrEqual(4)
      if (card.bondCount !== undefined) expect(card.fx).toEqual(['bond'])
      if (card.kinCurrency !== undefined) expect(['kin', 'army']).toContain(card.fx[0])
    }
  }
  return count
}

describe('makeCard', () => {
  it('keeps budget, cost and pool invariants over thousands of cards', () => {
    expect(check(standardMode(0), 24) + check(LONG_MODE, 42)).toBeGreaterThan(20000)
  })

  it('caps cost rolls by turn and adds long-run cost bonus', () => {
    const maxCost = (mode: ModeConfig, turn: number) => {
      const state = newGame(mode, 3).state
      return Math.max(...Array.from({ length: 2000 }, () => makeCard(state, turn)).filter((c) => c.kind === 'recruit').map((c) => c.cost))
    }
    expect(maxCost(standardMode(0), 24)).toBeLessThanOrEqual(11)
    expect(maxCost(standardMode(0), 60)).toBeLessThanOrEqual(11)
    expect(maxCost(LONG_MODE, 40)).toBeGreaterThan(11)
  })
})

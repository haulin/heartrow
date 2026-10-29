import { applyMove, newGame, standardMode } from '../../src/core'
import type { Card, GameEvent, GameState, ModeConfig, Move } from '../../src/core'

let nextId = 9000

export function mk(over: Partial<Card> = {}): Card {
  return { id: nextId++, type: 'moss', kind: 'recruit', cost: 3, gold: 0, power: 0, hearts: 0, fx: [], main: 'gold', ...over }
}

export function enemy(over: Partial<Card> = {}): Card {
  return mk({ type: 'foe', kind: 'enemy', cost: 2, hearts: 1, ...over })
}

export function basicCard(over: Partial<Card> = {}): Card {
  return mk({ type: 'plain', kind: 'basic', cost: 0, gold: 1, ...over })
}

/** A started game with an empty hand, deck and discard that the test can fill. */
export function blank(mode: ModeConfig = standardMode(0), seed = 1): GameState {
  const state = newGame(mode, seed).state
  state.deck = []
  state.hand = []
  state.discard = []
  state.exile = []
  return state
}

export function step(state: GameState, move: Move): { state: GameState; events: GameEvent[] } {
  return applyMove(state, move)
}

export function eventTypes(events: GameEvent[]): string[] {
  return events.map((event) => event.type)
}

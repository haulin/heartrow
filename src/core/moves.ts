import { resolveCard } from './effects/resolve'
import { makeCard } from './generator/make'
import { createStreams, shuffle } from './rng'
import { canAfford, cardCost, cloneCard, cloneState, drawCards, HAND_SIZE, ROW_SIZE } from './state'
import type { Card, GameEvent, GameState, ModeConfig, Move, RejectReason, StepResult } from './types'

const REDRAWN_SLOTS = ROW_SIZE - 1

function basic(id: number, gold: number, power: number): Card {
  return { id, type: 'plain', kind: 'basic', cost: 0, gold, power, hearts: 0, fx: [], main: gold > 0 ? 'gold' : 'power' }
}

export function newGame(config: ModeConfig, seed: number): StepResult {
  const streams = createStreams(seed)
  const state: GameState = {
    mode: config.id,
    config: { ...config, steps: config.steps.map((step) => ({ ...step })), starter: { ...config.starter } },
    seed,
    turn: 1,
    maxTurns: config.turns,
    goal: config.goal,
    status: 'playing',
    goalReached: false,
    hearts: 0,
    gold: 0,
    power: 0,
    recruitDiscount: 0,
    enemyDiscount: 0,
    reapGold: 0,
    reapPower: 0,
    redraws: 1,
    typesPlayed: [],
    pendingExile: false,
    deck: [],
    hand: [],
    discard: [],
    exile: [],
    row: [],
    nextCardId: 1,
    stats: { kills: 0, recruited: 0, exiled: 0, playedCards: 0, lostToEscapes: 0, wastedGold: 0, wastedPower: 0 },
    streams,
  }
  const { basicGold, basicPower } = config.starter
  for (let i = 0; i < basicGold; i++) state.deck.push(basic(state.nextCardId++, 1, 0))
  for (let i = 0; i < basicPower; i++) state.deck.push(basic(state.nextCardId++, 0, 1))
  shuffle(state.streams.shuffle, state.deck)
  for (let i = 0; i < ROW_SIZE; i++) state.row.push(makeCard(state, 1))
  const events: GameEvent[] = []
  drawCards(state, HAND_SIZE, events, 'setup')
  return { state, events }
}

export function legalMoves(state: GameState): Move[] {
  if (state.status !== 'playing') return []
  if (state.pendingExile) {
    return [...state.hand.map((_, handIndex): Move => ({ type: 'exile', handIndex })), { type: 'skipExile' }]
  }
  const moves: Move[] = []
  state.hand.forEach((card, handIndex) => {
    if (!card.played) moves.push({ type: 'play', handIndex })
  })
  state.row.forEach((card, rowIndex) => {
    if (canAfford(state, card)) moves.push({ type: 'take', rowIndex })
  })
  if (state.redraws > 0) moves.push({ type: 'redraw' })
  moves.push({ type: 'endTurn' })
  return moves
}

function validate(state: GameState, move: Move): GameEvent | null {
  const reject = (reason: RejectReason, extra?: { short: number; currency: 'gold' | 'power' }): GameEvent => ({ type: 'rejected', reason, ...extra })
  if (state.status !== 'playing') return reject('gameOver')
  const inRange = (index: number, length: number) => Number.isInteger(index) && index >= 0 && index < length
  switch (move.type) {
    case 'play':
      if (state.pendingExile) return reject('pendingExile')
      if (!inRange(move.handIndex, state.hand.length)) return reject('noSuchCard')
      return state.hand[move.handIndex]!.played ? reject('alreadyPlayed') : null
    case 'exile':
      if (!state.pendingExile) return reject('noExilePending')
      return inRange(move.handIndex, state.hand.length) ? null : reject('noSuchCard')
    case 'skipExile':
      return state.pendingExile ? null : reject('noExilePending')
    case 'take': {
      if (state.pendingExile) return reject('pendingExile')
      if (!inRange(move.rowIndex, state.row.length)) return reject('noSuchCard')
      const card = state.row[move.rowIndex]!
      if (canAfford(state, card)) return null
      const currency = card.kind === 'recruit' ? 'gold' : 'power'
      return reject('cannotAfford', { short: cardCost(state, card) - state[currency], currency })
    }
    case 'redraw':
      if (state.pendingExile) return reject('pendingExile')
      return state.redraws < 1 ? reject('noRedraws') : null
    case 'endTurn':
      return state.pendingExile ? reject('pendingExile') : null
  }
}

function checkGoal(state: GameState, events: GameEvent[]): void {
  if (state.goal !== null && state.hearts >= state.goal && !state.goalReached) {
    state.goalReached = true
    events.push({ type: 'goalReached' })
  }
}

export function applyMove(state: GameState, move: Move): StepResult {
  const rejected = validate(state, move)
  if (rejected) return { state, events: [rejected] }
  const next = cloneState(state)
  const events: GameEvent[] = []
  switch (move.type) {
    case 'play':
      play(next, move.handIndex, events)
      break
    case 'exile': {
      const [card] = next.hand.splice(move.handIndex, 1) as [Card]
      next.exile.push(card)
      next.stats.exiled++
      next.pendingExile = false
      events.push({ type: 'exiled', card: cloneCard(card) })
      break
    }
    case 'skipExile':
      next.pendingExile = false
      events.push({ type: 'exileSkipped' })
      break
    case 'take':
      take(next, move.rowIndex, events)
      break
    case 'redraw':
      redraw(next, events)
      break
    case 'endTurn':
      endTurn(next, events)
      break
  }
  return { state: next, events }
}

function play(state: GameState, handIndex: number, events: GameEvent[]): void {
  const card = state.hand[handIndex]!
  card.played = true
  state.stats.playedCards++
  const before = { gold: state.gold, power: state.power, hearts: state.hearts }
  const played: GameEvent = { type: 'played', card: cloneCard(card), gains: { gold: 0, power: 0, hearts: 0 } }
  events.push(played)
  resolveCard(state, card, 'play', events)
  played.gains = { gold: state.gold - before.gold, power: state.power - before.power, hearts: state.hearts - before.hearts }
  checkGoal(state, events)
}

function take(state: GameState, rowIndex: number, events: GameEvent[]): void {
  const card = state.row[rowIndex]!
  const paid = cardCost(state, card)
  const rowEnemies = card.kind === 'enemy' ? state.row.filter((c) => c.kind === 'enemy').length : 0
  let defeated: GameEvent | null = null
  if (card.kind === 'recruit') {
    state.gold -= paid
    state.discard.push(card)
    state.stats.recruited++
    events.push({ type: 'recruited', card: cloneCard(card), paid })
  } else {
    state.power -= paid
    state.stats.kills++
    defeated = { type: 'defeated', card: cloneCard(card), paid, gains: { gold: 0, power: 0, hearts: card.hearts } }
    events.push(defeated)
  }
  state.row.splice(rowIndex, 1)
  const fresh = makeCard(state, state.turn)
  state.row.unshift(fresh)
  events.push({ type: 'rowRefilled', card: cloneCard(fresh) })
  if (defeated && defeated.type === 'defeated') {
    const gains = resolveCard(state, card, 'defeat', events, rowEnemies)
    defeated.gains = { gold: gains.gold, power: gains.power, hearts: card.hearts + gains.hearts }
  }
  checkGoal(state, events)
}

function redraw(state: GameState, events: GameEvent[]): void {
  state.redraws--
  const kept = state.row[REDRAWN_SLOTS]!
  const cards: Card[] = []
  for (let i = 0; i < REDRAWN_SLOTS; i++) cards.push(makeCard(state, state.turn))
  state.row = [...cards, kept]
  events.push({ type: 'rowRedrawn', cards: cards.map(cloneCard), kept: cloneCard(kept) })
}

function endTurn(state: GameState, events: GameEvent[]): void {
  const out = state.row.pop()!
  if (out.kind === 'enemy') {
    state.hearts -= out.hearts
    state.stats.lostToEscapes += out.hearts
    events.push({ type: 'escaped', card: cloneCard(out), hearts: out.hearts })
  }
  const incoming = makeCard(state, state.turn + 1)
  state.row.unshift(incoming)
  events.push({ type: 'rowRefilled', card: cloneCard(incoming) })

  const keep = state.hand.filter((c) => c.retain && !c.played)
  for (const c of state.hand) c.played = false
  state.discard.push(...state.hand.filter((c) => !keep.includes(c)))
  state.hand = keep
  if (keep.length > 0) events.push({ type: 'retained', count: keep.length })

  const reaped = state.reapGold * Math.floor(state.gold / 3) + state.reapPower * Math.floor(state.power / 2)
  if (reaped) {
    state.hearts += reaped
    events.push({ type: 'reaped', hearts: reaped })
  }
  state.stats.wastedGold += state.gold
  state.stats.wastedPower += state.power
  state.reapGold = state.reapPower = 0
  state.gold = state.power = state.recruitDiscount = state.enemyDiscount = 0
  state.typesPlayed = []

  const goal = state.goal
  if (goal !== null && state.hearts >= goal) {
    state.status = 'won'
  } else if (state.turn >= state.maxTurns) {
    state.status = goal === null ? 'finished' : state.hearts >= goal ? 'won' : 'lost'
  }
  if (state.status !== 'playing') {
    events.push({ type: 'gameOver', status: state.status })
    return
  }

  state.turn++
  const redrawGained = (state.turn - 1) % state.config.redrawEvery === 0
  if (redrawGained) state.redraws++
  events.push({ type: 'turnStarted', turn: state.turn, redrawGained })
  drawCards(state, HAND_SIZE, events, 'turnStart')
}

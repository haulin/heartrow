import { applyMove, legalMoves, newGame } from '../moves'
import { createRng } from '../rng'
import { ownedCards } from '../state'
import type { GameState, ModeConfig, Move } from '../types'
import { composePolicies, pickMove } from './compose'
import type { PickOptions, Profile } from './types'

export interface PlayOptions {
  /** Hard cap on moves per game. */
  maxMoves?: number
  /** After this many moves in one turn the driver ends the turn itself. */
  maxMovesPerTurn?: number
  pick?: PickOptions
}

export interface GameSummary {
  hearts: number
  goalHit: boolean
  kills: number
  lostToEscapes: number
  bought: number
  exiled: number
  cards: number
  plays: number
  turns: number
  wastedGold: number
  wastedPower: number
  redrawsLeft: number
  heartsT24: number | null
  moves: number
  capped: boolean
}

export interface GameResult {
  state: GameState
  summary: GameSummary
}

export const DEFAULT_MAX_MOVES = 4000
export const DEFAULT_MAX_MOVES_PER_TURN = 80

/** Plays one full game. The bot uses its own rng (`botSeed`), never the game's streams. */
export function playGame(config: ModeConfig, seed: number, profile: Profile, botSeed: number = seed, options: PlayOptions = {}): GameResult {
  const maxMoves = options.maxMoves ?? DEFAULT_MAX_MOVES
  const maxMovesPerTurn = options.maxMovesPerTurn ?? DEFAULT_MAX_MOVES_PER_TURN
  const pick = options.pick ?? profile.pick
  const policy = composePolicies(profile.policies, profile.id)
  const rng = createRng(botSeed, 'bot')
  let state = newGame(config, seed).state
  let moves = 0
  let turnMoves = 0
  let turn = state.turn
  let heartsT24: number | null = null
  while (state.status === 'playing' && moves < maxMoves) {
    if (state.turn !== turn) {
      turn = state.turn
      turnMoves = 0
    }
    const legal = legalMoves(state)
    let move: Move | null
    if (turnMoves >= maxMovesPerTurn) move = state.pendingExile ? { type: 'skipExile' } : { type: 'endTurn' }
    else move = pickMove(state, legal, policy, rng, pick)
    if (!move) break
    if (move.type === 'endTurn' && state.turn === 24) heartsT24 = state.hearts
    state = applyMove(state, move).state
    moves++
    turnMoves++
  }
  const goal = state.goal
  return {
    state,
    summary: {
      hearts: state.hearts,
      goalHit: goal !== null && state.hearts >= goal,
      kills: state.stats.kills,
      lostToEscapes: state.stats.lostToEscapes,
      bought: state.stats.recruited,
      exiled: state.stats.exiled,
      cards: ownedCards(state).length,
      plays: state.stats.playedCards,
      turns: state.turn,
      wastedGold: state.stats.wastedGold,
      wastedPower: state.stats.wastedPower,
      redrawsLeft: state.redraws,
      heartsT24,
      moves,
      capped: state.status === 'playing',
    },
  }
}

/** Game seed for game `index` of a batch. Different batches (base seeds) never share game seeds in practice. */
export function batchSeed(baseSeed: number, index: number): number {
  return (Math.imul(baseSeed, 1000003) + index) >>> 0
}

export function runBatch(config: ModeConfig, makeProfile: () => Profile, games: number, baseSeed: number, options: PlayOptions = {}): GameSummary[] {
  const out: GameSummary[] = []
  for (let i = 0; i < games; i++) {
    const seed = batchSeed(baseSeed, i)
    out.push(playGame(config, seed, makeProfile(), batchSeed(baseSeed + 7919, i), options).summary)
  }
  return out
}

export interface BatchStats {
  games: number
  goalHitRate: number
  meanHearts: number
  medianHearts: number
  p10Hearts: number
  meanKills: number
  meanLost: number
  meanTurns: number
  meanBought: number
  meanExiled: number
  meanCards: number
  meanPlaysPerTurn: number
  meanRedrawsLeft: number
  meanWastedGold: number
  meanWastedPower: number
  meanHeartsT24: number | null
  bestHearts: number
  capped: number
}

export function aggregate(results: readonly GameSummary[]): BatchStats {
  const n = results.length
  const mean = (f: (r: GameSummary) => number) => results.reduce((sum, r) => sum + f(r), 0) / n
  const sorted = results.map((r) => r.hearts).sort((a, b) => a - b)
  const t24 = results.filter((r) => r.heartsT24 !== null)
  return {
    games: n,
    goalHitRate: mean((r) => (r.goalHit ? 1 : 0)),
    meanHearts: mean((r) => r.hearts),
    medianHearts: sorted[n >> 1]!,
    p10Hearts: sorted[Math.floor(n * 0.1)]!,
    meanKills: mean((r) => r.kills),
    meanLost: mean((r) => r.lostToEscapes),
    meanTurns: mean((r) => r.turns),
    meanBought: mean((r) => r.bought),
    meanExiled: mean((r) => r.exiled),
    meanCards: mean((r) => r.cards),
    meanPlaysPerTurn: mean((r) => r.plays / r.turns),
    meanRedrawsLeft: mean((r) => r.redrawsLeft),
    meanWastedGold: mean((r) => r.wastedGold),
    meanWastedPower: mean((r) => r.wastedPower),
    meanHeartsT24: t24.length ? t24.reduce((sum, r) => sum + r.heartsT24!, 0) / t24.length : null,
    bestHearts: sorted[n - 1]!,
    capped: results.filter((r) => r.capped).length,
  }
}

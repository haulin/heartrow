import { canAfford } from '../../state'
import { stepForTurn } from '../../modes'
import { generatorLimits } from '../../generator/limits'
import {
    CHEAP_COST_MIN,
    CHEAP_COST_SPREAD,
    COST_BUMP,
    COST_BUMP_CHANCE,
    ENEMY_COST_REDUCTION,
    ENEMY_MIN_COST,
    RECRUIT_MIN_COST,
} from '../../generator/budget'
import type { Card, EffectId, GameState, Move } from '../../types'
import type { Policy } from '../types'

export const HEART_FX: Partial<Record<EffectId, number>> = { all3: 10, vault: 8, reapG: 8, reapP: 8 }

/** Common policy factors. Most preferences stay between 1 and 10; smaller values reserve the last-resort phase. */
export const PLAY_LAYER = 10
export const END_TURN_WEIGHT = 0.1
export const IDLE_REDRAW_WEIGHT = 0.2
export const STRONG_WEIGHT = 8
export const MEDIUM_WEIGHT = 4
export const LIGHT_WEIGHT = 2
const REDRAW_RISK_STEP = 5

/** Maps an unbounded score to the ordinary sampled-weight range, with zero kept as a deliberate veto. */
export function scoreWeight(score: number, scale: number): number {
    return score <= 0 ? 0 : Math.min(10, 1 + score / scale)
}

export function handCard(state: GameState, move: Move): Card | undefined {
    if (move.type === 'play') return state.hand[move.handIndex]
    return move.type === 'exile' && 'handIndex' in move ? state.hand[move.handIndex] : undefined
}

export function exileCard(state: GameState, move: Move): Card | undefined {
    if (move.type !== 'exile') return undefined
    return 'handIndex' in move ? state.hand[move.handIndex] : state.row[move.rowIndex]
}

export function rowCard(state: GameState, move: Move): Card | undefined {
    return move.type === 'take' ? state.row[move.rowIndex] : undefined
}

export type GainResource = 'gold' | 'power'

/** A card's plain gain of one resource, counting Flip's +3 when it pays that resource. */
export function expectedGain(card: Card, resource: GainResource): number {
    const flipGain = card.fxParams?.currency === resource && card.fx.includes('flip') ? 3 : 0
    return resource === 'gold' ? card.gold + flipGain : card.power + flipGain
}

export function turnsLeft(state: GameState): number {
    return state.maxTurns - state.turn
}

// TODO: Share the base cost curve with generator/make.ts so this heuristic cannot drift from card generation.
/** Estimates the current generator's average card cost before card-specific budget fitting. */
export function expectedCardCost(state: GameState, kind: 'recruit' | 'enemy'): number {
    if (!canGenerate(state, kind)) return 0
    const step = stepForTurn(state.config, state.turn)
    const t = Math.min(state.turn, state.config.difficultyCapTurn) / state.config.difficultyCapTurn
    const lo = 2 + Math.round(t * 3) + step.costBonus
    const hi = 4 + Math.round(t * 5) + step.costBonus
    const normal = (lo + hi) / 2 + COST_BUMP_CHANCE * COST_BUMP
    const cheap = CHEAP_COST_MIN + (CHEAP_COST_SPREAD - 1) / 2
    const raw = normal * (1 - step.cheapChance) + cheap * step.cheapChance
    const base = kind === 'enemy' ? Math.max(ENEMY_MIN_COST, raw - ENEMY_COST_REDUCTION) : Math.max(RECRUIT_MIN_COST, raw)
    const discount = kind === 'enemy' ? state.enemyDiscount : state.recruitDiscount
    return Math.max(0, base - discount)
}

/** Returns true when at least one resource exceeds the current average cost estimate. */
export function hasReasonableResources(state: GameState): boolean {
    const costAllowance = Math.max(0, state.redraws - 1) / REDRAW_RISK_STEP
    return (
        (canGenerate(state, 'recruit') && state.gold > expectedCardCost(state, 'recruit') - costAllowance) ||
        (canGenerate(state, 'enemy') && state.power > expectedCardCost(state, 'enemy') - costAllowance)
    )
}

/** True when some legal take is a card none of the given buying policies vetoes. With no buyers, any take counts. */
export function wantsToBuy(state: GameState, moves: readonly Move[], buyers: readonly Policy[]): boolean {
    return moves.some((move) => move.type === 'take' && buyers.every((buyer) => buyer.weight(state, move, moves) > 0))
}

function canGenerate(state: GameState, kind: 'recruit' | 'enemy'): boolean {
    const limits = generatorLimits(state.config.generator)
    return kind === 'enemy' ? limits.enemies : limits.colours.length > 0
}

export interface RedrawMemory {
    (state: GameState): { redrawn: boolean; stuck: boolean }
}

/** Remembers whether the row was redrawn this turn, and whether that redraw happened with nothing affordable. Call it with every state a policy sees. */
export function redrawMemory(): RedrawMemory {
    let prev: GameState | null = null
    let redrawn = false
    let stuck = false
    return (state) => {
        if (state !== prev) {
            if (!prev || state.seed !== prev.seed || state.turn !== prev.turn) {
                redrawn = false
                stuck = false
            } else if (state.redraws < prev.redraws) {
                redrawn = true
                const before = prev
                if (!before.row.some((card) => canAfford(before, card))) stuck = true
            }
            prev = state
        }
        return { redrawn, stuck }
    }
}

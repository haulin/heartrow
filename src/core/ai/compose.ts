import { nextFloat, nextInt } from '../rng'
import type { Rng } from '../rng'
import type { GameState, Move } from '../types'
import type { PickOptions, Policy } from './types'

export function composePolicies(policies: readonly Policy[], id = policies.map((p) => p.id).join('*')): Policy {
  return {
    id,
    weight(state, move, moves) {
      let product = 1
      for (const policy of policies) product *= clean(policy.weight(state, move, moves))
      return product
    },
  }
}

function clean(weight: number): number {
  return weight > 0 && weight < Infinity ? weight : 0
}

const DEFAULT_PICK: PickOptions = { mode: 'sample', epsilon: 0 }

/** Weighted random choice with the bot's own rng. Falls back to a uniform choice when every weight is 0. Returns null when there are no moves. */
export function pickMove(state: GameState, moves: readonly Move[], policy: Policy, rng: Rng, options: PickOptions = DEFAULT_PICK): Move | null {
  if (moves.length === 0) return null
  const uniform = () => moves[nextInt(rng, moves.length)]!
  if (options.mode === 'greedy' && options.epsilon > 0 && nextFloat(rng) < options.epsilon) return uniform()
  const weights = moves.map((move) => clean(policy.weight(state, move, moves)))
  if (options.mode === 'greedy') {
    let best = -1
    let bestWeight = 0
    weights.forEach((w, i) => {
      if (w > bestWeight) {
        best = i
        bestWeight = w
      }
    })
    return best < 0 ? uniform() : moves[best]!
  }
  let total = 0
  for (const w of weights) total += w
  if (total <= 0) return uniform()
  let r = nextFloat(rng) * total
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i]!
    if (r < 0) return moves[i]!
  }
  return moves[moves.length - 1]!
}

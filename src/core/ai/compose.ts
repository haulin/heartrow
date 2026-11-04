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

/** Chooses with the bot's own rng. Sampled weights can be raised by `samplePower`; zero weights stay vetoes. */
export function pickMove(
    state: GameState,
    moves: readonly Move[],
    policy: Policy,
    rng: Rng,
    options: PickOptions = DEFAULT_PICK,
): Move | null {
    if (moves.length === 0) return null
    const uniform = () => moves[nextInt(rng, moves.length)]!
    if (options.mode === 'greedy' && options.epsilon > 0 && nextFloat(rng) < options.epsilon) return uniform()
    const samplePower = options.samplePower ?? 1
    const weights = moves.map((move) => {
        const weight = clean(policy.weight(state, move, moves))
        return options.mode === 'sample' ? Math.pow(weight, samplePower) : weight
    })
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

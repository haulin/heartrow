import { cardCost, ownedCards } from '../../state'
import type { Card, EffectId, GameState } from '../../types'
import type { Policy } from '../types'
import { expectedGain, rowCard, scoreWeight } from './util'

export interface PhaseThresholds {
    earlyEnd: number
    lateStart: number
}

export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = { earlyEnd: 6, lateStart: 16 }

const EFFECT_VALUE: Partial<Record<EffectId, number>> = {
    all3: 0,
    army: 0,
    basics: 0,
    bond: 0,
    cheap: 3,
    coin: 3,
    cycle: 5,
    draw: 6,
    exile: 5,
    foes: 4,
    kin: 0,
    pile: 0,
    purge: 5,
    reapG: 1,
    reapP: 1,
    swap: 3,
    vault: 0,
    weak: 3,
}

const HEART_EFFECT_VALUE: Partial<Record<EffectId, number>> = { reapG: 4, reapP: 4 }

function effectValue(state: GameState, card: Card): number {
    const owned = ownedCards(state)
    return card.fx.reduce((score, fx) => {
        const copies = owned.filter((other) => other.fx.includes(fx)).length
        return score + (EFFECT_VALUE[fx] ?? 2) / (copies + 1)
    }, 0)
}

function heartValue(card: Card): number {
    return card.hearts * 6 + card.fx.reduce((score, fx) => score + (HEART_EFFECT_VALUE[fx] ?? 0), 0)
}

function score(state: GameState, card: Card, { earlyEnd, lateStart }: PhaseThresholds): number {
    const cost = cardCost(state, card)
    const gold = expectedGain(card, 'gold')
    const power = expectedGain(card, 'power')
    const effects = effectValue(state, card)
    const hearts = heartValue(card)

    if (state.turn >= lateStart) {
        if (!card.hearts && !card.fx.some((fx) => HEART_EFFECT_VALUE[fx] !== undefined)) return 0
        return hearts + effects - cost * 0.5
    }
    if (state.turn <= earlyEnd) return gold * 4 + power * 1.5 + effects + card.hearts * 0.5 - cost * 0.5
    return gold * 2 + power * 3 + effects * 2 + card.hearts - cost * 0.5
}

/** A lab-only buyer that changes focus from early economy to mid-run power/effects and late hearts. */
export function phaseBuy(thresholds: PhaseThresholds = DEFAULT_PHASE_THRESHOLDS): Policy {
    return {
        id: 'phaseBuy',
        weight(state, move) {
            const card = rowCard(state, move)
            return card?.kind === 'recruit' ? scoreWeight(score(state, card, thresholds), 3) : 1
        },
    }
}

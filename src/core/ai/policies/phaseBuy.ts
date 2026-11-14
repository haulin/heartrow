import { generatorLimits } from '../../generator/limits'
import { cardCost, ownedCards } from '../../state'
import type { Card, EffectId, GameState } from '../../types'
import type { Policy } from '../types'
import { expectedGain, paysHearts, rowCard, scoreWeight } from './util'

export interface PhaseThresholds {
    earlyEnd: number
    lateStart: number
}

export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = { earlyEnd: 6, lateStart: 16 }
/** Without enemies, hearts are the only way to score, so the heart phase starts early. */
export const NO_ENEMY_PHASE_THRESHOLDS: PhaseThresholds = { earlyEnd: 3, lateStart: 8 }

const EFFECT_VALUE: Partial<Record<EffectId, number>> = {
    all3: 0,
    army: 0,
    basics: 0,
    bond: 0,
    cheap: 3,
    flip: 3,
    cycle: 5,
    draw: 6,
    exile: 7,
    foes: 4,
    shift: 1,
    kin: 0,
    pile: 0,
    redraw: 5,
    reapG: 1,
    reapP: 1,
    swap: 3,
    vault: 0,
    weak: 3,
}

const HEART_EFFECT_VALUE = 4

function heartEffectValue(card: Card, fx: EffectId): number | undefined {
    return paysHearts(card, fx) ? HEART_EFFECT_VALUE : undefined
}

/** Effects that do the same job share one count, so a Redraw halves the value of a Cycle. */
const EFFECT_FAMILY: Partial<Record<EffectId, EffectId>> = { redraw: 'cycle' }

function family(fx: EffectId): EffectId {
    return EFFECT_FAMILY[fx] ?? fx
}

/** A flush is only worth taking while the bot has no spare one: it uses them when stuck, so stock beyond a couple goes unused. */
const SPARE_FLUSHES = 2

function effectValue(state: GameState, card: Card): number {
    const owned = ownedCards(state)
    return card.fx.reduce((score, fx) => {
        if (fx === 'flush') return score + (state.flushes >= SPARE_FLUSHES ? 0 : 1)
        const copies = owned.filter((other) => other.fx.some((otherFx) => family(otherFx) === family(fx))).length
        return score + (EFFECT_VALUE[fx] ?? 2) / (copies + 1)
    }, 0)
}

function heartValue(card: Card): number {
    return card.hearts * 6 + card.fx.reduce((score, fx) => score + (heartEffectValue(card, fx) ?? 0), 0)
}

function score(state: GameState, card: Card, { earlyEnd, lateStart }: PhaseThresholds): number {
    const cost = cardCost(state, card)
    const gold = expectedGain(card, 'gold')
    const power = expectedGain(card, 'power')
    const effects = effectValue(state, card)
    const hearts = heartValue(card)

    if (state.turn >= lateStart) {
        if (!card.hearts && !card.fx.some((fx) => heartEffectValue(card, fx) !== undefined)) return 0
        return hearts + effects - cost * 0.5
    }
    if (state.turn <= earlyEnd) return gold * 4 + power * 1.5 + effects + card.hearts * 0.5 - cost * 0.5
    return gold * 2 + power * 3 + effects * 2 + card.hearts - cost * 0.5
}

function phaseFor(state: GameState): PhaseThresholds {
    return generatorLimits(state.config.generator).enemies ? DEFAULT_PHASE_THRESHOLDS : NO_ENEMY_PHASE_THRESHOLDS
}

/** A lab-only buyer that changes focus from early economy to mid-run power/effects and late hearts. */
export function phaseBuy(thresholds?: PhaseThresholds): Policy {
    return {
        id: 'phaseBuy',
        weight(state, move) {
            const card = rowCard(state, move)
            return card?.kind === 'recruit' ? scoreWeight(score(state, card, thresholds ?? phaseFor(state)), 3) : 1
        },
    }
}

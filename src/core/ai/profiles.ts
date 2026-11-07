import { lookahead } from './lookahead'
import type { PickOptions, Policy, Profile } from './types'
import {
    DEFAULT_PHASE_THRESHOLDS,
    buyBuild,
    buyEnemies,
    buyValue,
    drawFirst,
    edgeFollowUp,
    effectCardsFirst,
    endTurnWhenDone,
    exileByAverage,
    exileChoices,
    humanPlayOrder,
    noRecruits,
    pacifist,
    phaseBuy,
    playsFirst,
    protectEdge,
    flushMemory,
    flushWhenStuck,
    retainAware,
    rush,
    smartBuy,
    smartFlush,
} from './policies'
import type { PhaseThresholds } from './policies'

export const PROFILE_IDS = ['random', 'mixed', 'none', 'build', 'rush', 'pacifist', 'smart'] as const
/** The six named personalities plus a uniform random control. `lookahead` is an experiment and is not part of the normal baseline. */
export const LAB_PROFILE_IDS = ['lab-random', 'lab-play', 'lab-retain', 'lab-draw', 'lab-human'] as const
export type SelectionMode = 'sample' | 'greedy'
export type ProfileId = (typeof PROFILE_IDS)[number] | (typeof LAB_PROFILE_IDS)[number] | 'lookahead'
export const ALL_PROFILE_IDS: readonly ProfileId[] = [...PROFILE_IDS, ...LAB_PROFILE_IDS, 'lookahead']
export interface ProfileOptions {
    phase?: PhaseThresholds
}

const GREEDY = { mode: 'greedy', epsilon: 0 } as const
const SAMPLED = { mode: 'sample', epsilon: 0, samplePower: 2 } as const

function pickOptions(id: ProfileId, selection?: SelectionMode): PickOptions {
    if (selection === 'greedy') return GREEDY
    if (selection === 'sample') return SAMPLED
    // Only the uniform control samples: greedy on a flat product would just take the first legal move.
    return id === 'random' ? SAMPLED : GREEDY
}

/** Plays come before takes, takes before flushes and ending the turn (see the layers in policies/util.ts). */
const turnOrder = (): Policy[] => [playsFirst(), retainAware(), drawFirst()]

export function makeProfile(id: ProfileId, selection?: SelectionMode, options?: ProfileOptions): Profile {
    const memory = flushMemory()
    const fighter = (): Policy[] => [...turnOrder(), exileChoices(), effectCardsFirst()]
    /** Flush and end turn ask the buying policies whether any card in the row is worth taking. */
    const tail = (buyers: readonly Policy[], lateStart?: number): Policy[] => [
        flushWhenStuck(memory, { lateStart, buyers }),
        endTurnWhenDone(buyers),
    ]
    let policies: Policy[]
    switch (id) {
        case 'random':
            return { id, policies: [], pick: pickOptions(id, selection) }
        case 'lab-random':
            policies = []
            break
        case 'lab-play':
            policies = [playsFirst()]
            break
        case 'lab-retain':
            policies = [playsFirst(), retainAware()]
            break
        case 'lab-draw':
            policies = [playsFirst(), retainAware(), drawFirst()]
            break
        case 'lab-human': {
            const buyers = [buyEnemies(), phaseBuy(options?.phase)]
            policies = [
                ...turnOrder(),
                humanPlayOrder(),
                exileByAverage(),
                edgeFollowUp(memory, buyers),
                ...buyers,
                ...tail(buyers, (options?.phase ?? DEFAULT_PHASE_THRESHOLDS).lateStart),
            ]
            break
        }
        case 'mixed': {
            const buyers = [buyEnemies(), buyValue()]
            policies = [...fighter(), edgeFollowUp(memory, buyers), ...buyers, protectEdge(memory), ...tail(buyers)]
            break
        }
        case 'none': {
            const buyers = [buyEnemies(), noRecruits()]
            policies = [...fighter(), ...buyers, ...tail(buyers)]
            break
        }
        case 'build': {
            const buyers = [buyEnemies(), buyBuild(), buyValue()]
            policies = [...fighter(), edgeFollowUp(memory, buyers), ...buyers, ...tail(buyers)]
            break
        }
        case 'rush': {
            const buyers = [buyEnemies(), buyValue(), rush()]
            policies = [...fighter(), ...buyers, ...tail(buyers)]
            break
        }
        case 'pacifist': {
            const buyers = [pacifist()]
            policies = [...turnOrder(), exileChoices({ pacifist: true }), ...buyers, ...tail(buyers)]
            break
        }
        case 'smart': {
            const buyers = [smartBuy()]
            policies = [...turnOrder(), exileChoices(), ...buyers, smartFlush(memory), protectEdge(memory), endTurnWhenDone(buyers)]
            break
        }
        case 'lookahead':
            policies = [...turnOrder(), exileChoices(), effectCardsFirst(), lookahead(() => makeProfile('mixed'))]
            break
    }
    return { id, policies, pick: pickOptions(id, selection) }
}

import { lookahead } from './lookahead'
import type { PickOptions, Policy, Profile } from './types'
import {
    buyBuild,
    buyEnemies,
    buyValue,
    deckCurveBuy,
    drawFirst,
    effectCardsFirst,
    endTurnWhenDone,
    exileChoices,
    humanPlayOrder,
    noRecruits,
    pacifist,
    phaseBuy,
    phaseRedraw,
    playsFirst,
    protectEdge,
    redrawMemory,
    redrawWhenStuck,
    retainAware,
    rush,
    smartBuy,
    smartRedraw,
} from './policies'
import type { PhaseThresholds } from './policies'

export const PROFILE_IDS = ['random', 'mixed', 'none', 'build', 'rush', 'pacifist', 'smart'] as const
/** The six named personalities plus a uniform random control. `lookahead` is an experiment and is not part of the normal baseline. */
export const LAB_PROFILE_IDS = ['lab-random', 'lab-play', 'lab-retain', 'lab-draw', 'lab-human', 'lab-human-curve'] as const
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
    return id === 'lookahead' ? GREEDY : SAMPLED
}

/** Plays come before takes, takes before redraws and ending the turn (see the layers in policies/util.ts). */
const turnOrder = (): Policy[] => [playsFirst(), retainAware(), drawFirst()]

export function makeProfile(id: ProfileId, selection?: SelectionMode, options?: ProfileOptions): Profile {
    const memory = redrawMemory()
    const fighter = (): Policy[] => [...turnOrder(), exileChoices(), effectCardsFirst(), buyEnemies()]
    const tail = (): Policy[] => [redrawWhenStuck(memory), endTurnWhenDone()]
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
        case 'lab-human':
            policies = [
                ...turnOrder(),
                humanPlayOrder(),
                exileChoices(),
                buyEnemies(),
                phaseBuy(options?.phase),
                phaseRedraw(options?.phase),
                ...tail(),
            ]
            break
        case 'lab-human-curve':
            policies = [
                ...turnOrder(),
                humanPlayOrder(),
                exileChoices(),
                buyEnemies(),
                deckCurveBuy(options?.phase),
                phaseRedraw(options?.phase),
                ...tail(),
            ]
            break
        case 'mixed':
            policies = [...fighter(), buyValue(), protectEdge(memory), ...tail()]
            break
        case 'none':
            policies = [...fighter(), noRecruits(), ...tail()]
            break
        case 'build':
            policies = [...fighter(), buyBuild(), buyValue(), ...tail()]
            break
        case 'rush':
            policies = [...fighter(), buyValue(), rush(), ...tail()]
            break
        case 'pacifist':
            policies = [...turnOrder(), exileChoices({ pacifist: true }), pacifist(), ...tail()]
            break
        case 'smart':
            policies = [...turnOrder(), exileChoices(), smartBuy(), smartRedraw(memory), protectEdge(memory), endTurnWhenDone()]
            break
        case 'lookahead':
            policies = [...turnOrder(), exileChoices(), effectCardsFirst(), lookahead(() => makeProfile('mixed'))]
            break
    }
    return { id, policies, pick: pickOptions(id, selection) }
}

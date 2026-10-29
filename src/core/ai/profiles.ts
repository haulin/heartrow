import { lookahead } from './lookahead'
import type { Policy, Profile } from './types'
import {
    buyBuild,
    buyEnemies,
    buyValue,
    drawFirst,
    effectCardsFirst,
    endTurnWhenDone,
    exileChoices,
    noRecruits,
    pacifist,
    playsFirst,
    protectEdge,
    redrawMemory,
    redrawWhenStuck,
    retainAware,
    rush,
    smartBuy,
    smartRedraw,
} from './policies'

export const PROFILE_IDS = ['mixed', 'none', 'build', 'rush', 'pacifist', 'smart'] as const
/** The six profiles that reproduce the v7 bots. `lookahead` is an experiment and is not part of the baseline comparison. */
export type ProfileId = (typeof PROFILE_IDS)[number] | 'lookahead'
export const ALL_PROFILE_IDS: readonly ProfileId[] = [...PROFILE_IDS, 'lookahead']

const GREEDY = { mode: 'greedy', epsilon: 0 } as const

/** Plays come before takes, takes before redraws and ending the turn (see the layers in policies/util.ts). */
const turnOrder = (): Policy[] => [playsFirst(), retainAware(), drawFirst()]

export function makeProfile(id: ProfileId): Profile {
    const memory = redrawMemory()
    const fighter = (): Policy[] => [...turnOrder(), exileChoices(), effectCardsFirst(), buyEnemies()]
    const tail = (): Policy[] => [redrawWhenStuck(memory), endTurnWhenDone()]
    let policies: Policy[]
    switch (id) {
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
    return { id, policies, pick: GREEDY }
}

import type { DifficultyStep, ModeConfig } from './types'

/**
 * One target to play for: how many hearts, in how many turns, and how the difficulty scales. A goal is plain data, so a new one (another length, an easier ramp) is a new record here and no new code.
 */
export interface GoalDef {
    /** What a link says after `goal=`. */
    key: string
    name: string
    target: number
    turns: number
    difficultyCapTurn: number
    steps: DifficultyStep[]
    lateFillerFromTurn: number | null
}

const STANDARD_STEPS: DifficultyStep[] = [{ fromTurn: 1, costBonus: 0, foeChance: 0.35, cheapChance: 0.15 }]

const LONG_STEPS: DifficultyStep[] = [
    { fromTurn: 1, costBonus: 0, foeChance: 0.35, cheapChance: 0.15 },
    { fromTurn: 25, costBonus: 1, foeChance: 0.4, cheapChance: 0.08 },
    { fromTurn: 37, costBonus: 2, foeChance: 0.45, cheapChance: 0.08 },
]

function level(number: number, target: number): GoalDef {
    return {
        key: String(number),
        name: `Level ${number}`,
        target,
        turns: 24,
        difficultyCapTurn: 24,
        steps: STANDARD_STEPS,
        lateFillerFromTurn: null,
    }
}

/** Long Run differs from the levels only in its length and its difficulty ramp. */
export const GOALS: readonly GoalDef[] = [
    level(1, 48),
    level(2, 64),
    level(3, 80),
    level(4, 96),
    {
        key: 'long',
        name: 'Long Run',
        target: 200,
        turns: 42,
        difficultyCapTurn: 24,
        steps: LONG_STEPS,
        lateFillerFromTurn: 21,
    },
]

export const LONG_GOAL = GOALS.length - 1

/** The index of the goal a link names, or null for anything else. */
export function goalIndexOfKey(key: string | null | undefined): number | null {
    const index = GOALS.findIndex((goal) => goal.key === key)
    return index === -1 ? null : index
}

const STARTER = { basicGold: 6, basicPower: 4 }

export function standardMode(goalIndex: number): ModeConfig {
    const index = GOALS[goalIndex] ? goalIndex : 0
    const goal = GOALS[index]!
    return {
        id: 'standard',
        name: goal.name,
        turns: goal.turns,
        flushEvery: 3,
        goal: goal.target,
        goalIndex: index,
        difficultyCapTurn: goal.difficultyCapTurn,
        steps: goal.steps,
        lateFillerFromTurn: goal.lateFillerFromTurn,
        starter: STARTER,
    }
}

export const LONG_MODE: ModeConfig = standardMode(LONG_GOAL)

export function stepForTurn(mode: ModeConfig, turn: number) {
    let found = mode.steps[0]!
    for (const step of mode.steps) if (turn >= step.fromTurn) found = step
    return found
}

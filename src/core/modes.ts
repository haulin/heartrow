import type { DifficultyStep, ModeConfig } from './types'

/**
 * One target to play for: how many hearts, in how many turns, and how the difficulty scales. A goal is plain data, so a new one (another length, an easier ramp) is a new record here and no new code.
 */
export interface GoalDef {
    /** What a link says after `goal=`. */
    key: string
    name: string
    target: number
    /** The turn by which the target must be met. */
    turns: number
}

/** Every goal plays the same game, so a run that plays on past its deadline meets the same ramp as a Long Run. */
const PLAY_ON_TURNS = 42
const DIFFICULTY_CAP_TURN = 24
const LATE_FILLER_FROM_TURN = 21
/** Enemies are rarer in the first turns, when a crowded river leaves little to recruit and the deck cannot yet clear it. */
const DIFFICULTY_STEPS: DifficultyStep[] = [
    { fromTurn: 1, costBonus: 0, foeChance: 0.2, cheapChance: 0.15 },
    { fromTurn: 7, costBonus: 0, foeChance: 0.35, cheapChance: 0.15 },
    { fromTurn: 25, costBonus: 1, foeChance: 0.4, cheapChance: 0.08 },
    { fromTurn: 37, costBonus: 2, foeChance: 0.45, cheapChance: 0.08 },
]

function level(number: number, target: number): GoalDef {
    return { key: String(number), name: `Level ${number}`, target, turns: 24 }
}

export const GOALS: readonly GoalDef[] = [
    level(1, 48),
    level(2, 64),
    level(3, 80),
    level(4, 96),
    { key: 'long', name: 'Long Run', target: 200, turns: PLAY_ON_TURNS },
]

export const LONG_GOAL = GOALS.length - 1

/** The index of the goal a link names, or null for anything else. */
export function goalIndexOfKey(key: string | null | undefined): number | null {
    const index = GOALS.findIndex((goal) => goal.key === key)
    return index === -1 ? null : index
}

const STARTER = { basicGold: 7, basicPower: 3 }

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
        playOnTurns: PLAY_ON_TURNS,
        difficultyCapTurn: DIFFICULTY_CAP_TURN,
        steps: DIFFICULTY_STEPS,
        lateFillerFromTurn: LATE_FILLER_FROM_TURN,
        starter: STARTER,
    }
}

export const LONG_MODE: ModeConfig = standardMode(LONG_GOAL)

/** The enemy share of every turn the game can reach, for the compendium. */
export const ENEMY_SHARE_STEPS = DIFFICULTY_STEPS.map((step) => ({ fromTurn: step.fromTurn, share: step.foeChance }))

export function stepForTurn(mode: ModeConfig, turn: number) {
    let found = mode.steps[0]!
    for (const step of mode.steps) if (turn >= step.fromTurn) found = step
    return found
}

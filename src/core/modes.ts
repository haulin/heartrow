import type { ModeConfig } from './types'

export const GOALS = [48, 64, 80]

const STANDARD_STEPS = [{ fromTurn: 1, costBonus: 0, foeChance: 0.35, cheapChance: 0.15 }]

const LONG_STEPS = [
    { fromTurn: 1, costBonus: 0, foeChance: 0.35, cheapChance: 0.15 },
    { fromTurn: 25, costBonus: 1, foeChance: 0.4, cheapChance: 0.08 },
    { fromTurn: 37, costBonus: 2, foeChance: 0.45, cheapChance: 0.08 },
]

const STARTER = { basicGold: 6, basicPower: 4 }

export function standardMode(level: number): ModeConfig {
    return {
        id: 'standard',
        name: 'Level ' + (level + 1),
        turns: 24,
        redrawEvery: 3,
        goal: GOALS[level] ?? GOALS[0]!,
        difficultyCapTurn: 24,
        steps: STANDARD_STEPS,
        lateFillerFromTurn: null,
        starter: STARTER,
    }
}

export const LONG_MODE: ModeConfig = {
    id: 'long',
    name: 'Long Run',
    turns: 42,
    redrawEvery: 3,
    goal: null,
    difficultyCapTurn: 24,
    steps: LONG_STEPS,
    lateFillerFromTurn: 21,
    starter: STARTER,
}

export function stepForTurn(mode: ModeConfig, turn: number) {
    let found = mode.steps[0]!
    for (const step of mode.steps) if (turn >= step.fromTurn) found = step
    return found
}

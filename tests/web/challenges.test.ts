import { describe, expect, it } from 'vite-plus/test'
import { CUSTOM_PRESETS, DEFAULT_CUSTOM, LONG_MODE, customMode, standardMode } from '../../src/core'
import type { ModeConfig } from '../../src/core'
import { LONG_GOAL, challengeList, goalOfMode, loadResults, nextGoal, recordFinished, runName } from '../../src/platform/web/challenges'
import { GameStore } from '../../src/platform/web/store'
import { createMemoryStorage } from '../../src/platform/web/storage'

function finished(config: ModeConfig, status: 'won' | 'lost' | 'finished', hearts: number) {
    return { ...new GameStore(config, 1).getState(), status, hearts }
}

describe('challenge goals of a run', () => {
    it('knows Standard levels and Long Run', () => {
        expect(goalOfMode(standardMode(2))).toEqual({ challengeId: 'standard', goal: 2 })
        expect(goalOfMode(LONG_MODE)).toEqual({ challengeId: 'standard', goal: LONG_GOAL })
    })

    it('recognises a preset generator at any goal, and no other custom generator', () => {
        const moss = CUSTOM_PRESETS.find((p) => p.id === 'moss')!
        expect(goalOfMode(customMode({ ...moss.generator, goalLevel: 3 }))).toEqual({ challengeId: 'moss', goal: 3 })
        expect(goalOfMode(customMode({ ...moss.generator, effects: [] }))).toBeNull()
    })

    it('builds the run of every card from its own goal', () => {
        for (const challenge of challengeList(DEFAULT_CUSTOM).filter((c) => c.tracked)) {
            const mode = challenge.mode(1)
            expect(goalOfMode(mode)).toEqual({ challengeId: challenge.id === 'standard' ? 'standard' : challenge.id, goal: 1 })
        }
    })
})

describe('run names', () => {
    it('names a preset run by its preset, and any other custom run Custom', () => {
        const moss = CUSTOM_PRESETS.find((p) => p.id === 'moss')!
        expect(runName(standardMode(0))).toBe('Standard')
        expect(runName(LONG_MODE)).toBe('Long Run')
        expect(runName(customMode(moss.generator))).toBe('Moss economy')
        expect(runName(customMode({ ...moss.generator, effects: [] }))).toBe('Custom')
    })
})

describe('challenge results', () => {
    it('keeps the best hearts and a win, and ignores unfinished runs', () => {
        const storage = createMemoryStorage()
        const mode = standardMode(0)
        expect(recordFinished(storage, new GameStore(mode, 1).getState())).toBeNull()
        expect(recordFinished(storage, finished(mode, 'lost', 40))).toEqual({ 'standard:0': { won: false, best: 40 } })
        expect(recordFinished(storage, finished(mode, 'won', 50))).toEqual({ 'standard:0': { won: true, best: 50 } })
        // A worse later run changes nothing, and does not take the win away.
        expect(recordFinished(storage, finished(mode, 'lost', 30))).toBeNull()
        expect(loadResults(storage)).toEqual({ 'standard:0': { won: true, best: 50 } })
    })

    it('scores Long Run by hearts without a win', () => {
        const storage = createMemoryStorage()
        recordFinished(storage, finished(LONG_MODE, 'finished', 120))
        expect(loadResults(storage)).toEqual({ [`standard:${LONG_GOAL}`]: { won: false, best: 120 } })
    })

    it('preselects the lowest level not won yet, or the last one', () => {
        expect(nextGoal({}, 'standard')).toBe(0)
        expect(nextGoal({ 'standard:0': { won: true, best: 50 }, 'standard:1': { won: false, best: 50 } }, 'standard')).toBe(1)
        const all = Object.fromEntries([0, 1, 2, 3].map((g) => [`standard:${g}`, { won: true, best: 99 }]))
        expect(nextGoal(all, 'standard')).toBe(3)
    })

    it('drops damaged saved results', () => {
        const storage = createMemoryStorage({ results: JSON.stringify({ 'standard:0': { won: true, best: 'x' }, 'standard:1': null }) })
        expect(loadResults(storage)).toEqual({})
    })
})

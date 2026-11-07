import { describe, expect, it } from 'vite-plus/test'
import { CUSTOM_PRESETS, DEFAULT_CUSTOM, LONG_MODE, customMode, standardMode } from '../../src/core'
import type { ModeConfig } from '../../src/core'
import {
    LONG_GOAL,
    challengeList,
    goalOfMode,
    importResults,
    loadResults,
    nextGoal,
    recordFinished,
    resultsText,
    runName,
} from '../../src/platform/web/challenges'
import type { SignedResults } from '../../src/platform/web/challenges'
import { GameStore } from '../../src/platform/web/store'
import { createMemoryStorage } from '../../src/platform/web/storage'

const V1 = '0.1.0'
const V2 = '0.2.0'

function finished(config: ModeConfig, status: 'won' | 'lost' | 'finished', hearts: number, turn = 1) {
    return { ...new GameStore(config, 1).getState(), status, hearts, turn }
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
        expect(recordFinished(storage, new GameStore(mode, 1).getState(), V1)).toBeNull()
        expect(recordFinished(storage, finished(mode, 'lost', 40), V1)).toEqual({
            'standard:0': { won: false, best: 40, turn: null, version: V1 },
        })
        expect(recordFinished(storage, finished(mode, 'won', 50, 22), V1)).toEqual({
            'standard:0': { won: true, best: 50, turn: 22, version: V1 },
        })
        // A worse later run changes nothing, and does not take the win away.
        expect(recordFinished(storage, finished(mode, 'lost', 30), V2)).toBeNull()
        expect(loadResults(storage)).toEqual({ 'standard:0': { won: true, best: 50, turn: 22, version: V1 } })
    })

    it('keeps the best hearts and the earliest winning turn as two records', () => {
        const storage = createMemoryStorage()
        const mode = standardMode(0)
        recordFinished(storage, finished(mode, 'won', 50, 22), V1)
        // Faster with fewer hearts: only the turn improves, and the entry is stamped with the version that changed it.
        recordFinished(storage, finished(mode, 'won', 48, 19), V2)
        expect(loadResults(storage)['standard:0']).toEqual({ won: true, best: 50, turn: 19, version: V2 })
        // Slower with more hearts: only the hearts improve.
        recordFinished(storage, finished(mode, 'won', 60, 24), V2)
        expect(loadResults(storage)['standard:0']).toEqual({ won: true, best: 60, turn: 19, version: V2 })
        expect(recordFinished(storage, finished(mode, 'won', 55, 20), V2)).toBeNull()
    })

    it('scores Long Run by hearts without a win', () => {
        const storage = createMemoryStorage()
        recordFinished(storage, finished(LONG_MODE, 'finished', 120), V1)
        expect(loadResults(storage)).toEqual({ [`standard:${LONG_GOAL}`]: { won: false, best: 120, turn: null, version: V1 } })
    })

    it('preselects the lowest level not won yet, or the last one', () => {
        expect(nextGoal({}, 'standard')).toBe(0)
        const won = { won: true, best: 50, turn: 20, version: V1 }
        expect(nextGoal({ 'standard:0': won, 'standard:1': { ...won, won: false, turn: null } }, 'standard')).toBe(1)
        const all = Object.fromEntries([0, 1, 2, 3].map((g) => [`standard:${g}`, won]))
        expect(nextGoal(all, 'standard')).toBe(3)
    })

    it('merges pasted results by keeping the better record of each pair', () => {
        const mine = {
            'moss:0': { won: true, best: 61, turn: 24, version: V1 },
            'tide:0': { won: false, best: 40, turn: null, version: V1 },
        }
        const theirs = {
            'moss:0': { won: true, best: 58, turn: 19, version: V2 },
            'tide:0': { won: true, best: 65, turn: 20, version: V2 },
            'ember:0': { won: true, best: 51, turn: 20, version: V2 },
        }
        const outcome = importResults(mine, resultsText(theirs))
        expect(outcome).toEqual({
            improved: 3,
            results: {
                'moss:0': { won: true, best: 61, turn: 19, version: V2 },
                'tide:0': theirs['tide:0'],
                'ember:0': theirs['ember:0'],
            },
        })
    })

    it('counts nothing and keeps the version when the pasted results are not better', () => {
        const mine = { 'moss:0': { won: true, best: 61, turn: 19, version: V2 } }
        const worse = { 'moss:0': { won: true, best: 50, turn: 22, version: V1 } }
        expect(importResults(mine, resultsText(worse))).toEqual({ improved: 0, results: mine })
    })

    it('refuses a replay and anything else that is not a results record, and says why', () => {
        expect(importResults({}, 'nope')).toEqual({ error: 'That is not JSON.' })
        expect(importResults({}, '{"version":"1","query":"?x","moves":[]}')).toEqual({
            error: 'That is a run replay. Use "Paste replay" in the run menu.',
        })
        expect(importResults({}, resultsText({}))).toEqual({ error: 'That record has no results.' })
        expect(importResults({}, '[1]')).toEqual({ error: 'That is not a results record.' })
    })

    it('refuses pasted results that were edited, unsigned or damaged', () => {
        const tampered = { 'moss:0': { won: true, best: 61, turn: 24, version: V1 } }
        const text = resultsText(tampered)
        const changed = 'These results were changed after they were copied, or are damaged.'
        expect(importResults({}, text.replace('"turn":24', '"turn":10'))).toEqual({ error: changed })
        expect(importResults({}, text.replace('"best":61', '"best":99'))).toEqual({ error: changed })
        expect(importResults({}, JSON.stringify({ results: tampered }))).toEqual({ error: changed })
        expect(importResults({}, '{"results":{"a":{"won":"yes"}},"sig":"x"}')).toEqual({ error: changed })
        expect('error' in importResults({}, text)).toBe(false)
    })

    it('ignores saved results that were edited in storage', () => {
        const storage = createMemoryStorage()
        recordFinished(storage, finished(standardMode(0), 'won', 50, 22), V1)
        expect(loadResults(storage)['standard:0']?.turn).toBe(22)
        const record = storage.get<SignedResults>('results', { results: {}, sig: '' })
        record.results['standard:0']!.turn = 5
        storage.set('results', record)
        expect(loadResults(storage)).toEqual({})
    })

    it('drops damaged saved results', () => {
        const storage = createMemoryStorage({ results: JSON.stringify({ 'standard:0': { won: true, best: 'x' }, 'standard:1': null }) })
        expect(loadResults(storage)).toEqual({})
    })
})

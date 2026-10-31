import { describe, expect, it } from 'vite-plus/test'
import { standardMode } from '../../src/core'
import type { Move } from '../../src/core'
import { shareQuery } from '../../src/platform/web/mode'
import { loadRun, openStore, runOf } from '../../src/platform/web/resume'
import { createMemoryStorage } from '../../src/platform/web/storage'
import { GameStore } from '../../src/platform/web/store'

const V = '1.0.0'
const query = (seed: number) => shareQuery(standardMode(0), seed)

/** Plays some moves the bot-free way: the first playable hand card, then ends the turn, a few times. */
function play(store: GameStore, turns: number): void {
    for (let t = 0; t < turns; t++) {
        for (let i = 0; i < store.getState().hand.length; i++) {
            const card = store.getState().hand[i]!
            if (!card.played && card.fx.length === 0) store.dispatch({ type: 'play', handIndex: i })
        }
        store.dispatch({ type: 'endTurn' })
    }
}

describe('GameStore moves', () => {
    it('records accepted moves only, and drops the last one on undo', () => {
        const store = new GameStore(standardMode(0), 3)
        store.dispatch({ type: 'play', handIndex: 0 })
        store.dispatch({ type: 'play', handIndex: 0 }) // the same card again is rejected
        expect(store.getMoves()).toEqual([{ type: 'play', handIndex: 0 }])
        store.undo()
        expect(store.getMoves()).toEqual([])
        store.dispatch({ type: 'endTurn' })
        store.undo() // nothing to undo across the turn boundary
        expect(store.getMoves()).toEqual([{ type: 'endTurn' }])
        store.newGame(standardMode(1), 9)
        expect(store.getMoves()).toEqual([])
    })

    it('replays the moves into the same run, including the undo of the current turn', () => {
        const a = new GameStore(standardMode(0), 11)
        play(a, 3)
        a.dispatch({ type: 'play', handIndex: 0 })
        const b = new GameStore(standardMode(0), 11)
        expect(b.replay(a.getMoves())).toBe(true)
        expect(b.getState()).toEqual(a.getState())
        expect(b.getSession().undo.length).toBe(a.getSession().undo.length)
    })

    it('refuses moves the rules reject and changes nothing', () => {
        const store = new GameStore(standardMode(0), 5)
        const before = store.getState()
        const bad: Move[] = [
            { type: 'play', handIndex: 0 },
            { type: 'play', handIndex: 0 },
        ]
        expect(store.replay(bad)).toBe(false)
        expect(store.getState()).toBe(before)
        expect(store.getMoves()).toEqual([])
    })
})

describe('opening the app', () => {
    it('saves a run from the first move and resumes it on a reload of the same address', () => {
        const storage = createMemoryStorage()
        const first = openStore(storage, query(21), V)
        expect(first.screen).toBe('game')
        play(first.store, 4)
        const reloaded = openStore(storage, query(21), V)
        expect(reloaded.started).toBe(true)
        expect(reloaded.store.getState()).toEqual(first.store.getState())
    })

    it('resumes the saved run from the home screen after a reload, and a finished run too', () => {
        const storage = createMemoryStorage()
        const first = openStore(storage, query(8), V)
        play(first.store, 30)
        expect(first.store.getState().status).not.toBe('playing')
        const reloaded = openStore(storage, '', V)
        expect(reloaded.screen).toBe('home')
        expect(reloaded.started).toBe(true)
        expect(reloaded.store.getState()).toEqual(first.store.getState())
    })

    it('follows undo and new game in the save', () => {
        const storage = createMemoryStorage()
        const { store } = openStore(storage, query(2), V)
        store.dispatch({ type: 'play', handIndex: 0 })
        store.undo()
        expect(loadRun(storage, V)?.moves).toEqual([])
        store.newGame(standardMode(1), 77)
        expect(loadRun(storage, V)?.query).toBe(shareQuery(standardMode(1), 77))
    })

    it('starts the linked run and replaces the save when the address names another run', () => {
        const storage = createMemoryStorage()
        play(openStore(storage, query(1), V).store, 2)
        const other = openStore(storage, query(2), V)
        expect(other.store.getMoves()).toEqual([])
        expect(loadRun(storage, V)).toEqual(runOf(other.store, V))
    })

    it('has nothing to resume without a save, and drops saves from another version or that fail to replay', () => {
        const empty = createMemoryStorage()
        expect(openStore(empty, '', V)).toMatchObject({ screen: 'home', started: false })

        const storage = createMemoryStorage()
        play(openStore(storage, query(4), V).store, 2)
        expect(openStore(storage, '', '2.0.0').started).toBe(false)
        expect(loadRun(storage, '2.0.0')).toBeNull()

        const broken = createMemoryStorage()
        broken.set('run', {
            version: V,
            query: query(4),
            moves: [
                { type: 'play', handIndex: 0 },
                { type: 'play', handIndex: 0 },
            ],
        })
        expect(openStore(broken, '', V).started).toBe(false)
        expect(broken.get('run', null)).toBeNull()
    })
})

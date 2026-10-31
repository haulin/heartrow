import { standardMode } from '../../core'
import type { Move } from '../../core'
import { hasRun, parseStartParams, randomSeed, shareQuery } from './mode'
import type { AppStorage } from './storage'
import { GameStore } from './store'

/**
 * A saved run is the game's address (mode, goal, seed and generator settings) plus the accepted moves. The core is pure and its random
 * streams live in the state, so replaying the moves rebuilds the exact run, including the undo stack of the current turn. The same
 * record doubles as a dump for debugging: anyone can replay it and check the result.
 */
export interface SavedRun {
    version: string
    query: string
    moves: Move[]
}

const KEY = 'run'

export function runOf(store: GameStore, version: string): SavedRun {
    const { config, seed } = store.getState()
    return { version, query: shareQuery(config, seed), moves: store.getMoves() }
}

const isMove = (m: unknown): m is Move => typeof m === 'object' && m !== null && typeof (m as { type?: unknown }).type === 'string'

/** The saved run, or null when there is none, it is malformed, or it came from another version of the game. */
export function loadRun(storage: AppStorage, version: string): SavedRun | null {
    const raw = storage.get<Partial<SavedRun> | null>(KEY, null)
    if (!raw || raw.version !== version || typeof raw.query !== 'string' || !Array.isArray(raw.moves) || !raw.moves.every(isMove))
        return null
    return { version, query: raw.query, moves: raw.moves }
}

export interface Opened {
    store: GameStore
    /** `game` when the address starts a run, `home` otherwise. */
    screen: 'home' | 'game'
    /** Whether a run is in memory, so the home screen can offer Resume. */
    started: boolean
}

/**
 * Builds the store for a page load and keeps the save up to date.
 * - An address that names the saved run resumes it, however far it got. This is what a reload after a tab discard sees.
 * - Any other game address starts that run and replaces the save.
 * - An address with no run opens the home screen, with the saved run (if any) ready to resume.
 * A save that fails to replay is dropped.
 */
export function openStore(storage: AppStorage, search: string, version: string, fallbackSeed: () => number = randomSeed): Opened {
    const saved = loadRun(storage, version)
    const link = hasRun(search)
    const wanted = link ? parseStartParams(search, fallbackSeed) : saved ? parseStartParams(saved.query) : null
    const store = new GameStore(wanted?.config ?? standardMode(0), wanted?.seed ?? fallbackSeed())

    const sameRun = saved !== null && wanted !== null && saved.query === shareQuery(wanted.config, wanted.seed)
    const resumed = sameRun && store.replay(saved.moves)
    if (!resumed && saved) storage.remove(KEY)
    const started = link || resumed

    if (started) storage.set(KEY, runOf(store, version))
    let last = store.getMoves()
    store.subscribe(() => {
        // The moves list is replaced on every accepted move, undo and new game, and not otherwise.
        if (store.getMoves() === last) return
        last = store.getMoves()
        storage.set(KEY, runOf(store, version))
    })
    return { store, screen: link ? 'game' : 'home', started }
}

import { standardMode } from '../../core'
import type { Move } from '../../core'
import { forgetStaleImprovements } from './challenges'
import { hasRun, isChallenges, isEditor, isStandard, parseStartParams, randomSeed, shareQuery } from './mode'
import { createMemoryStorage } from './storage'
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
const isSavedRun = (raw: unknown, version: string): raw is SavedRun =>
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { version?: unknown }).version === version &&
    typeof (raw as { query?: unknown }).query === 'string' &&
    Array.isArray((raw as { moves?: unknown }).moves) &&
    (raw as { moves: unknown[] }).moves.every(isMove)

/** Parses a pasted or uploaded saved-run record. */
export function parseRunText(text: string, version: string): SavedRun | null {
    try {
        const raw: unknown = JSON.parse(text)
        return isSavedRun(raw, version) ? { version: raw.version, query: raw.query, moves: raw.moves } : null
    } catch {
        return null
    }
}

/** The saved run, or null when there is none, it is malformed, or it came from another version of the game. */
export function loadRun(storage: AppStorage, version: string): SavedRun | null {
    const raw = storage.get<Partial<SavedRun> | null>(KEY, null)
    return isSavedRun(raw, version) ? { version: raw.version, query: raw.query, moves: raw.moves } : null
}

/**
 * A replay being stepped through: the whole replay and how far it got. It lives in the tab's own storage, so a reload (new code in
 * development) keeps stepping where it was, and closing the tab drops it.
 */
interface SavedReplay extends SavedRun {
    done: number
}

const REPLAY_KEY = 'replay'

function loadSavedReplay(tab: AppStorage, version: string): SavedReplay | null {
    const raw = tab.get<Partial<SavedReplay> | null>(REPLAY_KEY, null)
    return isSavedRun(raw, version) && typeof (raw as { done?: unknown }).done === 'number'
        ? { version: raw.version, query: raw.query, moves: raw.moves, done: (raw as SavedReplay).done }
        : null
}

/** Puts the store back into replay mode when the run was saved at the very move the replay had reached. */
function restoreReplay(store: GameStore, tab: AppStorage, run: SavedRun, version: string): void {
    const replay = loadSavedReplay(tab, version)
    const standsThere = replay !== null && replay.query === run.query && replay.done === run.moves.length
    if (standsThere) {
        const start = parseStartParams(replay.query)
        if (store.loadReplay(start.config, start.seed, replay.moves, replay.done)) return
    }
    tab.remove(REPLAY_KEY)
}

/** Returns a function that writes the replay position to `tab` when it changes, and clears it when the replay ends. */
function replayKeeper(store: GameStore, tab: AppStorage, version: string): () => void {
    let moves: Move[] | null = null
    let done = -1
    return () => {
        const progress = store.getReplayProgress()
        const replayMoves = store.getReplayMoves()
        if (!progress || !replayMoves) {
            if (moves) tab.remove(REPLAY_KEY)
            moves = null
            return
        }
        if (moves === replayMoves && done === progress.done) return
        moves = replayMoves
        done = progress.done
        const { config, seed } = store.getState()
        tab.set(REPLAY_KEY, { version, query: shareQuery(config, seed), moves: replayMoves, done })
    }
}

export interface Opened {
    store: GameStore
    /** `game` when the address starts a run, `custom` for the generator editor, `home` otherwise. */
    screen: 'home' | 'game' | 'custom' | 'standard' | 'challenges'
    /** Whether a run is in memory, so the home screen can offer Resume. */
    started: boolean
}

/**
 * Builds the store for a page load and keeps the save up to date.
 * - An address that names the saved run resumes it, however far it got. This is what a reload after a tab discard sees.
 * - Any other game address starts that run and replaces the save.
 * - An address with no run opens the home screen, with the saved run (if any) ready to resume.
 * A save that fails to replay is dropped.
 * A replay in progress is kept in `tab` and comes back when the resumed run stands exactly where the replay stopped.
 */
export function openStore(
    storage: AppStorage,
    search: string,
    version: string,
    fallbackSeed: () => number = randomSeed,
    tab: AppStorage = createMemoryStorage(),
): Opened {
    const saved = loadRun(storage, version)
    const editor = isEditor(search)
    const picker = isChallenges(search)
    const standard = isStandard(search)
    const link = hasRun(search) && !editor && !picker && !standard
    const wanted = link ? parseStartParams(search, fallbackSeed) : saved ? parseStartParams(saved.query) : null
    const store = new GameStore(wanted?.config ?? standardMode(0), wanted?.seed ?? fallbackSeed())

    const sameRun = saved !== null && wanted !== null && saved.query === shareQuery(wanted.config, wanted.seed)
    const resumed = sameRun && store.replay(saved.moves)
    if (!resumed && saved) storage.remove(KEY)
    const started = link || resumed
    if (resumed) restoreReplay(store, tab, saved, version)
    else tab.remove(REPLAY_KEY)

    if (started) storage.set(KEY, runOf(store, version))
    forgetStaleImprovements(storage, started ? shareQuery(store.getState().config, store.getState().seed) : null)
    let last = store.getMoves()
    const keepReplay = replayKeeper(store, tab, version)
    store.subscribe(() => {
        keepReplay()
        // The moves list is replaced on every accepted move, undo and new game, and not otherwise.
        if (store.getMoves() === last) return
        last = store.getMoves()
        storage.set(KEY, runOf(store, version))
    })
    return { store, screen: link ? 'game' : editor ? 'custom' : picker ? 'challenges' : standard ? 'standard' : 'home', started }
}

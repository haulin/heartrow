import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { DEFAULT_CUSTOM, customMode, customOfMode } from '../../core'
import type { CustomGenerator, ModeConfig, Move } from '../../core'
import { editorQuery } from './custom'
import { AboutDialog, LoadRunDialog, LogDialog, PilesDialog, RunDialog, SettingsDialog, modeLabel } from './Dialogs'
import { GeneratorScreen } from './GeneratorScreen'
import { Home, StandardScreen } from './Home'
import { Rich } from './Rich'
import { Stats } from './Stats'
import { browserReducedMotion, createPresenter } from './anim/presenter'
import { parseStartParams, randomSeed, routeFor, shareQuery } from './mode'
import { parseRunText, runOf } from './resume'
import { applyTheme, loadSettings, saveSettings } from './settings'
import { SKIN_IDS, getSkin } from './skins'
import type { GameStore } from './store'
import type { AppStorage } from './storage'
import { spoken, statusMessage } from './text'
import { buildCardView } from './view/cardView'

type DialogName = 'about' | 'load' | 'log' | 'piles' | 'run' | 'settings'
type Screen = 'home' | 'game' | 'custom' | 'standard'

export interface AppProps {
    store: GameStore
    storage: AppStorage
    /** `game` when the address starts a run, `custom` for the generator editor, `home` otherwise. */
    initial: Screen
    /** Whether a run is already in memory (the default is that one exists when the app opens on the game). */
    started?: boolean
}

/** The session the view draws. It can trail the latest one while an animation plays. */
function useShownSession(store: GameStore) {
    const [, setTick] = useState(0)
    useEffect(() => store.subscribe(() => setTick((n) => n + 1)), [store])
    return store.getShown()
}

export function App({ store, storage, initial, started: startedAtOpen = initial === 'game' }: AppProps) {
    const session = useShownSession(store)
    const { state } = session
    const [settings, setSettings] = useState(() => loadSettings(storage, SKIN_IDS))
    const [dialog, setDialog] = useState<DialogName | null>(null)
    const [screen, setScreen] = useState<Screen>(initial)
    // The store always holds a game, but a run only counts once it was started from a link or the menu.
    const [started, setStarted] = useState(startedAtOpen)
    // The editor's settings come from the address, so it opens the same after a reload. The key makes a new visit start from fresh settings.
    const [editor, setEditor] = useState<{ def: CustomGenerator; key: number }>(() => ({
        def: initial === 'custom' ? (routeFor(window.location.search, null) as { def: CustomGenerator }).def : DEFAULT_CUSTOM,
        key: 0,
    }))
    const rootRef = useRef<HTMLDivElement>(null)
    const settingsRef = useRef(settings)
    settingsRef.current = settings
    const presenter = useMemo(
        () =>
            createPresenter(store, {
                root: () => rootRef.current,
                speed: () => settingsRef.current.anim,
                reducedMotion: browserReducedMotion,
            }),
        [store],
    )
    useEffect(() => () => presenter.dispose(), [presenter])
    const skin = getSkin(settings.skin)

    useEffect(() => applyTheme(document.documentElement, settings.theme), [settings.theme])

    const changeSettings = (next: typeof settings) => {
        setSettings(next)
        saveSettings(storage, next)
    }

    useLayoutEffect(() => presenter.rendered())

    const dispatch = (move: Move) => store.dispatch(move)
    const playing = state.status === 'playing'
    const canAuto = playing && !state.pendingExile && state.hand.some((c) => c.fx.length === 0 && !c.played)

    /** Clicks are resolved by card id against the latest state, so a card that shifts while an animation plays is never clicked by mistake. */
    const takeCard = (id: number) => {
        const s = store.getState()
        const rowIndex = s.row.findIndex((c) => c.id === id)
        if (rowIndex < 0) return
        if (s.pendingExile) {
            dispatch({ type: 'exile', rowIndex })
            return
        }
        dispatch({ type: 'take', rowIndex })
    }
    const handCard = (id: number) => {
        const s = store.getState()
        const handIndex = s.hand.findIndex((c) => c.id === id)
        if (handIndex >= 0) dispatch(s.pendingExile ? { type: 'exile', handIndex } : { type: 'play', handIndex })
    }

    // Left to right. The presenter plays the queued moves as a quick stagger.
    const autoplay = () => {
        const count = store.getState().hand.length
        for (let i = 0; i < count; i++) {
            const s = store.getState()
            if (s.status !== 'playing' || s.pendingExile) return
            const c = s.hand[i]
            if (c && c.fx.length === 0 && !c.played) dispatch({ type: 'play', handIndex: i })
        }
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as Element | null
            if (screen !== 'game' || e.code !== 'Space' || target?.closest?.('button, select, input, textarea, dialog, [role="button"]'))
                return
            e.preventDefault()
            autoplay()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    })

    // Back and forward move between the screens: home, the run in memory, the generator editor, or the run a game address names.
    useEffect(() => {
        const onPop = () => {
            const run = started ? shareQuery(store.getState().config, store.getState().seed) : null
            const route = routeFor(window.location.search, run)
            setDialog(null)
            if (route.screen === 'home' || route.screen === 'standard') return setScreen(route.screen)
            if (route.screen === 'custom') {
                setEditor((e) => ({ def: route.def, key: e.key + 1 }))
                return setScreen('custom')
            }
            if (route.start) {
                store.newGame(route.start.config, route.start.seed)
                setStarted(true)
            }
            setScreen('game')
        }
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    })

    /** Every screen change is a new history entry (marked as ours), so Back returns to the screen you came from. */
    const push = (query: string) => globalThis.history?.pushState({ in: true }, '', query)

    const startNew = (config: ModeConfig) => {
        const seed = randomSeed()
        setDialog(null)
        store.newGame(config, seed)
        // Keep the address in step with the run, so a reload or a copied address gives the same game.
        push(shareQuery(config, seed))
        setStarted(true)
        setScreen('game')
    }

    const goHome = () => {
        setDialog(null)
        push(window.location.pathname)
        setScreen('home')
    }

    const resume = () => {
        push(shareQuery(state.config, state.seed))
        setScreen('game')
    }

    /** Opens the editor with the settings of `def`. */
    const openEditor = (def: CustomGenerator) => {
        setDialog(null)
        push(editorQuery(def))
        setEditor((e) => ({ def, key: e.key + 1 }))
        setScreen('custom')
    }

    const openLevels = () => {
        push('?screen=standard')
        setScreen('standard')
    }

    const loadReplay = (text: string): string | null => {
        const saved = parseRunText(text, __APP_VERSION__)
        if (!saved) return 'This is not a valid replay for this game version.'
        const start = parseStartParams(saved.query)
        if (!store.loadReplay(start.config, start.seed, saved.moves)) return 'The replay contains a move the rules reject.'
        setDialog(null)
        push(shareQuery(start.config, start.seed))
        setStarted(true)
        setScreen('game')
        return null
    }

    /** Leaves the editor or the level picker the way the browser's Back would. Without an entry of ours behind it (a pasted address), it goes to the menu. */
    const leaveEditor = () => {
        if (globalThis.history?.state?.in) return globalThis.history.back()
        globalThis.history?.replaceState({ in: true }, '', window.location.pathname)
        setScreen('home')
    }

    const over = statusMessage(state)
    const text = over ?? (state.pendingExile ? 'Exile a card or river recruit, or skip.' : session.message)
    const label = `${spoken(text)}${over !== null ? ' Activate to open the full log.' : state.pendingExile ? ' Select a card to exile, or skip.' : ' Activate to open the full log.'}`

    const n = state.hand.length
    const overlap = n > 5 ? (n - 5) / (n - 1) : 0
    const replay = store.getReplayProgress()
    const close = () => setDialog(null)

    const dialogs = (
        <>
            {dialog === 'about' ? <AboutDialog state={screen === 'game' ? state : undefined} onClose={close} /> : null}
            {dialog === 'log' ? (
                <LogDialog
                    state={state}
                    history={session.history}
                    run={() => JSON.stringify(runOf(store, __APP_VERSION__))}
                    onClose={close}
                />
            ) : null}
            {dialog === 'run' ? (
                <RunDialog
                    state={state}
                    run={() => JSON.stringify(runOf(store, __APP_VERSION__))}
                    onLoad={() => setDialog('load')}
                    onEdit={() => openEditor(customOfMode(state.config))}
                    onClose={close}
                />
            ) : null}
            {dialog === 'load' ? <LoadRunDialog onLoad={loadReplay} onClose={close} /> : null}
            {dialog === 'piles' ? <PilesDialog state={state} skin={skin} onClose={close} /> : null}
            {dialog === 'settings' ? <SettingsDialog settings={settings} onChange={changeSettings} onClose={close} /> : null}
        </>
    )

    if (screen === 'home') {
        return (
            <div ref={rootRef} class="app">
                <Home
                    canResume={started}
                    onResume={resume}
                    onStandard={openLevels}
                    onLong={startNew}
                    onCustom={() => openEditor(started ? customOfMode(state.config) : DEFAULT_CUSTOM)}
                    onSettings={() => setDialog('settings')}
                    onAbout={() => setDialog('about')}
                />
                {dialogs}
            </div>
        )
    }

    if (screen === 'standard') {
        return (
            <div ref={rootRef} class="app">
                <StandardScreen replaces={started} onPick={startNew} onBack={leaveEditor} />
                {dialogs}
            </div>
        )
    }

    if (screen === 'custom') {
        return (
            <div ref={rootRef} class="app">
                <GeneratorScreen
                    key={editor.key}
                    initial={editor.def}
                    onChange={(def) => globalThis.history?.replaceState(globalThis.history.state, '', editorQuery(def))}
                    onStart={(def) => startNew(customMode(def))}
                    onBack={leaveEditor}
                />
                {dialogs}
            </div>
        )
    }

    return (
        <div ref={rootRef} class="app">
            <main>
                <header>
                    <button type="button" class="b alt" onClick={goHome} title="Back to the menu. The run stays in memory.">
                        ← Home
                    </button>
                    <button
                        type="button"
                        class="b alt"
                        onClick={() => setDialog('run')}
                        aria-haspopup="dialog"
                        title="Mode, goal, seed and settings of this run"
                    >
                        {modeLabel(state.config.id)} ⓘ
                    </button>
                </header>
                <Stats
                    state={{ ...state, ...store.getHolds() }}
                    onRedraw={() => dispatch({ type: 'redraw' })}
                    onPiles={() => setDialog('piles')}
                />

                <h2>Recruit row</h2>
                <div class="cards row" data-zone="row">
                    {state.row.map((card, i) => (
                        <div class="slot" key={card.id}>
                            <skin.Card view={buildCardView(card, 'row', i, state)} onActivate={() => takeCard(card.id)} />
                        </div>
                    ))}
                </div>

                <div
                    id="msg"
                    class={`msg${state.pendingExile ? ' warn' : ''}${settings.anim === 'off' ? ' calm' : ''}`}
                    title="Click for the full log"
                    role="button"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-label={label}
                    onClick={() => setDialog('log')}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDialog('log')
                        }
                    }}
                >
                    <Rich text={text} />
                </div>
                <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {spoken(text)}
                </div>

                <h2>Your hand</h2>
                <div class={`cards hand${n >= 10 ? ' large' : ''}`} data-zone="hand" style={{ '--k': overlap }}>
                    {state.hand.map((card, i) => (
                        <div class="slot" key={card.id}>
                            <skin.Card view={buildCardView(card, 'hand', i, state)} onActivate={() => handCard(card.id)} />
                        </div>
                    ))}
                </div>

                <div class="bar">
                    {replay ? (
                        replay.done < replay.total ? (
                            <button type="button" class="b alt" onClick={() => store.replayNext()}>
                                Next move {replay.done + 1}/{replay.total}
                            </button>
                        ) : (
                            <span class="rules">Replay complete · {replay.total} moves</span>
                        )
                    ) : null}
                    <button type="button" class="b" disabled={!playing || state.pendingExile} onClick={() => dispatch({ type: 'endTurn' })}>
                        End turn
                    </button>
                    <button
                        type="button"
                        class="b alt"
                        disabled={!canAuto}
                        title="Plays every card without a worded effect."
                        onClick={autoplay}
                    >
                        Play simple (space)
                    </button>
                    <button
                        type="button"
                        class="b alt"
                        disabled={!playing || state.pendingExile || state.redraws < 1}
                        title="Replaces the four left cards of the recruit row; the right-edge card stays."
                        onClick={() => dispatch({ type: 'redraw' })}
                    >
                        Redraw
                    </button>
                    <button
                        type="button"
                        class="b alt"
                        disabled={!store.canUndo()}
                        title={
                            replay ? 'Undo the last replay move.' : 'Undo your last move this turn. Random outcomes replay the same way.'
                        }
                        onClick={store.undo}
                    >
                        Undo
                    </button>
                    {state.pendingExile ? (
                        <button type="button" class="b" onClick={() => dispatch({ type: 'skipExile' })}>
                            Skip exile
                        </button>
                    ) : null}
                </div>
            </main>

            {dialogs}
        </div>
    )
}

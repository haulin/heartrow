import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { ModeConfig, Move } from '../../core'
import { AboutDialog, LogDialog, NewGameDialog, PilesDialog, SettingsDialog } from './Dialogs'
import { Rich } from './Rich'
import { Stats } from './Stats'
import { browserReducedMotion, createPresenter } from './anim/presenter'
import { randomSeed } from './mode'
import { applyTheme, loadSettings, saveSettings } from './settings'
import { SKIN_IDS, getSkin } from './skins'
import type { GameStore } from './store'
import type { AppStorage } from './storage'
import { spoken, statusMessage } from './text'
import { buildCardView } from './view/cardView'

type DialogName = 'about' | 'log' | 'piles' | 'new' | 'settings'

export interface AppProps {
    store: GameStore
    storage: AppStorage
}

/** The session the view draws. It can trail the latest one while an animation plays. */
function useShownSession(store: GameStore) {
    const [, setTick] = useState(0)
    useEffect(() => store.subscribe(() => setTick((n) => n + 1)), [store])
    return store.getShown()
}

export function App({ store, storage }: AppProps) {
    const session = useShownSession(store)
    const { state } = session
    const [settings, setSettings] = useState(() => loadSettings(storage, SKIN_IDS))
    const [dialog, setDialog] = useState<DialogName | null>(null)
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
        const rowIndex = store.getState().row.findIndex((c) => c.id === id)
        if (rowIndex >= 0) dispatch({ type: 'take', rowIndex })
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
            if (e.code !== 'Space' || target?.closest?.('button, select, input, textarea, dialog, [role="button"]')) return
            e.preventDefault()
            autoplay()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    })

    const startNew = (config: ModeConfig) => {
        setDialog(null)
        store.newGame(config, randomSeed())
    }

    const over = statusMessage(state)
    const text = over ?? (state.pendingExile ? 'Exile: click any card in your hand, played or not, or skip.' : session.message)
    const label = `${spoken(text)}${over !== null ? ' Activate to open the full log.' : state.pendingExile ? ' Select a card to exile, or skip.' : ' Activate to open the full log.'}`

    const n = state.hand.length
    const overlap = n > 5 ? (n - 5) / (n - 1) : 0
    const close = () => setDialog(null)

    return (
        <div ref={rootRef} class="app">
            <main>
                <header>
                    <h1>Heartrow</h1>
                    <span class="stat">
                        {state.goal === null ? (
                            `Long Run: ${state.maxTurns} turns`
                        ) : (
                            <>
                                Goal:{' '}
                                <span class="h">
                                    <Rich text={`${state.goal} ♥`} />
                                </span>{' '}
                                in {state.maxTurns} turns
                            </>
                        )}
                    </span>
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
                <div class="cards hand" data-zone="hand" style={{ '--k': overlap }}>
                    {state.hand.map((card, i) => (
                        <div class="slot" key={card.id}>
                            <skin.Card view={buildCardView(card, 'hand', i, state)} onActivate={() => handCard(card.id)} />
                        </div>
                    ))}
                </div>

                <div class="bar">
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
                    {state.pendingExile ? (
                        <button type="button" class="b" onClick={() => dispatch({ type: 'skipExile' })}>
                            Skip exile
                        </button>
                    ) : null}
                    <button
                        type="button"
                        class="b alt"
                        disabled={session.undo.length === 0}
                        title="Undo your last move this turn. Random outcomes replay the same way."
                        onClick={store.undo}
                    >
                        Undo
                    </button>
                    <button type="button" class="b alt" onClick={() => setDialog('new')}>
                        New game
                    </button>
                    <button type="button" class="b alt" onClick={() => setDialog('settings')}>
                        Settings
                    </button>
                    <button type="button" class="b alt" onClick={() => setDialog('about')}>
                        About
                    </button>
                </div>
            </main>

            {dialog === 'about' ? <AboutDialog state={state} onClose={close} /> : null}
            {dialog === 'log' ? <LogDialog state={state} history={session.history} onClose={close} /> : null}
            {dialog === 'piles' ? <PilesDialog state={state} skin={skin} onClose={close} /> : null}
            {dialog === 'new' ? <NewGameDialog onPick={startNew} onClose={close} /> : null}
            {dialog === 'settings' ? <SettingsDialog settings={settings} onChange={changeSettings} onClose={close} /> : null}
        </div>
    )
}

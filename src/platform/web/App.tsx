import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { ModeConfig, Move } from '../../core'
import { AboutDialog, LogDialog, NewGameDialog, PilesDialog, SettingsDialog } from './Dialogs'
import { Rich } from './Rich'
import { Stats } from './Stats'
import { createAnimator } from './anim'
import type { Animator } from './anim'
import { randomSeed } from './mode'
import { applyTheme, loadSettings, nextTheme, saveSettings } from './settings'
import { SKIN_IDS, getSkin } from './skins'
import type { GameStore } from './store'
import type { AppStorage } from './storage'
import { spoken, statusMessage } from './text'
import { buildCardView } from './view/cardView'

type DialogName = 'about' | 'log' | 'piles' | 'new' | 'settings'

export interface AppProps {
    store: GameStore
    storage: AppStorage
    animator?: Animator
}

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const

function useSession(store: GameStore) {
    const [, setTick] = useState(0)
    useEffect(() => store.subscribe(() => setTick((n) => n + 1)), [store])
    return store.getSession()
}

export function App({ store, storage, animator: injected }: AppProps) {
    const session = useSession(store)
    const { state } = session
    const [settings, setSettings] = useState(() => loadSettings(storage, SKIN_IDS))
    const [dialog, setDialog] = useState<DialogName | null>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const animator = useMemo(() => injected ?? createAnimator(), [injected])
    const skin = getSkin(settings.skin)

    useEffect(() => applyTheme(document.documentElement, settings.theme), [settings.theme])

    const changeSettings = (next: typeof settings) => {
        setSettings(next)
        saveSettings(storage, next)
    }

    useLayoutEffect(() => {
        const root = rootRef.current
        for (const batch of store.takeBatches()) {
            if (root) void animator.play(batch.events, { root, move: batch.move, speed: settings.anim })
        }
    })

    const dispatch = (move: Move) => store.dispatch(move)
    const playing = state.status === 'playing'
    const canAuto = playing && !state.pendingExile && state.hand.some((c) => c.fx.length === 0 && !c.played)

    const autoplay = () => {
        for (let i = store.getState().hand.length - 1; i >= 0; i--) {
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
                                Goal: <span class="h">{state.goal} ♥</span> in {state.maxTurns} turns
                            </>
                        )}
                    </span>
                </header>
                <Stats state={state} onRedraw={() => dispatch({ type: 'redraw' })} onPiles={() => setDialog('piles')} />

                <h2>Recruit row</h2>
                <div class="cards row" data-zone="row">
                    {state.row.map((card, i) => (
                        <div class="slot" key={card.id}>
                            <skin.Card
                                view={buildCardView(card, 'row', i, state)}
                                onActivate={() => dispatch({ type: 'take', rowIndex: i })}
                            />
                        </div>
                    ))}
                </div>

                <div
                    id="msg"
                    class={`msg${state.pendingExile ? ' warn' : ''}`}
                    title="Click for the full log"
                    role="button"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-live="polite"
                    aria-atomic="true"
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

                <h2>Your hand</h2>
                <div class="cards hand" data-zone="hand" style={{ '--k': overlap }}>
                    {state.hand.map((card, i) => (
                        <div class="slot" key={card.id}>
                            <skin.Card
                                view={buildCardView(card, 'hand', i, state)}
                                onActivate={() =>
                                    dispatch(state.pendingExile ? { type: 'exile', handIndex: i } : { type: 'play', handIndex: i })
                                }
                            />
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
                        disabled={state.redraws < 1}
                        title="Replaces the four left cards of the recruit row; the right-edge card stays."
                        onClick={() => dispatch({ type: 'redraw' })}
                    >
                        Redraw
                    </button>
                    {state.pendingExile ? (
                        <button type="button" class="b alt" onClick={() => dispatch({ type: 'skipExile' })}>
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
                    <button
                        type="button"
                        class="b alt"
                        title="Cycle theme: system, light, dark"
                        onClick={() => changeSettings({ ...settings, theme: nextTheme(settings.theme) })}
                    >
                        Theme: {THEME_LABEL[settings.theme]}
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

import '@fontsource-variable/bricolage-grotesque/index.css'
import './styles.css'
import { render } from 'preact'
import * as core from '../../core'
import type { Move } from '../../core'
import { App } from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { createLocalStorage } from './localStorageStore'
import { shareQuery } from './mode'
import { openStore, runOf } from './resume'
import { applyTheme, loadSettings } from './settings'
import { SKIN_IDS } from './skins'

const storage = createLocalStorage()
applyTheme(document.documentElement, loadSettings(storage, SKIN_IDS).theme)

const { store, screen, started } = openStore(storage, window.location.search, __APP_VERSION__)
// A game address always names its seed, so a reload (or a tab the browser dropped) finds the same run.
if (screen === 'game') window.history.replaceState(null, '', shareQuery(store.getState().config, store.getState().seed))

if (import.meta.env.DEV) {
    Object.assign(window, {
        heartrow: {
            getState: store.getState,
            dispatch: (move: Move) => store.dispatch(move).events,
            newGame: (goalKey: string, newSeed: number) => store.newGame(core.standardRun(core.goalIndexOfKey(goalKey) ?? 0), newSeed),
            legalMoves: () => core.legalMoves(store.getState()),
            /** The saved-run record: the address and the accepted moves. Replaying it rebuilds this run. */
            run: () => runOf(store, __APP_VERSION__),
            core,
        },
    })
}

const root = document.getElementById('app')
if (root) {
    render(
        <ErrorBoundary>
            <App store={store} storage={storage} initial={screen} started={started} />
        </ErrorBoundary>,
        root,
    )
}

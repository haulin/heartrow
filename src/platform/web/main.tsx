import '@fontsource-variable/bricolage-grotesque/index.css'
import './styles.css'
import { render } from 'preact'
import * as core from '../../core'
import type { Move } from '../../core'
import { App } from './App'
import { createLocalStorage } from './localStorageStore'
import { modeFromId, parseStartParams } from './mode'
import { applyTheme, loadSettings } from './settings'
import { SKIN_IDS } from './skins'
import { GameStore } from './store'

const storage = createLocalStorage()
applyTheme(document.documentElement, loadSettings(storage, SKIN_IDS).theme)

const { config, seed } = parseStartParams(window.location.search)
const store = new GameStore(config, seed)

if (import.meta.env.DEV) {
  Object.assign(window, {
    heartrow: {
      getState: store.getState,
      dispatch: (move: Move) => store.dispatch(move).events,
      newGame: (modeId: string, newSeed: number) => store.newGame(modeFromId(modeId), newSeed),
      legalMoves: () => core.legalMoves(store.getState()),
      core,
    },
  })
}

const root = document.getElementById('app')
if (root) render(<App store={store} storage={storage} />, root)

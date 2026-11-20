import { describe, expect, it } from 'vite-plus/test'
import type { Move } from '../../src/core'
import { parseStartParams } from '../../src/platform/web/mode'
import { GameStore } from '../../src/platform/web/store'
import { deckSummary } from '../../src/platform/web/text'
import reference from '../fixtures/reference-run.json'

/**
 * A saved run (a "Copy run" record; this one is a `smart` bot game written by `npm run sim -- --worst`) replayed through the engine. It must replay without a single rejected move
 * and end in exactly this state. If this fails, engine behaviour changed: when that was intended, bump the version in `package.json`
 * (saved runs are tied to it) and update the expected values below; when it was not, the change is a bug.
 */
describe('reference run', () => {
    const { config, seed } = parseStartParams(reference.query)
    const store = new GameStore(config, seed)
    const replayed = store.replay(reference.moves as Move[])
    const state = store.getState()
    const cards = [...state.deck, ...state.hand, ...state.discard]

    it('replays with every move accepted', () => {
        expect(replayed).toBe(true)
        expect(store.getMoves()).toHaveLength(reference.moves.length)
    })

    it('ends on the same turn, hearts and resources', () => {
        expect({
            turn: state.turn,
            hearts: state.hearts,
            gold: state.gold,
            power: state.power,
            flushes: state.flushes,
            piles: [state.deck.length, state.hand.length, state.discard.length, state.exile.length],
        }).toMatchInlineSnapshot(`
          {
            "flushes": 0,
            "gold": 0,
            "hearts": 48,
            "piles": [
              6,
              0,
              18,
              2,
            ],
            "power": 0,
            "turn": 20,
          }
        `)
    })

    it('ends with the same deck', () => {
        expect(deckSummary(state)).toMatchInlineSnapshot(`
          {
            "ember": 2,
            "fxGold": 2,
            "fxHearts": 1,
            "fxOther": 7,
            "fxPower": 3,
            "gold": 15,
            "hearts": 2,
            "moss": 5,
            "plain": 8,
            "power": 14,
            "tide": 9,
            "total": 24,
          }
        `)
        const line = (c: (typeof cards)[number]) =>
            `${c.type} ${c.kind} cost ${c.cost}: ${c.gold}g ${c.power}p ${c.hearts}h [${c.fx.join(',')}]`
        expect(cards.map(line).sort()).toMatchInlineSnapshot(`
          [
            "ember recruit cost 4: 1g 1p 0h [weak]",
            "ember recruit cost 6: 0g 2p 0h [vault]",
            "moss recruit cost 2: 0g 0p 0h [bond]",
            "moss recruit cost 2: 0g 0p 0h [redraw]",
            "moss recruit cost 3: 0g 0p 0h [hoard]",
            "moss recruit cost 3: 2g 0p 0h []",
            "moss recruit cost 4: 2g 0p 0h [cheap]",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "tide recruit cost 2: 0g 0p 0h [pile]",
            "tide recruit cost 2: 0g 0p 0h [weak]",
            "tide recruit cost 3: 0g 0p 2h []",
            "tide recruit cost 3: 0g 1p 0h [cheap]",
            "tide recruit cost 3: 0g 1p 0h [pile]",
            "tide recruit cost 3: 0g 1p 0h [reload]",
            "tide recruit cost 3: 1g 0p 0h [hoard]",
            "tide recruit cost 7: 2g 1p 0h [echo]",
            "tide recruit cost 7: 3g 3p 0h []",
          ]
        `)
    })
})

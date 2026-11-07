import { describe, expect, it } from 'vite-plus/test'
import type { Move } from '../../src/core'
import { parseStartParams } from '../../src/platform/web/mode'
import { GameStore } from '../../src/platform/web/store'
import { deckSummary } from '../../src/platform/web/text'
import reference from '../fixtures/reference-run.json'

/**
 * A real played run (a "Copy run" record from a playtest) replayed through the engine. It must replay without a single rejected move
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
            "flushes": 3,
            "gold": 0,
            "hearts": 48,
            "piles": [
              13,
              0,
              6,
              11,
            ],
            "power": 0,
            "turn": 22,
          }
        `)
    })

    it('ends with the same deck', () => {
        expect(deckSummary(state)).toMatchInlineSnapshot(`
          {
            "ember": 4,
            "fxGold": 0,
            "fxHearts": 3,
            "fxOther": 3,
            "fxPower": 1,
            "gold": 18,
            "hearts": 11,
            "moss": 4,
            "plain": 2,
            "power": 13,
            "tide": 9,
            "total": 19,
          }
        `)
        const line = (c: (typeof cards)[number]) =>
            `${c.type} ${c.kind} cost ${c.cost}: ${c.gold}g ${c.power}p ${c.hearts}h [${c.fx.join(',')}]`
        expect(cards.map(line).sort()).toMatchInlineSnapshot(`
          [
            "ember recruit cost 2: 0g 0p 1h []",
            "ember recruit cost 3: 0g 1p 0h [reapG]",
            "ember recruit cost 3: 0g 1p 1h []",
            "ember recruit cost 5: 1g 2p 0h [reapP]",
            "moss recruit cost 2: 2g 0p 0h []",
            "moss recruit cost 4: 2g 0p 0h [reapG]",
            "moss recruit cost 4: 2g 0p 1h []",
            "moss recruit cost 5: 0g 0p 3h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "tide recruit cost 2: 0g 0p 0h [cheap]",
            "tide recruit cost 2: 0g 2p 0h []",
            "tide recruit cost 2: 1g 0p 0h [exile]",
            "tide recruit cost 3: 1g 0p 0h [kin]",
            "tide recruit cost 4: 0g 3p 0h []",
            "tide recruit cost 5: 1g 0p 2h []",
            "tide recruit cost 5: 1g 3p 0h []",
            "tide recruit cost 5: 3g 0p 1h []",
            "tide recruit cost 8: 3g 0p 2h [exile]",
          ]
        `)
    })
})

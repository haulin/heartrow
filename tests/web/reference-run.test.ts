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
            redraws: state.redraws,
            piles: [state.deck.length, state.hand.length, state.discard.length, state.exile.length],
        }).toMatchInlineSnapshot(`
          {
            "gold": 2,
            "hearts": 17,
            "piles": [
              0,
              5,
              12,
              0,
            ],
            "power": 0,
            "redraws": 3,
            "turn": 10,
          }
        `)
    })

    it('ends with the same deck', () => {
        expect(deckSummary(state)).toMatchInlineSnapshot(`
          {
            "ember": 3,
            "fxGold": 1,
            "fxHearts": 2,
            "fxOther": 1,
            "fxPower": 0,
            "gold": 15,
            "hearts": 0,
            "moss": 1,
            "plain": 10,
            "power": 14,
            "tide": 3,
            "total": 17,
          }
        `)
        const line = (c: (typeof cards)[number]) =>
            `${c.type} ${c.kind} cost ${c.cost}: ${c.gold}g ${c.power}p ${c.hearts}h [${c.fx.join(',')}]`
        expect(cards.map(line).sort()).toMatchInlineSnapshot(`
          [
            "ember recruit cost 2: 0g 2p 0h []",
            "ember recruit cost 5: 0g 3p 0h [reapP]",
            "ember recruit cost 5: 2g 1p 0h [cycle]",
            "moss recruit cost 6: 4g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 0g 1p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "plain basic cost 0: 1g 0p 0h []",
            "tide recruit cost 2: 2g 0p 0h []",
            "tide recruit cost 4: 1g 0p 0h [coin]",
            "tide recruit cost 5: 0g 3p 0h [reapP]",
          ]
        `)
    })
})

import { describe, expect, it } from 'vite-plus/test'
import { LONG_MODE, legalMoves, standardMode } from '../../src/core'
import type { Card, GameState, Move } from '../../src/core'
import { modeFromId, parseStartParams, shareQuery } from '../../src/platform/web/mode'
import { startSession, stepSession, undoSession } from '../../src/platform/web/session'
import type { Session } from '../../src/platform/web/session'
import { DEFAULT_SETTINGS, loadSettings, nextTheme, saveSettings } from '../../src/platform/web/settings'
import { GameStore } from '../../src/platform/web/store'
import { createJsonStorage, createMemoryStorage } from '../../src/platform/web/storage'
import { deckSummary, richParts, spoken, statusMessage } from '../../src/platform/web/text'
import { cardArt } from '../../src/platform/web/view/art'
import { buildCardView } from '../../src/platform/web/view/cardView'

const card = (over: Partial<Card> = {}): Card => ({
    id: 900,
    type: 'moss',
    kind: 'recruit',
    cost: 3,
    gold: 2,
    power: 0,
    hearts: 0,
    fx: [],
    main: 'gold',
    ...over,
})

function withHand(hand: Card[], over: Partial<GameState> = {}): Session {
    const s = startSession(standardMode(0), 7)
    return { ...s, state: { ...s.state, hand, deck: [card({ id: 901 }), card({ id: 902 })], discard: [], ...over } }
}

describe('card view model', () => {
    const state = startSession(standardMode(0), 3).state

    it('shows discounted cost, affordability and edge flags in the row', () => {
        const s = {
            ...state,
            gold: 2,
            recruitDiscount: 1,
            row: [card({ cost: 3 }), card({ id: 2, kind: 'enemy', type: 'foe', cost: 4, hearts: 2, gold: 0 })],
        }
        const v = buildCardView(s.row[0]!, 'row', 0, s)
        expect(v.cost).toEqual({ text: '2 ●', currency: 'gold' })
        expect(v.affordable).toBe(true)
        expect(v.edge).toBeNull()
        const e = buildCardView(s.row[1]!, 'row', 1, s)
        expect(e.affordable).toBe(false)
        expect(e.edge).toBe('enemy')
        expect(e.label).toBe('Enemy Enemy card. power to defeat. +2 hearts')
    })

    it('splits gains, effect lines and the retain line', () => {
        const c = card({ gold: 1, hearts: 1, fx: ['draw'], drawCount: 2, retain: true, played: true })
        const v = buildCardView(c, 'hand', 0, state)
        expect(v.gains.map((g) => g.text)).toEqual(['+1 ●', '+1 ♥'])
        expect(v.effects).toEqual(['Draw 2'])
        expect(v.retain).toContain('Retain')
        expect(v.played).toBe(true)
        expect(v.label).toContain('Already played this turn.')
    })

    it('spoken() replaces symbols', () => {
        expect(spoken('Need 2 more ●. +1 ⚔ and +2 ♥')).toBe('Need 2 more gold. +1 power and +2 hearts')
        expect(richParts('a ● b').map((p) => p.sym)).toEqual([null, 'g', null])
    })
})

describe('card art', () => {
    it('is deterministic and varies with the card', () => {
        const a = cardArt(card())
        expect(cardArt(card())).toEqual(a)
        expect(a).toHaveLength(8)
        expect(cardArt(card({ cost: 4 }))).not.toEqual(a)
        expect(cardArt(card({ type: 'plain', kind: 'basic', cost: 0 }))).toHaveLength(7)
        expect(cardArt(card({ type: 'foe', kind: 'enemy' }))[0]!.tag).toBe('polygon')
    })
})

describe('undo', () => {
    const fx = (id: Card['fx'][number], extra: Partial<Card> = {}) => card({ id: 10, gold: 0, fx: [id], ...extra })
    const play = (s: Session, i = 0) => stepSession(s, { type: 'play', handIndex: i }).session

    it('restores state, log and message after a plain play', () => {
        const start = withHand([card({ id: 1 })])
        const after = play(start)
        expect(after.state.gold).toBe(2)
        expect(after.undo).toHaveLength(1)
        const back = undoSession(after)
        expect(back.state).toBe(start.state)
        expect(back.history).toEqual(start.history)
        expect(back.undo).toEqual([])
    })

    it.each([['draw'], ['coin'], ['cycle']] as const)('is allowed after %s and replays the same outcome', (id) => {
        const start = withHand([fx(id), card({ id: 2 })])
        const first = play(start)
        expect(first.undo).toHaveLength(1)
        expect(play(undoSession(first)).state).toEqual(first.state)
    })

    it('stacks several moves in a turn and undoes them one by one', () => {
        const start = withHand([card({ id: 1 }), card({ id: 2 })])
        const one = play(start, 0)
        const two = play(one, 1)
        expect(two.undo).toHaveLength(2)
        expect(undoSession(two).state).toBe(one.state)
        expect(undoSession(undoSession(two)).state).toBe(start.state)
    })

    it('undoes an exile effect step by step', () => {
        const played = play(withHand([fx('exile'), card({ id: 2 })]))
        expect(played.state.pendingExile).toBe(true)
        const exiled = stepSession(played, { type: 'exile', handIndex: 1 }).session
        expect(exiled.state.exile).toHaveLength(1)
        expect(undoSession(exiled).state.pendingExile).toBe(true)
        const skipped = stepSession(played, { type: 'skipExile' }).session
        expect(undoSession(undoSession(skipped)).state.hand[0]!.played).toBeFalsy()
    })

    it('is cleared by endTurn, allowed after redraw, and untouched by a rejected move', () => {
        const played = play(withHand([card({ id: 1 })]))
        expect(stepSession(played, { type: 'endTurn' }).session.undo).toEqual([])
        expect(stepSession(played, { type: 'redraw' }).session.undo).toHaveLength(2)
        const rejected = stepSession(played, { type: 'play', handIndex: 0 })
        expect(rejected.rejected).toBe(true)
        expect(rejected.session.undo).toBe(played.undo)
        expect(rejected.session.message).toBe('That card is already played this turn.')
        expect(rejected.session.history).toEqual(played.history)
    })

    it('restores RNG so the replayed game is identical', () => {
        const s = startSession(standardMode(0), 11)
        const first = stepSession(s, { type: 'redraw' })
        const again = stepSession(undoSession(first.session), { type: 'redraw' })
        expect(again.session.state).toEqual(first.session.state)
    })
})

describe('store and session', () => {
    it('records history lines with a turn prefix and queues event batches', () => {
        const store = new GameStore(standardMode(0), 5)
        const idx = store.getState().hand.findIndex((c) => c.fx.length === 0)
        store.dispatch({ type: 'play', handIndex: idx })
        store.dispatch({ type: 'endTurn' })
        expect(store.getSession().history[0]).toMatch(/^T1 · Played a /)
        expect(store.getSession().history.some((l) => l.startsWith('T2 · Turn 2.'))).toBe(true)
        expect(store.takeBatches()).toHaveLength(2)
        expect(store.takeBatches()).toHaveLength(0)
    })

    it('plays a whole Long Run through legal moves and finishes', () => {
        const store = new GameStore(LONG_MODE, 9)
        let guard = 0
        while (store.getState().status === 'playing' && guard++ < 5000) {
            const moves = legalMoves(store.getState())
            const pick: Move = moves.find((m) => m.type === 'skipExile') ?? moves.find((m) => m.type === 'play') ?? { type: 'endTurn' }
            store.dispatch(pick)
        }
        expect(store.getState().status).toBe('finished')
        expect(statusMessage(store.getState())).toContain('Long Run complete')
        expect(store.getSession().history.at(-1)).toContain('Long Run complete')
    })

    it('summarises the deck', () => {
        const d = deckSummary(startSession(standardMode(0), 1).state)
        expect(d).toMatchObject({ total: 10, gold: 6, power: 4, plain: 10 })
    })
})

describe('mode and url params', () => {
    it('maps ids', () => {
        expect(modeFromId('long')).toBe(LONG_MODE)
        expect(modeFromId('standard3').goal).toBe(80)
        expect(modeFromId('2').id).toBe('standard2')
        expect(modeFromId('nonsense').id).toBe('standard1')
    })
    it('parses seed and mode', () => {
        const p = parseStartParams('?seed=123&mode=long', () => 1)
        expect(p).toEqual({ config: LONG_MODE, seed: 123 })
        expect(parseStartParams('?seed=abc', () => 42).seed).toBe(42)
        expect(shareQuery(LONG_MODE, 123)).toBe('?seed=123&mode=long')
    })
})

describe('storage and settings', () => {
    it('round-trips JSON and tolerates corrupt data', () => {
        const s = createMemoryStorage({ bad: '{nope' })
        expect(s.get('bad', 5)).toBe(5)
        s.set('k', { a: 1 })
        expect(s.get('k', null)).toEqual({ a: 1 })
        s.remove('k')
        expect(s.get('k', 'x')).toBe('x')
    })

    it('never throws when the backend is missing or throws', () => {
        const missing = createJsonStorage(() => null)
        missing.set('a', 1)
        expect(missing.get('a', 2)).toBe(2)
        const broken = createJsonStorage(() => {
            throw new Error('blocked')
        })
        broken.set('a', 1)
        broken.remove('a')
        expect(broken.get('a', 3)).toBe(3)
        const full = createJsonStorage(() => ({
            getItem: () => null,
            setItem: () => {
                throw new Error('quota')
            },
            removeItem: () => undefined,
        }))
        expect(() => full.set('a', 1)).not.toThrow()
    })

    it('validates stored settings', () => {
        const s = createMemoryStorage()
        expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
        saveSettings(s, { theme: 'dark', anim: 'fast', skin: 'default' })
        expect(loadSettings(s)).toEqual({ theme: 'dark', anim: 'fast', skin: 'default' })
        s.set('settings', { theme: 'neon', anim: 3, skin: 'gone' })
        expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS)
        expect(nextTheme('system')).toBe('light')
        expect(nextTheme('dark')).toBe('system')
    })
})

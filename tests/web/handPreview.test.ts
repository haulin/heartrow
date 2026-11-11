import { describe, expect, it } from 'vite-plus/test'
import { FLIP_LOW, applyMove, cloneState, standardMode } from '../../src/core'
import type { Card, GameState } from '../../src/core'
import { previewHand } from '../../src/platform/web/handPreview'
import { startSession } from '../../src/platform/web/session'

const card = (gold: number, power: number, hearts: number, fx: Card['fx'] = [], extra: Partial<Card> = {}): Partial<Card> => ({
    gold,
    power,
    hearts,
    fx,
    main: 'gold',
    retain: false,
    played: false,
    ...extra,
})

/** A fresh game whose first hand cards are replaced by the given ones, with nothing in hand beyond them. */
function stateWith(cards: Partial<Card>[], bank = { gold: 0, power: 0 }, seed = 5): GameState {
    const state = cloneState(startSession(standardMode(0), seed).state)
    state.hand = state.hand.slice(0, cards.length).map((base, i) => ({ ...base, ...cards[i]! }))
    state.gold = bank.gold
    state.power = bank.power
    return state
}

const none = { gold: false, power: false, hearts: false }
const all = { gold: true, power: true, hearts: true }
const drawTwo = card(0, 0, 0, ['draw'], { fxParams: { drawCount: 2 } })

describe('previewHand: plain cards', () => {
    it('adds up the printed gains of the cards in hand, whatever is in the bank', () => {
        const hand = [card(2, 0, 0), card(0, 3, 0), card(0, 0, 1)]
        const expected = { gold: 2, power: 3, hearts: 1, atLeast: none }
        expect(previewHand(stateWith(hand, { gold: 1, power: 1 }))).toEqual(expected)
        expect(previewHand(stateWith(hand, { gold: 9, power: 0 }))).toEqual(expected)
    })

    it('does not depend on the order of the hand', () => {
        const hand = [card(2, 0, 0), card(0, 3, 0, ['swap']), card(1, 1, 1), card(0, 0, 0, ['flip'])]
        expect(previewHand(stateWith([...hand].reverse()))).toEqual(previewHand(stateWith(hand)))
    })

    it('drops a card from the number once it is played, and shows zeros when all are played', () => {
        const state = stateWith([card(2, 0, 0), card(0, 3, 0)])
        const afterOne = applyMove(state, { type: 'play', handIndex: 0 }).state
        expect(previewHand(afterOne)).toEqual({ gold: 0, power: 3, hearts: 0, atLeast: none })
        const afterTwo = applyMove(afterOne, { type: 'play', handIndex: 1 }).state
        expect(previewHand(afterTwo)).toEqual({ gold: 0, power: 0, hearts: 0, atLeast: none })
    })

    it('keeps working while an exile is pending, and is null once the run is over', () => {
        const exiling = stateWith([card(2, 0, 0)])
        exiling.pendingExile = true
        expect(previewHand(exiling)?.gold).toBe(2)
        const over = stateWith([card(2, 0, 0)])
        over.status = 'lost'
        expect(previewHand(over)).toBeNull()
    })

    it('is the sum of the printed gains in every opening hand', () => {
        for (let seed = 1; seed <= 20; seed++) {
            const state = cloneState(startSession(standardMode(0), seed).state)
            const sum = (pick: (c: Card) => number): number => state.hand.reduce((total, c) => total + pick(c), 0)
            expect(previewHand(state)).toEqual({
                gold: sum((c) => c.gold),
                power: sum((c) => c.power),
                hearts: sum((c) => c.hearts),
                atLeast: none,
            })
        }
    })
})

describe('previewHand: effects', () => {
    it('counts a Swap as nothing, but keeps the plain gains printed on the same card', () => {
        expect(previewHand(stateWith([card(0, 0, 0, ['swap']), card(4, 0, 0)], { gold: 0, power: 5 }))).toEqual({
            gold: 4,
            power: 0,
            hearts: 0,
            atLeast: none,
        })
        expect(previewHand(stateWith([card(2, 0, 0, ['swap'])]))).toEqual({ gold: 2, power: 0, hearts: 0, atLeast: none })
    })

    it('counts an Echo as nothing, whatever was played last, but keeps its own printed gains', () => {
        const state = stateWith([card(1, 1, 0, ['echo']), card(0, 0, 0, ['echo'])])
        state.lastUsed = { ...state.hand[0]!, gold: 9, power: 9, hearts: 9, fx: [] }
        expect(previewHand(state)).toEqual({ gold: 1, power: 1, hearts: 0, atLeast: none })
    })

    it('counts a Flip at its low amount, whatever it rolls, and marks that number as a minimum', () => {
        for (let seed = 0; seed < 8; seed++) {
            const state = stateWith([card(0, 0, 0, ['flip'])])
            state.streams.flip = [seed, seed * 3, seed * 7, seed * 11]
            expect(previewHand(state)).toEqual({ gold: FLIP_LOW, power: 0, hearts: 0, atLeast: { ...none, gold: true } })
        }
    })

    it('marks every number as a minimum when a card draws, and counts the cards it drew once it is played', () => {
        const state = stateWith([card(3, 0, 0), drawTwo, card(0, 1, 0, ['echo']), card(0, 6, 0)])
        expect(previewHand(state)).toEqual({ gold: 3, power: 7, hearts: 0, atLeast: all })
        const played = applyMove(state, { type: 'play', handIndex: 1 }).state
        const drawn = played.hand.filter((c) => !c.played)
        const sum = (pick: (c: Card) => number): number => drawn.reduce((total, c) => total + pick(c), 0)
        expect(drawn.length).toBe(5)
        expect(previewHand(played)?.gold).toBe(sum((c) => c.gold))
        expect(previewHand(played)?.power).toBe(sum((c) => c.power))
    })

    it('stays the same when an enemy is defeated and the hand did not change', () => {
        const hand = [card(2, 0, 0, ['flip']), card(0, 0, 0, ['swap']), card(0, 0, 0, ['echo']), card(4, 3, 0)]
        const state = stateWith(hand, { gold: 3, power: 9 })
        const rowIndex = state.row.findIndex((c) => c.kind === 'enemy' && c.fx.length === 0)
        expect(rowIndex).toBeGreaterThanOrEqual(0)
        const after = applyMove(state, { type: 'take', rowIndex })
        expect(after.events.some((e) => e.type === 'defeated')).toBe(true)
        expect(previewHand(after.state)).toEqual(previewHand(state))
    })

    it('does not change the state it looks at', () => {
        const state = stateWith([card(2, 0, 0), card(0, 0, 0, ['flip']), drawTwo])
        const before = JSON.stringify(state)
        previewHand(state)
        expect(JSON.stringify(state)).toBe(before)
    })
})

import { describe, expect, it } from 'vite-plus/test'
import type { Card } from '../../src/core'
import { HAND_SORTS, arrangeHand, nextHandSort } from '../../src/platform/web/handView'

const card = (id: number, type: Card['type'], fx: Card['fx'] = [], played = false): Card => ({ id, type, fx, played }) as Card

const hand = [card(1, 'tide', ['draw']), card(2, 'moss'), card(3, 'tide', ['bond']), card(4, 'moss', ['draw'], true), card(5, 'ember')]
const ids = (cards: Card[]) => cards.map((c) => c.id)

describe('arrangeHand', () => {
    it('keeps the draw order by default', () => {
        expect(ids(arrangeHand(hand, 'draw', false))).toEqual([1, 2, 3, 4, 5])
    })

    it('groups by type and keeps the draw order inside a group', () => {
        expect(ids(arrangeHand(hand, 'type', false))).toEqual([2, 4, 5, 1, 3])
    })

    it('groups by effect and puts cards without one last', () => {
        const arranged = arrangeHand(hand, 'effect', false)
        expect(ids(arranged).slice(-2)).toEqual([2, 5])
        expect(ids(arranged).indexOf(1)).toBeLessThan(ids(arranged).indexOf(4) + 1)
    })

    it('hides played cards on request and never changes the hand', () => {
        expect(ids(arrangeHand(hand, 'draw', true))).toEqual([1, 2, 3, 5])
        expect(ids(hand)).toEqual([1, 2, 3, 4, 5])
    })
})

describe('nextHandSort', () => {
    it('cycles through every sort and back', () => {
        const seen = [HAND_SORTS[0]!.id]
        for (let i = 1; i < HAND_SORTS.length; i++) seen.push(nextHandSort(seen.at(-1)!))
        expect(seen).toEqual(HAND_SORTS.map((sort) => sort.id))
        expect(nextHandSort(seen.at(-1)!)).toBe(seen[0])
    })
})

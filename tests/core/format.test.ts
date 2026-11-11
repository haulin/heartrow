import { describe, expect, it } from 'vite-plus/test'
import {
    applyMove,
    edgeEnemyHearts,
    effectText,
    formatEvent,
    formatEvents,
    legalMoves,
    LONG_MODE,
    newGame,
    standardMode,
} from '../../src/core'
import type { Card, CardType, EffectId, GameEvent, GameState, Move } from '../../src/core'

const ctx = { turn: 5 }
const card = (type: CardType, extra: Partial<Card> = {}): Card => ({
    id: 1,
    type,
    kind: type === 'foe' ? 'enemy' : type === 'plain' ? 'basic' : 'recruit',
    cost: 0,
    gold: 0,
    power: 0,
    hearts: 0,
    fx: [],
    main: 'gold',
    ...extra,
})
const gains = (gold = 0, power = 0, hearts = 0) => ({ gold, power, hearts })

describe('formatEvent', () => {
    it('formats single events like the prototype', () => {
        const cases: [GameEvent, string][] = [
            [{ type: 'played', card: card('moss'), gains: gains(2, 0, 1) }, 'Played a Moss card +2 ● +1 ♥.'],
            [{ type: 'played', card: card('plain'), gains: gains() }, 'Played a Basic card.'],
            [{ type: 'recruited', card: card('tide'), paid: 5 }, 'Recruited a Tide card for 5 ●.'],
            [
                { type: 'defeated', card: card('foe', { cost: 6, hearts: 3 }), paid: 6, gains: gains(0, 0, 3) },
                'Defeated an enemy (6 ⚔): +3 ♥.',
            ],
            [{ type: 'drew', cardIds: [1], requested: 2, cause: 'effect' }, 'Drew 2 cards.'],
            [{ type: 'drew', cardIds: [1], requested: 1, cause: 'effect' }, 'Drew 1 card.'],
            [{ type: 'flipped', currency: 'gold', amount: 4 }, 'Flip: +4 ●.'],
            [{ type: 'swapped', gold: 7, power: 1 }, 'Swapped ● and ⚔: now 7 ● and 1 ⚔.'],
            [{ type: 'cycled', count: 3, redraw: false }, 'Cycled 3 cards.'],
            [{ type: 'exiled', card: card('moss') }, 'Exiled a Moss card.'],
            [{ type: 'exileSkipped' }, 'Skipped the exile.'],
            [{ type: 'rowFlushed', cards: [], kept: card('foe') }, 'Flushed the four left cards. The Gate card cannot be flushed.'],
            [{ type: 'escaped', card: card('foe'), hearts: 3 }, 'An enemy escaped: −3 ♥.'],
            [{ type: 'reaped', hearts: 2 }, 'Leftovers reaped: +2 ♥.'],
            [{ type: 'goalReached' }, 'Goal reached! End your turn to win, or keep going for a bigger margin.'],
            [{ type: 'turnStarted', turn: 5, flushGained: true }, 'Turn 5. You gained a flush.'],
            [{ type: 'rejected', reason: 'cannotAfford', short: 3, currency: 'gold' }, 'Need 3 more ●.'],
            [{ type: 'rejected', reason: 'cannotAfford', short: 2, currency: 'power' }, 'Need 2 more ⚔.'],
            [{ type: 'rejected', reason: 'alreadyPlayed' }, 'That card is already played this turn.'],
        ]
        for (const [event, text] of cases) expect(formatEvent(event, ctx)).toBe(text)
    })

    it('returns null for silent events', () => {
        const silent: GameEvent[] = [
            { type: 'reshuffled' },
            { type: 'rowRefilled', card: card('moss') },
            { type: 'gameOver', status: 'won' },
            { type: 'rejected', reason: 'unknownMove' },
            { type: 'retained', count: 0 },
            { type: 'drew', cardIds: [1], requested: 1, cause: 'turnStart' },
            { type: 'drew', cardIds: [1], requested: 1, cause: 'setup' },
            { type: 'drew', cardIds: [1], requested: 1, cause: 'cycle' },
        ]
        for (const event of silent) expect(formatEvent(event, ctx)).toBeNull()
    })

    it.each([['gameOver'], ['pendingExile'], ['noFlushes']] as const)('explains a rejected move (%s)', (reason) => {
        expect(formatEvent({ type: 'rejected', reason }, ctx)).toEqual(expect.any(String))
    })
})

describe('formatEvents', () => {
    it('merges defeat gains into one line', () => {
        const events: GameEvent[] = [
            { type: 'defeated', card: card('foe', { cost: 6, hearts: 3 }), paid: 6, gains: gains(1, 2, 4) },
            { type: 'rowRefilled', card: card('moss') },
        ]
        expect(formatEvents(events, ctx)).toEqual(['Defeated an enemy (6 ⚔): +4 ♥ +1 ● +2 ⚔.'])
    })

    it('merges end of turn into one Turn line', () => {
        const events: GameEvent[] = [
            { type: 'escaped', card: card('foe'), hearts: 3 },
            { type: 'rowRefilled', card: card('moss') },
            { type: 'reaped', hearts: 2 },
            { type: 'retained', count: 1 },
            { type: 'turnStarted', turn: 4, flushGained: true },
            { type: 'drew', cardIds: [1, 2, 3, 4, 5], requested: 5, cause: 'turnStart' },
        ]
        expect(formatEvents(events, { turn: 4, edgeEnemyHearts: 4 })).toEqual([
            'Turn 4. An enemy escaped: −3 ♥. Leftovers reaped: +2 ♥. You gained a flush. Kept 1 with Retain. The enemy at the Gate costs 4 ♥ if it escapes.',
        ])
        expect(formatEvents([{ type: 'turnStarted', turn: 2, flushGained: false }], ctx)).toEqual(['Turn 2.'])
    })

    it('keeps played effects as separate lines and hides cycle draws', () => {
        const events: GameEvent[] = [
            { type: 'played', card: card('tide'), gains: gains() },
            { type: 'drew', cardIds: [1, 2], requested: 2, cause: 'cycle' },
            { type: 'cycled', count: 2, redraw: false },
        ]
        expect(formatEvents(events, ctx)).toEqual(['Played a Tide card.', 'Cycled 2 cards.'])
    })

    it('appends the nothing-to-discard note to the played line', () => {
        const events: GameEvent[] = [
            { type: 'played', card: card('tide'), gains: gains() },
            { type: 'cycled', count: 0, redraw: false },
        ]
        expect(formatEvents(events, ctx)).toEqual(['Played a Tide card. Nothing to discard.'])
    })

    it('emits escape and reap lines separately when the game ends', () => {
        const events: GameEvent[] = [
            { type: 'escaped', card: card('foe'), hearts: 2 },
            { type: 'retained', count: 1 },
            { type: 'gameOver', status: 'lost' },
        ]
        expect(formatEvents(events, ctx)).toEqual(['An enemy escaped: −2 ♥.'])
    })
})

describe('effectText', () => {
    it('substitutes templates', () => {
        const fx = (ids: EffectId[], extra: Partial<Card> = {}) => effectText(card('tide', { fx: ids, ...extra }))
        expect(fx(['draw'], { fxParams: { drawCount: 3 } })).toEqual(['Draw 3'])
        expect(fx(['draw'])).toEqual(['Draw 1'])
        expect(fx(['bond'], { fxParams: { bondCount: 2 }, main: 'power' })).toEqual(['+2 ⚔ if you played Tide earlier this turn'])
        expect(fx(['kin', 'army'], { fxParams: { currency: 'power' } })).toEqual([
            '+1 ⚔ per other Tide card played this turn',
            '+1 ⚔ per 4 Tide cards in your deck',
        ])
        expect(fx(['kin'])).toEqual(['+1 ● per other Tide card played this turn'])
        expect(fx(['basics', 'pile', 'flip'], { fxParams: { currency: 'power' } })).toEqual([
            '+1 ⚔ per 4 basic cards in your deck',
            '+1 ⚔ per 3 cards in your discard',
            '+2 or +4 ⚔',
        ])
        expect(fx(['kin'], { type: 'tide', fxParams: { currency: 'hearts' } })).toEqual(['+1 ♥ per other Tide card played this turn'])
        expect(fx(['swap'], { retain: true })).toEqual(['Swap ● and ⚔', '↺ Retain: stays in hand if unplayed'])
        expect(fx(['exile'])).toEqual(['Exile a card or river recruit'])
    })

    it('prefixes enemy effects with Defeat', () => {
        expect(effectText(card('foe', { fx: ['foes'] }))).toEqual(['Defeat: +1 ⚔ per enemy in the river'])
    })
})

describe('edgeEnemyHearts', () => {
    it('reads the right-edge card', () => {
        const row = (edge: Card) => ({ row: [card('moss'), edge] }) as unknown as GameState
        expect(edgeEnemyHearts(row(card('foe', { hearts: 4 })))).toBe(4)
        expect(edgeEnemyHearts(row(card('moss')))).toBeUndefined()
    })
})

describe('engine integration', () => {
    const firstMove = (state: GameState): Move => {
        const moves = legalMoves(state)
        return moves.find((m) => m.type !== 'flush' && m.type !== 'endTurn') ?? moves.find((m) => m.type === 'endTurn')!
    }

    for (const mode of [standardMode(0), LONG_MODE]) {
        it(`formats a seeded ${mode.id} game`, () => {
            let { state } = newGame(mode, 7)
            let endTurns = 0
            let turnLines = 0
            for (let step = 0; step < 5000 && state.status === 'playing'; step++) {
                const move = firstMove(state)
                const before = state
                const result = applyMove(state, move)
                state = result.state
                const lines = formatEvents(result.events, { turn: before.turn, edgeEnemyHearts: edgeEnemyHearts(state) })
                for (const line of lines) {
                    expect(line).not.toMatch(/undefined|NaN/)
                    expect(line.length).toBeGreaterThan(0)
                }
                if (move.type === 'endTurn') {
                    endTurns++
                    if (state.status === 'playing') {
                        turnLines++
                        expect(lines.some((l) => l.startsWith(`Turn ${state.turn}.`))).toBe(true)
                    }
                }
            }
            expect(state.status).not.toBe('playing')
            expect(endTurns).toBeGreaterThan(1)
            expect(turnLines).toBe(endTurns - 1)
        })
    }
})

import { EFFECT_BY_ID } from '../../core'
import type { Card, EffectId, GameState, HeartSource, Move } from '../../core'

export const INTRO_TEXT =
    'Click hand cards to play them, or recruit row cards to buy them. Gold ● buys recruits; power ⚔ defeats enemies for their ♥.'

export const longIntro = (turns: number): string => `Long Run: build the highest heart score over ${turns} turns.`

export const spoken = (s: string): string =>
    s
        .replace(/\bgold\s+●/gi, 'gold')
        .replace(/\bpower\s+⚔/gi, 'power')
        .replace(/\bhearts?\s+♥/gi, 'hearts')
        .replaceAll('●', 'gold')
        .replaceAll('⚔', 'power')
        .replaceAll('♥', 'hearts')

export type RichSym = 'g' | 'p' | 'h' | 'r'
export type RichPart = { text: string; sym: RichSym | null }

/** The core writes these symbols as plain text. The web build draws each one as an icon over the text (see `.ico` in styles.css). */
const SYMBOL_CLASS: Record<string, RichSym> = { '●': 'g', '⚔': 'p', '♥': 'h', '↺': 'r' }

export function richParts(s: string): RichPart[] {
    return s
        .split(/([●⚔♥↺])/)
        .filter((part) => part !== '')
        .map((text) => ({ text, sym: SYMBOL_CLASS[text] ?? null }))
}

export function statsSummary(state: GameState): string {
    const s = state.stats
    return `Defeated ${s.kills}, recruited ${s.recruited}, exiled ${s.exiled}, lost ${s.lostToEscapes} ♥ to escapes. Wasted ${s.wastedGold} ●, ${s.wastedPower} ⚔; ${state.flushes} flushes left.`
}

/** How many moves each turn took, oldest first. A turn ends with its `endTurn` move, and a turn the run never reached is not listed. */
export function movesPerTurn(moves: readonly Move[]): number[] {
    const counts: number[] = []
    let current = 0
    for (const move of moves) {
        current++
        if (move.type === 'endTurn') {
            counts.push(current)
            current = 0
        }
    }
    if (current > 0) counts.push(current)
    return counts
}

export interface MoveFacts {
    total: number
    perTurn: string
    busiest: number
    busiestTurn: number
}

/** How many moves the run took, null before the first one. */
export function moveFacts(moves: readonly Move[]): MoveFacts | null {
    const counts = movesPerTurn(moves)
    if (counts.length === 0) return null
    const busiest = Math.max(...counts)
    return { total: moves.length, perTurn: (moves.length / counts.length).toFixed(1), busiest, busiestTurn: counts.indexOf(busiest) + 1 }
}

export function movesSummary(moves: readonly Move[]): string {
    const facts = moveFacts(moves)
    if (!facts) return ''
    return `${facts.total} moves, ${facts.perTurn} per turn; the most in one turn: ${facts.busiest} (T${facts.busiestTurn}).`
}

const HEART_SOURCE_NAMES: Partial<Record<HeartSource, string>> = { plain: 'plain gains', defeat: 'enemies' }

const heartSourceName = (source: HeartSource): string => HEART_SOURCE_NAMES[source] ?? source[0]!.toUpperCase() + source.slice(1)

/** Where the hearts of the run came from, most first. Effects use their id as a name (`reapG` reads "ReapG"). */
export function heartsBreakdown(state: GameState): { name: string; amount: number }[] {
    const sources = Object.entries(state.stats.heartsFrom).filter(([, amount]) => (amount ?? 0) > 0) as [HeartSource, number][]
    return sources.sort((a, b) => b[1] - a[1]).map(([source, amount]) => ({ name: heartSourceName(source), amount }))
}

export function heartsSummary(state: GameState): string {
    const sources = heartsBreakdown(state)
    if (sources.length === 0) return ''
    return `Hearts from: ${sources.map(({ name, amount }) => `${name} ${amount}`).join(', ')}.`
}

function runSummary(state: GameState, moves: readonly Move[]): string {
    return [statsSummary(state), heartsSummary(state), movesSummary(moves)].filter((part) => part !== '').join(' ')
}

/** How a finished run ended, in one sentence, or null while it is being played. */
export function outcomeLine(state: GameState): string | null {
    switch (state.status) {
        case 'won':
            return `You won with ${state.hearts} ♥ on turn ${state.turn}.`
        case 'lost':
            return `Out of turns: ${state.hearts}/${state.goal} ♥.`
        case 'finished':
            return `Long Run complete: ${state.hearts} ♥ after ${state.maxTurns} turns.`
        default:
            return null
    }
}

export function statusMessage(state: GameState, moves: readonly Move[] = []): string | null {
    const outcome = outcomeLine(state)
    return outcome === null ? null : `${outcome} ${runSummary(state, moves)}`
}

export const TYPE_ORDER = ['plain', 'moss', 'ember', 'tide', 'foe'] as const

const cardValue = (c: Card): number => c.gold + c.power + c.hearts * 1.5 + c.fx.length

export function sortPile(cards: readonly Card[]): Card[] {
    return cards.slice().sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || cardValue(b) - cardValue(a))
}

type EffectBucket = 'g' | 'p' | 'h' | 'u'

const RESOURCE_BUCKET = { gold: 'g', power: 'p', hearts: 'h' } as const

/** The summary column an effect counts under, read from the effect's own `pays` field. */
function effectBucket(card: Card, effect: EffectId): EffectBucket {
    const pays = EFFECT_BY_ID[effect].pays
    if (!pays) return 'u'
    if (pays === 'main') return RESOURCE_BUCKET[card.main]
    if (pays === 'rolled') return RESOURCE_BUCKET[card.fxParams?.currency ?? card.main]
    return RESOURCE_BUCKET[pays]
}

export interface DeckSummary {
    total: number
    gold: number
    power: number
    hearts: number
    fxGold: number
    fxPower: number
    fxHearts: number
    fxOther: number
    moss: number
    ember: number
    tide: number
    plain: number
}

export function deckSummary(state: GameState): DeckSummary {
    const all = [...state.deck, ...state.hand, ...state.discard]
    const sum = (key: 'gold' | 'power' | 'hearts') => all.reduce((a, c) => a + c[key], 0)
    const count = (type: Card['type']) => all.filter((c) => c.type === type).length
    const e: Record<EffectBucket, number> = { g: 0, p: 0, h: 0, u: 0 }
    for (const c of all) {
        for (const k of c.fx) e[effectBucket(c, k)]++
    }
    return {
        total: all.length,
        gold: sum('gold'),
        power: sum('power'),
        hearts: sum('hearts'),
        fxGold: e.g,
        fxPower: e.p,
        fxHearts: e.h,
        fxOther: e.u,
        moss: count('moss'),
        ember: count('ember'),
        tide: count('tide'),
        plain: count('plain'),
    }
}

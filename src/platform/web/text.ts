import type { Card, GameState } from '../../core'

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

export type RichPart = { text: string; sym: 'g' | 'p' | 'h' | null }

const SYMBOL_CLASS: Record<string, 'g' | 'p' | 'h'> = { '●': 'g', '⚔': 'p', '♥': 'h' }

export function richParts(s: string): RichPart[] {
    return s
        .split(/([●⚔♥])/)
        .filter((part) => part !== '')
        .map((text) => ({ text, sym: SYMBOL_CLASS[text] ?? null }))
}

export function statsSummary(state: GameState): string {
    const s = state.stats
    return `Defeated ${s.kills}, recruited ${s.recruited}, exiled ${s.exiled}, lost ${s.lostToEscapes} ♥ to escapes. Wasted ${s.wastedGold} ●, ${s.wastedPower} ⚔; ${state.redraws} redraws left.`
}

export function statusMessage(state: GameState): string | null {
    switch (state.status) {
        case 'won':
            return `You won with ${state.hearts} ♥ on turn ${state.turn}. ${statsSummary(state)}`
        case 'lost':
            return `Out of turns: ${state.hearts}/${state.goal} ♥. ${statsSummary(state)}`
        case 'finished':
            return `Long Run complete: ${state.hearts} ♥ after ${state.maxTurns} turns. ${statsSummary(state)}`
        default:
            return null
    }
}

export const TYPE_ORDER = ['plain', 'moss', 'ember', 'tide', 'foe'] as const

const cardValue = (c: Card): number => c.gold + c.power + c.hearts * 1.5 + c.fx.length

export function sortPile(cards: readonly Card[]): Card[] {
    return cards.slice().sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || cardValue(b) - cardValue(a))
}

type EffectBucket = 'g' | 'p' | 'h' | 'u'

const EFFECT_BUCKET: Record<string, EffectBucket | 'main' | 'kin'> = {
    coin: 'g',
    basics: 'g',
    foes: 'p',
    pile: 'p',
    all3: 'h',
    vault: 'h',
    reapG: 'h',
    reapP: 'h',
    bond: 'main',
    kin: 'kin',
    army: 'kin',
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
        for (const k of c.fx) {
            const b = EFFECT_BUCKET[k] ?? 'u'
            if (b === 'main') e[c.main === 'power' ? 'p' : 'g']++
            else if (b === 'kin') e[c.kinCurrency === 'power' ? 'p' : 'g']++
            else e[b]++
        }
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

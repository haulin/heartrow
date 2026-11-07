import type { Card, CardType, EffectId, GameEvent, GameState, Gains, GeneratorResource } from './types'

export interface FormatContext {
    turn: number
    edgeEnemyHearts?: number | undefined
}

export const TYPE_NAMES: Record<CardType, string> = {
    moss: 'Moss',
    ember: 'Ember',
    tide: 'Tide',
    plain: 'Basic',
    foe: 'Enemy',
}

const EFFECT_TEMPLATES: Record<EffectId, string> = {
    draw: 'Draw {n}',
    flip: 'Flip: +2 or +4 {c}',
    exile: 'Exile a card or river recruit',
    cheap: 'Recruits cost −{a} ● this turn',
    foes: '+1 ⚔ per enemy in the recruit row',
    all3: '+2 ♥ if you played all 3 types this turn',
    vault: '+1 ♥ per 3 cards in exile',
    basics: '+1 {c} per 4 basic cards in your deck',
    pile: '+1 {c} per 3 cards in your discard',
    hoard: '+{a} {c} per {d} cards in your deck',
    bulk: 'Needs −1 ⚔ per {d} cards in your deck',
    bond: 'Bond: +{n} {m} if you played {T} earlier this turn',
    kin: '+1 {k} per other {T} card played this turn',
    weak: 'Enemies need −{a} ⚔ this turn',
    army: '+1 {k} per 4 {T} cards in your deck',
    cycle: 'Cycle unplayed cards except Retain ones',
    purge: 'Redraw all unplayed cards, even Retain ones',
    swap: 'Swap ● and ⚔',
    reapG: 'End of turn: +1 ♥ per 3 unspent ●',
    reapP: 'End of turn: +1 ♥ per 2 unspent ⚔',
}

/** Effects that act while the enemy is in the row, so they carry no "Defeat:" prefix. */
const PASSIVE_ENEMY_EFFECTS: readonly EffectId[] = ['bulk']

const RETAIN_TEXT = '↺ Retain: stays in hand if unplayed'

const symbol = (currency: GeneratorResource | undefined): string => (currency === 'power' ? '⚔' : currency === 'hearts' ? '♥' : '●')

export function effectText(card: Card): string[] {
    const lines = card.fx.map((id) => {
        const n = id === 'draw' ? (card.fxParams?.drawCount ?? 1) : (card.fxParams?.bondCount ?? 1)
        const outputCurrency = card.fxParams?.currency ?? (id === 'pile' ? 'power' : id === 'kin' || id === 'army' ? card.main : 'gold')
        const text = EFFECT_TEMPLATES[id]
            .replaceAll('{m}', symbol(card.main))
            .replaceAll('{k}', symbol(outputCurrency))
            .replaceAll('{c}', symbol(outputCurrency))
            .replaceAll('{n}', String(n))
            .replaceAll('{a}', String(card.fxParams?.amount ?? 1))
            .replaceAll('{d}', String(card.fxParams?.perCards ?? card.fxParams?.costPerCards ?? 1))
            .replaceAll('{T}', TYPE_NAMES[card.type])
        return card.kind === 'enemy' && !PASSIVE_ENEMY_EFFECTS.includes(id) ? `Defeat: ${text}` : text
    })
    if (card.retain) lines.push(RETAIN_TEXT)
    return lines
}

const plural = (n: number): string => (n === 1 ? '' : 's')

const playedLine = (card: Card, gains: Gains): string => {
    let line = `Played a ${TYPE_NAMES[card.type]} card`
    if (gains.gold > 0) line += ` +${gains.gold} ●`
    if (gains.power > 0) line += ` +${gains.power} ⚔`
    if (gains.hearts > 0) line += ` +${gains.hearts} ♥`
    return `${line}.`
}

const defeatedLine = (card: Card, gains: Gains): string => {
    const extra = [gains.gold ? `+${gains.gold} ●` : '', gains.power ? `+${gains.power} ⚔` : ''].filter(Boolean).join(' ')
    return `Defeated an enemy (${card.cost} ⚔): +${gains.hearts} ♥${extra ? ` ${extra}` : ''}.`
}

const escapedText = (hearts: number): string => `An enemy escaped: −${hearts} ♥.`
const reapedText = (hearts: number): string => `Leftovers reaped: +${hearts} ♥.`
const retainedText = (count: number): string => `Kept ${count} with Retain.`
const FLUSH_GAINED_TEXT = 'You gained a flush.'
const edgeText = (hearts: number): string => `The enemy on the right edge costs ${hearts} ♥ if it escapes.`

export function formatEvent(event: GameEvent, ctx: FormatContext): string | null {
    switch (event.type) {
        case 'rejected':
            if (event.reason === 'alreadyPlayed') return 'That card is already played this turn.'
            if (event.reason === 'pendingExile') return 'Choose a card to exile, or skip the exile.'
            if (event.reason === 'cannotExile') return 'Only recruits in the first four river slots can be exiled.'
            if (event.reason === 'gameOver') return 'The run is over. Start a new game.'
            if (event.reason === 'noFlushes') return 'No flushes left.'
            if (event.reason === 'cannotAfford' && event.short !== undefined) {
                return `Need ${event.short} more ${symbol(event.currency === 'power' ? 'power' : 'gold')}.`
            }
            return null
        case 'played':
            return playedLine(event.card, event.gains)
        case 'drew':
            return event.cause === 'effect' && event.requested > 0 ? `Drew ${event.requested} card${plural(event.requested)}.` : null
        case 'flipped':
            return `Flip: +${event.amount} ${symbol(event.currency)}.`
        case 'swapped':
            return 'Swapped ● and ⚔.'
        case 'cycled':
            return event.count > 0 ? `Cycled ${event.count} cards.` : 'Nothing to discard.'
        case 'exiled':
            return `Exiled a ${TYPE_NAMES[event.card.type]} card.`
        case 'exileSkipped':
            return 'Skipped the exile.'
        case 'recruited':
            return `Recruited a ${TYPE_NAMES[event.card.type]} card for ${event.paid} ●.`
        case 'defeated':
            return defeatedLine(event.card, event.gains)
        case 'rowFlushed':
            return 'Flushed the four left cards. The right-edge card cannot be flushed.'
        case 'escaped':
            return escapedText(event.hearts)
        case 'reaped':
            return reapedText(event.hearts)
        case 'retained':
            return event.count > 0 ? retainedText(event.count) : null
        case 'turnStarted':
            return turnLine(event.turn, [], event.flushGained, 0, ctx.edgeEnemyHearts)
        case 'goalReached':
            return 'Goal reached! End your turn to win, or keep going for a bigger margin.'
        case 'reshuffled':
        case 'rowRefilled':
        case 'gameOver':
            return null
        default: {
            const unreachable: never = event
            return unreachable
        }
    }
}

function turnLine(turn: number, notes: string[], flushGained: boolean, kept: number, edgeHearts: number | undefined): string {
    const parts = [`Turn ${turn}.`, ...notes]
    if (flushGained) parts.push(FLUSH_GAINED_TEXT)
    if (kept > 0) parts.push(retainedText(kept))
    if (edgeHearts !== undefined && edgeHearts > 0) parts.push(edgeText(edgeHearts))
    return parts.join(' ')
}

export function formatEvents(events: readonly GameEvent[], ctx: FormatContext): string[] {
    const turnEvent = events.find((e) => e.type === 'turnStarted')
    const lines: string[] = []
    let playedIndex = -1

    for (const event of events) {
        if (turnEvent) {
            if (event.type === 'escaped' || event.type === 'reaped' || event.type === 'retained') continue
            if (event === turnEvent && event.type === 'turnStarted') {
                const notes: string[] = []
                let kept = 0
                for (const e of events) {
                    if (e.type === 'escaped') notes.push(escapedText(e.hearts))
                    else if (e.type === 'reaped') notes.push(reapedText(e.hearts))
                    else if (e.type === 'retained') kept += e.count
                }
                lines.push(turnLine(event.turn, notes, event.flushGained, kept, ctx.edgeEnemyHearts))
                continue
            }
        } else if (event.type === 'retained') {
            continue
        }
        if (event.type === 'cycled' && event.count === 0) {
            if (playedIndex >= 0) {
                lines[playedIndex] = `${lines[playedIndex]} Nothing to discard.`
                continue
            }
        }
        const line = formatEvent(event, ctx)
        if (line === null) continue
        if (event.type === 'played') playedIndex = lines.length
        lines.push(line)
    }

    return lines
}

export function historyLine(line: string, ctx: FormatContext): string {
    return `T${ctx.turn} · ${line}`
}

export function edgeEnemyHearts(state: GameState): number | undefined {
    const edge = state.row[state.row.length - 1]
    return edge && edge.kind === 'enemy' ? edge.hearts : undefined
}

import type { ComponentChildren } from 'preact'
import type { GameState } from '../../core'
import { Rich } from './Rich'

const PIPS = [
    ['moss', '--moss'],
    ['ember', '--ember'],
    ['tide', '--tide'],
] as const

const reapBadge = (n: number): string => (n === 0 ? '' : n < 4 ? '♥'.repeat(n) : `♥x${n}`)

interface StatProps {
    label: string
    /** Lets the animations find the box (`data-stat`). */
    id?: string
    cls?: string
    title?: string
    badge?: string
    children: ComponentChildren
}

function Stat({ label, id, cls = '', title, badge, children }: StatProps) {
    return (
        <div class={`stat ${cls}`} title={title} data-stat={id}>
            {children}
            <small>{label}</small>
            {badge ? (
                <span class="rb">
                    <Rich text={badge} />
                </span>
            ) : null}
        </div>
    )
}

export interface StatsProps {
    state: GameState
    onFlush: () => void
    onPiles: () => void
}

export function Stats({ state: s, onFlush, onPiles }: StatsProps) {
    const long = s.goal === null
    const discountTip = [
        s.recruitDiscount && `Recruits cost ${s.recruitDiscount} less gold ●.`,
        s.enemyDiscount && `Enemies cost ${s.enemyDiscount} less power ⚔.`,
    ]
        .filter(Boolean)
        .join(' ')
    return (
        <div class="stats">
            <Stat label="turn" id="turn" title="Turn number. The game ends after the last turn.">
                {s.turn}
                <span class="den">/{s.maxTurns}</span>
            </Stat>
            <Stat
                label="hearts"
                id="hearts"
                cls="h"
                title={
                    long
                        ? 'High-score hearts. The run ends after the final turn.'
                        : 'Reach the goal to win. After a win you can play on to the last turn, and the hearts beyond the goal are your score. Enemies that get past the Gate take hearts away, and hearts can go negative.'
                }
            >
                {s.hearts}
                {long ? null : <span class="den">/{s.goal}</span>}
            </Stat>
            <Stat
                label="gold"
                id="gold"
                cls="g big"
                badge={reapBadge(s.reapGold)}
                title={
                    s.reapGold
                        ? `Unspent gold turns into hearts at the end of the turn: 1 per 3 for each reaping card in play. Now: +${s.reapGold * Math.floor(s.gold / 3)} ♥.`
                        : 'Spent on recruits. Resets every turn.'
                }
            >
                {s.gold}
            </Stat>
            <Stat
                label="power"
                id="power"
                cls="p big"
                badge={reapBadge(s.reapPower)}
                title={
                    s.reapPower
                        ? `Unspent power turns into hearts at the end of the turn: 1 per 2 for each reaping card in play. Now: +${s.reapPower * Math.floor(s.power / 2)} ♥.`
                        : 'Spent on defeating enemies. Resets every turn.'
                }
            >
                {s.power}
            </Stat>
            <Stat
                label="discount"
                id="discount"
                title={discountTip || 'No discounts this turn. Some cards make recruits or enemies cheaper.'}
            >
                {s.recruitDiscount ? <span class="g">−{s.recruitDiscount}</span> : null}
                {s.recruitDiscount && s.enemyDiscount ? ' ' : null}
                {s.enemyDiscount ? <span class="p">−{s.enemyDiscount}</span> : null}
                {!s.recruitDiscount && !s.enemyDiscount ? '0' : null}
            </Stat>
            <button
                type="button"
                class="stat"
                data-stat="flushes"
                onClick={onFlush}
                title={`Replace the four left cards of the river. You gain one every ${s.config.flushEvery} turns and they stack.`}
                aria-disabled={s.flushes < 1 ? 'true' : undefined}
            >
                {s.flushes}
                <small>flushes</small>
            </button>
            <Stat label="types played" title="Moss, Ember and Tide cards played this turn. Some cards reward playing all three.">
                <span class="pips">
                    {PIPS.map(([t, v]) => (
                        <span key={t} class="pip" style={{ background: `var(${v})`, opacity: s.typesPlayed.includes(t) ? 1 : 0.2 }} />
                    ))}
                </span>
            </Stat>
            <button
                type="button"
                class="stat"
                data-stat="piles"
                onClick={onPiles}
                title="Draw pile / discard / exile. Click to look inside."
            >
                <Rich text={`${s.deck.length} / ${s.discard.length} / ${s.exile.length}`} />
                <small>draw / discard / exile</small>
            </button>
        </div>
    )
}

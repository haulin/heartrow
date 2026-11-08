import type { Card, Gains } from '../../../core'
import type { AnimSpeed } from '../settings'
import type { Frame } from '../store'

/**
 * Animation planning and running. A frame (one move) is presented in two parts:
 * - Before effects play on the page as the player last saw it. The view only moves on to the new state when the blocking ones finish, so a
 *   recruited card does not vanish before its flight is done. Resource flights are purely visual: they never hold the view back.
 * - After effects play once the new state is drawn (new cards sliding in, stat boxes pulsing, a rejected click shaking).
 * Planning only reads the DOM and the frame. Running needs the Web Animations API and does nothing without it.
 */

export type EffectKind = 'flash' | 'fly' | 'flyCard' | 'inflate' | 'leave' | 'shrink' | 'enter' | 'deal' | 'shake' | 'pulse'

type GainClass = 'g' | 'p' | 'h'
export type GainStat = 'gold' | 'power' | 'hearts'

export interface Effect {
    kind: EffectKind
    el: HTMLElement
    /** Position in a group of similar effects. Later ones start a little later, for a stagger. */
    order?: number
    /** The target element of a flight. */
    to?: HTMLElement
    /** A resource flight shows this total, which can be more than the card's printed gain. */
    gain?: { amount: number; cls: GainClass; stat: GainStat }
    /** Sideways offset of a resource flight in a group, in flight widths, so flights from one card do not overlap. */
    spread?: number
}

/** What running an effect gives back: animations the view must wait for, and a purely visual one the caller may watch (a resource flight). */
export interface Running {
    wait: Animation[]
    visual: Animation[]
}

export const DURATION_MS: Record<AnimSpeed, number> = { off: 0, fast: 90, normal: 200, slow: 600 }

/** How much longer than at the normal setting a looping animation takes, so the setting scales the card art drift as well. */
export const loopTimeFactor = (speed: AnimSpeed): number => DURATION_MS[speed] / DURATION_MS.normal

/** A resource flight is long because it has three parts: it lifts away, drifts slowly so it can be read, and then flies to its stat box. */
const DURATION_FACTOR: Record<EffectKind, number> = {
    flash: 1.2,
    fly: 3.4,
    flyCard: 1.4,
    inflate: 1.2,
    leave: 1.2,
    shrink: 1,
    enter: 1.5,
    deal: 1.5,
    shake: 1,
    pulse: 1.2,
}

/** The delay between effects of one group, as a share of the effect's duration. */
const STAGGER = 0.15

const staggerDelay = (order: number | undefined, duration: number): number => (order ?? 0) * STAGGER * duration

/** Animations that run while more frames wait behind them are shortened, so a fast sequence (such as Play simple) plays as a quick stagger. */
const RUSH_FACTOR = 0.5

export function resolveSpeed(setting: AnimSpeed, reducedMotion: boolean): AnimSpeed {
    return reducedMotion ? 'off' : setting
}

const cardEls = (root: ParentNode, zone: 'row' | 'hand', id: number): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-zone="${zone}"] [data-card-id="${id}"]`)

const statEl = (root: ParentNode, name: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-stat="${name}"]`)

const GAIN_STATS = [
    ['gold', 'g', '●'],
    ['power', 'p', '⚔'],
    ['hearts', 'h', '♥'],
] as const

/** One flight per currency, showing the total the move gained. It starts from a gain badge, an effect label, or the card as a last resort. */
function gainFlights(root: ParentNode, card: HTMLElement | null, gains: Gains): Effect[] {
    const out: Effect[] = []
    for (const [currency, cls] of GAIN_STATS) {
        if (gains[currency] <= 0) continue
        const from =
            card?.querySelector<HTMLElement>(`.bd b.${cls}`) ??
            card?.querySelector<HTMLElement>('.bd b') ??
            card?.querySelector<HTMLElement>('.bd i') ??
            card
        const to = statEl(root, currency)
        if (from && to) out.push({ kind: 'fly', el: from, to, gain: { amount: gains[currency], cls, stat: currency } })
    }
    // Flights from one card fan out sideways and start one after another, so they do not land on top of each other.
    out.forEach((e, i) => {
        e.order = i
        e.spread = i - (out.length - 1) / 2
    })
    return out
}

const pulseOf = (root: ParentNode, name: string): Effect[] => {
    const el = statEl(root, name)
    return el ? [{ kind: 'pulse', el }] : []
}

/** Effects that play before the view moves on to the frame's new state. */
export function planBefore(frame: Frame, root: ParentNode): Effect[] {
    const out: Effect[] = []
    for (const event of frame.events) {
        switch (event.type) {
            case 'played': {
                const card = cardEls(root, 'hand', event.card.id)
                if (card) out.push({ kind: 'flash', el: card })
                out.push(...gainFlights(root, card, event.gains))
                break
            }
            case 'defeated': {
                const card = cardEls(root, 'row', event.card.id)
                if (card?.parentElement) out.push({ kind: 'inflate', el: card.parentElement })
                out.push(...gainFlights(root, card, event.gains))
                if (event.paid > 0) out.push(...pulseOf(root, 'power'))
                break
            }
            case 'recruited': {
                const slot = cardEls(root, 'row', event.card.id)?.parentElement
                const to = statEl(root, 'piles')
                if (slot && to) out.push({ kind: 'flyCard', el: slot, to })
                // Spending shows at once, on the click.
                if (event.paid > 0) out.push(...pulseOf(root, 'gold'))
                break
            }
            case 'exiled':
                if (frame.move.type === 'exile' && 'rowIndex' in frame.move) {
                    const slot = cardEls(root, 'row', event.card.id)?.parentElement
                    const to = statEl(root, 'piles')
                    if (slot && to) out.push({ kind: 'flyCard', el: slot, to })
                }
                break
            case 'rowFlushed':
                // The four replaced cards shrink away one after another.
                // The rightmost goes first, like the row moving to the right.
                frame.before.state.row.slice(0, event.cards.length).forEach((c, i, all) => {
                    const slot = cardEls(root, 'row', c.id)?.parentElement
                    if (slot) out.push({ kind: 'shrink', el: slot, order: all.length - 1 - i })
                })
                out.push(...pulseOf(root, 'flushes'))
                break
            default:
                break
        }
    }
    if (frame.rejected) return out
    const { type } = frame.move
    // Whatever left the hand (exiled, cycled away, discarded at the end of the turn) flies to the piles, one card after another.
    if (type === 'play' || type === 'exile' || type === 'endTurn') out.push(...planDeparting(frame, root))
    if (type === 'endTurn' || type === 'play') {
        // River cards that are gone after the move fell off the right edge (the end of the turn, or a Shift card).
        const remaining = new Set(frame.after.state.row.map((c) => c.id))
        for (const card of frame.before.state.row) {
            const leaving = remaining.has(card.id) ? null : cardEls(root, 'row', card.id)?.parentElement
            if (leaving) out.push({ kind: 'leave', el: leaving })
        }
    }
    return out
}

/**
 * Ids of the hand cards that leave the hand in this frame. Found by comparing the two states, so every effect that moves cards is covered.
 * A card that is in the new hand again only counts as kept if it was not drawn in this frame: with a small deck, a card that is discarded
 * at the end of the turn can be reshuffled and drawn straight back. It still went to the discard pile, so it still flies there.
 */
export function departingIds(frame: Frame): number[] {
    const drawn = new Set<number>()
    for (const event of frame.events) if (event.type === 'drew') for (const id of event.cardIds) drawn.add(id)
    const kept = new Set(frame.after.state.hand.map((c) => c.id).filter((id) => !drawn.has(id)))
    return frame.before.state.hand.map((c) => c.id).filter((id) => !kept.has(id))
}

function planDeparting(frame: Frame, root: ParentNode): Effect[] {
    const out: Effect[] = []
    const to = statEl(root, 'piles')
    let order = 0
    for (const id of departingIds(frame)) {
        const slot = cardEls(root, 'hand', id)?.parentElement
        if (slot && to) out.push({ kind: 'flyCard', el: slot, to, order: order++ })
    }
    return out
}

const cardIdOfMove = (frame: Frame): { zone: 'row' | 'hand'; card: Card | undefined } | null => {
    const { move } = frame
    const state = frame.before.state
    if (move.type === 'play') return { zone: 'hand', card: state.hand[move.handIndex] }
    if (move.type === 'take') return { zone: 'row', card: state.row[move.rowIndex] }
    if (move.type === 'exile') {
        return 'handIndex' in move ? { zone: 'hand', card: state.hand[move.handIndex] } : { zone: 'row', card: state.row[move.rowIndex] }
    }
    return null
}

/**
 * Effects that play once the frame's new state is drawn. Every stat box that changed pulses once. A box that receives a resource flight
 * waits for it to arrive, and a box that only lost something (spent gold, a lost heart, a swap) pulses at once.
 */
export function planAfter(frame: Frame, root: ParentNode): Effect[] {
    const out: Effect[] = []
    const changed = new Set<string>()
    // Gains pulse when their flight arrives (the presenter does that). Only losses pulse here.
    const lost = (gains: Gains): void => {
        for (const [currency] of GAIN_STATS) if (gains[currency] < 0) changed.add(currency)
    }
    for (const event of frame.events) {
        switch (event.type) {
            case 'rejected': {
                const target = cardIdOfMove(frame)
                const el = target?.card ? cardEls(root, target.zone, target.card.id) : null
                if (el) out.push({ kind: 'shake', el })
                break
            }
            case 'played':
            case 'defeated':
                lost(event.gains)
                break
            case 'recruited':
            case 'exiled':
            case 'reshuffled':
                changed.add('piles')
                break
            case 'cycled':
                if (event.count > 0) changed.add('piles')
                break
            case 'swapped':
                changed.add('gold')
                changed.add('power')
                break
            case 'escaped':
            case 'reaped':
                changed.add('hearts')
                break
            case 'turnStarted':
                changed.add('turn')
                if (event.flushGained) changed.add('flushes')
                break
            case 'rowFlushed':
                event.cards.forEach((c, i, all) => {
                    const slot = cardEls(root, 'row', c.id)?.parentElement
                    if (slot) out.push({ kind: 'enter', el: slot, order: all.length - 1 - i })
                })
                break
            case 'drew':
                if (event.cardIds.length > 0) changed.add('piles')
                event.cardIds.forEach((id, order) => {
                    const slot = cardEls(root, 'hand', id)?.parentElement
                    if (slot) out.push({ kind: 'deal', el: slot, order })
                })
                break
            case 'rowRefilled': {
                const slot = cardEls(root, 'row', event.card.id)?.parentElement
                if (slot) out.push({ kind: 'enter', el: slot })
                break
            }
            default:
                break
        }
    }
    const b = frame.before.state
    const a = frame.after.state
    if (a.recruitDiscount !== b.recruitDiscount || a.enemyDiscount !== b.enemyDiscount) changed.add('discount')
    for (const name of changed) out.push(...pulseOf(root, name))
    return out
}

const KEYFRAMES: Record<'flash' | 'inflate' | 'leave' | 'shrink' | 'enter' | 'deal' | 'shake' | 'pulse', Keyframe[]> = {
    shrink: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.7)' },
    ],
    // Drawn cards come in from the right, river cards from the left.
    deal: [
        { opacity: 0, transform: 'translateX(40%) scale(0.9)' },
        { opacity: 1, transform: 'none' },
    ],
    leave: [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateX(40%)' },
    ],
    shake: [{ translate: '0 0' }, { translate: '-5px 0', offset: 0.25 }, { translate: '5px 0', offset: 0.75 }, { translate: '0 0' }],
    // Only the start is given (offset 0): the animation ends at the element's resting style, so there is one easing curve.
    // A lone keyframe without an offset would be the end keyframe, which plays the wrong way round.
    flash: [{ offset: 0, boxShadow: '0 0 10px 2px color-mix(in srgb, var(--gold) 55%, transparent)', filter: 'brightness(1.35)' }],
    pulse: [{ offset: 0, transform: 'scale(1.15)', filter: 'brightness(1.4)' }],
    inflate: [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.25)', opacity: 0 },
    ],
    enter: [
        { opacity: 0, transform: 'translateX(-35%)' },
        { opacity: 1, transform: 'none' },
    ],
}

const supported = (el: HTMLElement): boolean => typeof el.animate === 'function'

/**
 * Runs one effect. `wait` holds the animations the view has to wait for before it moves on (flash, card flights, leaving and shrinking cards).
 * Resource flights come back as `visual`, and the other effects are purely visual and come back as nothing.
 */
export function runEffect(effect: Effect, speed: AnimSpeed, rush: boolean): Running {
    const none: Running = { wait: [], visual: [] }
    if (speed === 'off') {
        if (effect.kind === 'shake') {
            effect.el.setAttribute('data-rejected', '')
            setTimeout(() => effect.el.removeAttribute('data-rejected'), 400)
        }
        return none
    }
    if (!supported(effect.el)) return none
    // Resource flights ignore the rush. The first move of a quick sequence is planned before the others are queued, so it would get the
    // full length and the later ones half, and a later flight could overtake an earlier one.
    const unit = DURATION_MS[speed] * (rush && effect.kind !== 'fly' ? RUSH_FACTOR : 1)
    const duration = unit * DURATION_FACTOR[effect.kind]
    const delay = staggerDelay(effect.order, duration)
    switch (effect.kind) {
        case 'fly':
            return effect.to ? { wait: [], visual: [fly(effect, effect.to, duration, false)] } : none
        case 'flyCard':
            return effect.to
                ? {
                      wait: [
                          fly(effect, effect.to, duration, true),
                          effect.el.animate([{ opacity: 0 }, { opacity: 0 }], { duration, delay, fill: 'forwards' }),
                      ],
                      visual: [],
                  }
                : none
        case 'inflate':
            return { wait: [effect.el.animate(KEYFRAMES.inflate, { duration, easing: 'ease-out', fill: 'forwards' })], visual: [] }
        case 'leave':
        case 'shrink':
            return {
                wait: [effect.el.animate(KEYFRAMES[effect.kind], { duration, delay, easing: 'ease-in', fill: 'forwards' })],
                visual: [],
            }
        default: {
            const animation = effect.el.animate(KEYFRAMES[effect.kind], {
                duration,
                delay,
                fill: 'backwards',
                easing: 'ease-out',
                // The shake adds to the resting translate, so a hovered (lifted) card does not drop while it shakes.
                composite: effect.kind === 'shake' ? 'add' : 'replace',
            })
            // Only the flash holds the view back; the rest are purely visual.
            return { wait: effect.kind === 'flash' ? [animation] : [], visual: [] }
        }
    }
}

/** Where every card slot is on the page, by card id. Take it before a frame is committed and give it to `flip` after the view has drawn. */
export function snapshotSlots(root: ParentNode): Map<number, DOMRect> {
    const out = new Map<number, DOMRect>()
    for (const slot of Array.from(root.querySelectorAll<HTMLElement>('[data-zone] .slot'))) {
        const id = slot.querySelector<HTMLElement>('[data-card-id]')?.dataset.cardId
        if (id !== undefined) out.set(Number(id), slot.getBoundingClientRect())
    }
    return out
}

/** Slides the cards that moved (a hand that made room, a row that shifted) from where they were to where they are, instead of jumping. */
export function flip(root: ParentNode, before: Map<number, DOMRect>, speed: AnimSpeed, rush: boolean): void {
    if (speed === 'off') return
    const duration = DURATION_MS[speed] * (rush ? RUSH_FACTOR : 1) * 1.5
    for (const slot of Array.from(root.querySelectorAll<HTMLElement>('[data-zone] .slot'))) {
        if (!supported(slot)) return
        const id = slot.querySelector<HTMLElement>('[data-card-id]')?.dataset.cardId
        const old = id === undefined ? undefined : before.get(Number(id))
        if (!old) continue
        const now = slot.getBoundingClientRect()
        const dx = old.left - now.left
        const dy = old.top - now.top
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
        slot.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing: 'ease-out' })
    }
}

/** Fills a resource copy with its own total, e.g. "+3 ●". */
function setGain(clone: HTMLElement, gain: { amount: number; cls: GainClass }): void {
    const sym = GAIN_STATS.find(([, cls]) => cls === gain.cls)![2]
    const ico = clone.ownerDocument.createElement('span')
    ico.className = `ico ${gain.cls}`
    ico.textContent = sym
    clone.className = gain.cls
    clone.style.fontStyle = 'normal'
    clone.style.fontWeight = '700'
    clone.replaceChildren(`+${gain.amount} `, ico)
}

/**
 * Flies a copy of the effect's element over to `to` and removes the copy afterwards. The original stays where it is.
 * A resource flight (`wholeSlot` false) first lifts away from the card and grows so it can be read, drifts slowly, then speeds to the stat box.
 * A card flight copies the whole slot.
 */
function fly(effect: Effect, to: HTMLElement, duration: number, wholeSlot: boolean): Animation {
    const from = effect.el
    const a = from.getBoundingClientRect()
    const b = to.getBoundingClientRect()
    const clone = from.cloneNode(true) as HTMLElement
    const scale = from.offsetHeight > 0 ? a.height / from.offsetHeight : 1
    Object.assign(clone.style, {
        position: 'fixed',
        left: `${a.left}px`,
        top: `${a.top}px`,
        width: `${a.width}px`,
        margin: '0',
        zIndex: '50',
        pointerEvents: 'none',
    })
    if (wholeSlot) {
        // The slot takes its width from --cw, and a card scales itself from it.
        clone.style.setProperty('--cw', `${a.width}px`)
        clone.style.height = `${a.height}px`
    } else {
        if (effect.gain) setGain(clone, effect.gain)
        clone.style.width = 'auto'
        clone.style.height = `${a.height}px`
        const sourceSize = parseFloat(getComputedStyle(from).fontSize)
        const gainSize = from.tagName === 'I' ? sourceSize * 1.25 : sourceSize
        clone.style.fontSize = `${gainSize * scale}px`
        clone.style.whiteSpace = 'nowrap'
    }
    from.ownerDocument.body.append(clone)
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    const end = wholeSlot ? 0.2 : 0.55
    const at = (x: number, y: number, s: number): string => `translate(${x}px, ${y}px) scale(${s})`
    let keyframes: Keyframe[]
    if (wholeSlot) {
        keyframes = [
            { transform: at(0, 0, 1), opacity: 1 },
            { transform: at(dx, dy, end), opacity: 0.3 },
        ]
    } else {
        // Lift clear of the card, drift slowly (the reading time), then speed up to the stat box.
        const lift = -Math.min(Math.max(40, a.height * 3), Math.max(a.top - 4, 0))
        const drift = 0.12
        const sx = (effect.spread ?? 0) * (a.width * 1.4 + 12)
        keyframes = [
            { transform: at(0, 0, 1), opacity: 1, easing: 'ease-out' },
            { transform: at(sx, lift, 1.7), opacity: 1, offset: 0.22, easing: 'linear' },
            { transform: at(sx + (dx - sx) * drift, lift + (dy - lift) * drift, 1.7), opacity: 1, offset: 0.7, easing: 'ease-in' },
            { transform: at(dx, dy, end), opacity: 0.4 },
        ]
    }
    const delay = staggerDelay(effect.order, duration)
    const animation = clone.animate(keyframes, { duration, delay, easing: wholeSlot ? 'ease-in' : 'linear', fill: 'forwards' })
    const remove = (): void => clone.remove()
    animation.addEventListener('finish', remove)
    animation.addEventListener('cancel', remove)
    return animation
}

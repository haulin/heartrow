import type { GameEvent, Move } from '../../../core'
import type { AnimSpeed } from '../settings'

/**
 * Animation seam. The app hands every dispatched move's events to `play`. Richer animations later only need new cases in `planEffects` and `KEYFRAMES`.
 * Animations never block input: they run on the Web Animations API, and a backlog is fast-forwarded.
 */
export interface AnimContext {
    root: ParentNode
    move: Move
    speed: AnimSpeed
}

export type EffectKind = 'shake' | 'highlight' | 'enter'

export interface Effect {
    kind: EffectKind
    el: HTMLElement
}

export interface Animator {
    play(events: readonly GameEvent[], ctx: AnimContext): Promise<void>
    cancel(): void
}

export const DURATION_MS: Record<AnimSpeed, number> = { off: 0, fast: 90, normal: 200 }

const KEYFRAMES: Record<EffectKind, Keyframe[]> = {
    shake: [{ translate: '0 0' }, { translate: '-5px 0', offset: 0.25 }, { translate: '5px 0', offset: 0.75 }, { translate: '0 0' }],
    highlight: [
        { boxShadow: '0 0 0 3px var(--gold)', filter: 'brightness(1.35)' },
        { boxShadow: '0 0 0 0 transparent', filter: 'brightness(1)' },
    ],
    enter: [
        { opacity: 0, transform: 'translateX(-35%)' },
        { opacity: 1, transform: 'none' },
    ],
}

const DURATION_FACTOR: Record<EffectKind, number> = { shake: 1, highlight: 2, enter: 1.5 }

export function resolveSpeed(setting: AnimSpeed, reducedMotion: boolean): AnimSpeed {
    return reducedMotion ? 'off' : setting
}

const cards = (root: ParentNode, zone: 'row' | 'hand'): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(`[data-zone="${zone}"] [data-card-id]`))

const byId = (root: ParentNode, zone: 'row' | 'hand', id: number): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-zone="${zone}"] [data-card-id="${id}"]`)

export function planEffects(events: readonly GameEvent[], ctx: Pick<AnimContext, 'root' | 'move'>): Effect[] {
    const out: Effect[] = []
    const add = (kind: EffectKind, el: HTMLElement | null | undefined, target: HTMLElement | null | undefined = el): void => {
        if (el && target) out.push({ kind, el: target })
    }
    for (const event of events) {
        switch (event.type) {
            case 'rejected':
                if (ctx.move.type === 'play') add('shake', cards(ctx.root, 'hand')[ctx.move.handIndex])
                else if (ctx.move.type === 'take') add('shake', cards(ctx.root, 'row')[ctx.move.rowIndex])
                break
            case 'played':
                add('highlight', byId(ctx.root, 'hand', event.card.id))
                break
            case 'rowRefilled': {
                const card = byId(ctx.root, 'row', event.card.id)
                add('enter', card, card?.parentElement)
                break
            }
            case 'rowRedrawn':
                for (const c of event.cards) {
                    const card = byId(ctx.root, 'row', c.id)
                    add('enter', card, card?.parentElement)
                }
                break
            default:
                break
        }
    }
    return out
}

function run(effect: Effect, speed: AnimSpeed): Animation | null {
    if (speed === 'off') {
        if (effect.kind === 'shake') {
            effect.el.setAttribute('data-rejected', '')
            setTimeout(() => effect.el.removeAttribute('data-rejected'), 400)
        }
        return null
    }
    if (typeof effect.el.animate !== 'function') return null
    return effect.el.animate(KEYFRAMES[effect.kind], { duration: DURATION_MS[speed] * DURATION_FACTOR[effect.kind], easing: 'ease-out' })
}

const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function createAnimator(reducedMotion: () => boolean = prefersReducedMotion): Animator {
    let running: Animation[] = []
    let queue: Promise<void> = Promise.resolve()
    let pending = 0

    const finishRunning = (): void => {
        for (const a of running) {
            try {
                a.finish()
            } catch {
                a.cancel()
            }
        }
        running = []
    }

    return {
        play(events, ctx) {
            const speed = resolveSpeed(ctx.speed, reducedMotion())
            if (pending > 0) finishRunning()
            pending++
            const step = queue.then(async () => {
                const anims = planEffects(events, ctx)
                    .map((e) => run(e, speed))
                    .filter((a): a is Animation => a !== null)
                running = anims
                await Promise.all(anims.map((a) => a.finished.catch(() => undefined)))
            })
            queue = step
                .catch(() => undefined)
                .then(() => {
                    pending--
                })
            return queue
        },
        cancel() {
            for (const a of running) a.cancel()
            running = []
        },
    }
}

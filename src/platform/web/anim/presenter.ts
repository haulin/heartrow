import type { AnimSpeed } from '../settings'
import type { Session } from '../session'
import type { Frame } from '../store'
import { departingIds, flip, planAfter, planBefore, resolveSpeed, runEffect, snapshotSlots } from '.'
import type { Effect, GainStat } from '.'

/** What the presenter needs from the store. */
export interface FrameSource {
    peekFrame(): Frame | undefined
    pendingFrames(): number
    commit(): void
    getEpoch(): number
    getShown(): Session
    /** Keeps the shown number of a resource while a flight carries it to its stat box. */
    hold(stat: GainStat, value: number): void
    bump(stat: GainStat, delta: number): void
    release(stat: GainStat): void
    subscribe(listener: () => void): () => void
}

export interface PresenterEnv {
    root(): ParentNode | null
    speed(): AnimSpeed
    reducedMotion(): boolean
}

export interface Presenter {
    /** Call after every render of the view. Plays the effects that belong to frames the view has just drawn, and lets held animations go. */
    rendered(): void
    dispose(): void
}

const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const browserReducedMotion = prefersReducedMotion

/**
 * Diagnostic for a bug that was seen once: after an end turn some hand cards got no flight and vanished at once.
 * When the cards that leave the hand (by state) differ from the cards that fly (by page), or the page's hand differs from the state's hand,
 * this writes the details to the console, so a playtester can copy them.
 */
function warnIfHandOutOfStep(frame: Frame, root: ParentNode, effects: Effect[]): void {
    const { type } = frame.move
    if (frame.rejected || (type !== 'play' && type !== 'exile' && type !== 'endTurn')) return
    const idOf = (el: Element): number => Number(el.querySelector('[data-card-id]')?.getAttribute('data-card-id'))
    const page = Array.from(root.querySelectorAll('[data-zone="hand"] .slot')).map(idOf)
    const before = frame.before.state.hand.map((c) => c.id)
    const leaving = departingIds(frame)
    const flying = effects.filter((e) => e.kind === 'flyCard' && e.el.closest('[data-zone="hand"]')).map((e) => idOf(e.el))
    const sameHand = page.join() === before.join()
    const byId = (a: number, b: number): number => a - b
    const sameFlight = [...leaving].sort(byId).join() === [...flying].sort(byId).join()
    if (sameHand && sameFlight) return
    console.warn('heartrow animation: hand out of step', { move: frame.move.type, page, state: before, leaving, flying })
}

interface Committed {
    frame: Frame
    /** Card positions just before the frame was committed, for sliding the cards that moved. */
    slots: Map<number, DOMRect> | null
}

/**
 * Presents the store's frames one at a time. For each frame it plays the "before" effects on the page as it is, waits for the blocking ones,
 * then commits the frame so the view draws the new state, and plays the "after" effects once that render is done.
 * Resource flights never block. Instead the stat box keeps its old number (a hold in the store) until the flight arrives, then pulses.
 * A frame with nothing to wait for (animations off, no Web Animations API, a move without a visible effect) is committed at once, in the same call.
 * Undo and a new game change the store's epoch: pending work is dropped and the view jumps straight to the latest state.
 */
export function createPresenter(source: FrameSource, env: PresenterEnv): Presenter {
    let busy = false
    let epoch = source.getEpoch()
    /** Animations of the frame being presented. */
    let running: Animation[] = []
    /** Animations of committed frames that keep their last look (a card stays inflated) until the view has drawn the new state. */
    let held: Animation[] = []
    let afterQueue: Committed[] = []
    /** Resource flights on their way, per stat box. */
    let flying: Partial<Record<GainStat, number>> = {}

    const cancelAll = (list: Animation[]): void => {
        for (const a of list) a.cancel()
    }
    const releaseAll = (): void => {
        cancelAll(running)
        cancelAll(held)
        running = []
        held = []
        flying = {}
    }

    /** Holds the stat box's number until the flight lands, then shows the new number and pulses the box. */
    const track = (effect: Effect, flight: Animation, speed: AnimSpeed): void => {
        const stat = effect.gain?.stat
        if (!stat) return
        const started = epoch
        source.hold(stat, source.getShown().state[stat])
        flying[stat] = (flying[stat] ?? 0) + 1
        const done = (arrived: boolean): void => {
            if (epoch !== started) return
            flying[stat] = (flying[stat] ?? 1) - 1
            if (arrived && effect.gain) source.bump(stat, effect.gain.amount)
            if (flying[stat] === 0) source.release(stat)
            if (arrived && effect.to) runEffect({ kind: 'pulse', el: effect.to }, speed, false)
        }
        flight.finished.then(
            () => done(true),
            () => done(false),
        )
    }

    /**
     * Effects read positions and card elements from the page, so the next frame may only be planned once the view has drawn this one.
     * (Planning against a page that is a frame behind misses cards that were just drawn, which then vanish without a flight.)
     */
    let drawing = false

    const commitNow = (frame: Frame, root: ParentNode | null): void => {
        const animated = root !== null && resolveSpeed(env.speed(), env.reducedMotion()) !== 'off'
        afterQueue.push({ frame, slots: root ? snapshotSlots(root) : null })
        drawing = animated
        source.commit()
    }

    const pump = (): void => {
        if (source.getEpoch() !== epoch) {
            epoch = source.getEpoch()
            releaseAll()
            afterQueue = []
            busy = false
            drawing = false
        }
        while (!busy && !drawing) {
            const frame = source.peekFrame()
            if (!frame) return
            const speed = resolveSpeed(env.speed(), env.reducedMotion())
            const root = env.root()
            const rush = source.pendingFrames() > 1
            const wait: Animation[] = []
            if (root && speed !== 'off') {
                const effects = planBefore(frame, root)
                warnIfHandOutOfStep(frame, root, effects)
                for (const effect of effects) {
                    const run = runEffect(effect, speed, rush)
                    wait.push(...run.wait)
                    run.visual.forEach((flight) => track(effect, flight, speed))
                }
            }
            if (wait.length === 0) {
                commitNow(frame, root)
                continue
            }
            busy = true
            running = wait
            const started = epoch
            void Promise.all(wait.map((a) => a.finished.catch(() => undefined))).then(() => {
                if (epoch !== started || source.getEpoch() !== started) return
                busy = false
                held.push(...running)
                running = []
                commitNow(frame, env.root())
                pump()
            })
        }
    }

    const unsubscribe = source.subscribe(pump)

    return {
        rendered() {
            // The view has drawn the committed frames: held animations (a card that stays inflated until it is replaced) can go.
            cancelAll(held)
            held = []
            const root = env.root()
            const frames = afterQueue
            afterQueue = []
            const wasDrawing = drawing
            drawing = false
            if (!root || frames.length === 0) {
                if (wasDrawing) pump()
                return
            }
            const speed = resolveSpeed(env.speed(), env.reducedMotion())
            const rush = source.pendingFrames() > 0
            // Cards that moved slide from where they were. All queued frames share the oldest positions.
            const slots = frames[0]!.slots
            if (slots) flip(root, slots, speed, rush)
            for (const { frame } of frames) {
                for (const effect of planAfter(frame, root)) runEffect(effect, speed, rush)
            }
            // The page is now up to date, so the next waiting frame can be planned.
            if (wasDrawing) pump()
        },
        dispose() {
            unsubscribe()
            releaseAll()
        },
    }
}

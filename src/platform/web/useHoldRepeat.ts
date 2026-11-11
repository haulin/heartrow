import { useEffect, useRef } from 'preact/hooks'

/** How long a press lasts before it turns into a repeat. */
export const HOLD_START_MS = 400

/** Delay before each repeat step, from slow to fast. Each delay is used for `STEPS_PER_DELAY` steps, and the last one until release. */
export const HOLD_DELAYS_MS: readonly number[] = [300, 200, 120, 70, 40]
const STEPS_PER_DELAY = 3

export const holdDelayMs = (step: number): number =>
    HOLD_DELAYS_MS[Math.min(Math.floor(step / STEPS_PER_DELAY), HOLD_DELAYS_MS.length - 1)]!

/**
 * Makes a button repeat while it is held, slowly at first and then faster. A short press stays a normal click.
 * `step` does one repeat and returns false when there is nothing left to do, which ends the repeat.
 */
export function useHoldRepeat(step: () => boolean) {
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const repeated = useRef(false)
    const stepRef = useRef(step)
    stepRef.current = step

    const stop = (): void => {
        clearTimeout(timer.current)
        timer.current = undefined
    }

    const run = (index: number): void => {
        if (!stepRef.current()) return stop()
        repeated.current = true
        timer.current = setTimeout(() => run(index + 1), holdDelayMs(index))
    }

    const start = (event: PointerEvent): void => {
        // The buttons can move while the hold runs (the status line changes length), so the press stays with this button until release.
        ;(event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId)
        stop()
        repeated.current = false
        timer.current = setTimeout(() => run(0), HOLD_START_MS)
    }

    useEffect(() => stop, [])

    return {
        /** Spread on the button. The click of a press that already repeated is dropped, so the release does not add a step. */
        pointerProps: {
            onPointerDown: start,
            onPointerUp: stop,
            onPointerCancel: stop,
            onContextMenu: (event: Event): void => event.preventDefault(),
        },
        onClickOnce: (click: () => void) => (): void => {
            if (repeated.current) {
                repeated.current = false
                return
            }
            click()
        },
    }
}

// @vitest-environment happy-dom
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { HOLD_DELAYS_MS, HOLD_START_MS, holdDelayMs, useHoldRepeat } from '../../src/platform/web/useHoldRepeat'

const host = document.createElement('div')
document.body.append(host)

afterEach(() => {
    render(null, host)
    vi.useRealTimers()
})

function mountButton(step: () => boolean, onClick: () => void): HTMLButtonElement {
    const Button = () => {
        const hold = useHoldRepeat(step)
        return h('button', { ...hold.pointerProps, onClick: hold.onClickOnce(onClick) }, 'go')
    }
    render(h(Button, null), host)
    return host.querySelector('button')!
}

const press = (button: HTMLElement): void =>
    void act(() => {
        button.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
const release = (button: HTMLElement): void => {
    void act(() => {
        button.dispatchEvent(new Event('pointerup', { bubbles: true }))
    })
    void act(() => button.click())
}

describe('hold repeat', () => {
    it('speeds up from the first delay to the last and stays there', () => {
        expect(holdDelayMs(0)).toBe(HOLD_DELAYS_MS[0])
        expect(holdDelayMs(1000)).toBe(HOLD_DELAYS_MS[HOLD_DELAYS_MS.length - 1])
        expect(holdDelayMs(3)).toBeLessThan(holdDelayMs(0))
    })

    it('keeps a short press as one click', () => {
        vi.useFakeTimers()
        const step = vi.fn(() => true)
        const click = vi.fn()
        const button = mountButton(step, click)
        press(button)
        vi.advanceTimersByTime(HOLD_START_MS - 1)
        release(button)
        vi.advanceTimersByTime(5000)
        expect(step).not.toHaveBeenCalled()
        expect(click).toHaveBeenCalledTimes(1)
    })

    it('repeats while held, drops the click on release, and stops when the step says so', () => {
        vi.useFakeTimers()
        let left = 4
        const click = vi.fn()
        const button = mountButton(() => left-- > 0, click)
        press(button)
        vi.advanceTimersByTime(HOLD_START_MS)
        expect(left).toBe(3)
        vi.advanceTimersByTime(10_000)
        expect(left).toBe(-1)
        release(button)
        expect(click).not.toHaveBeenCalled()
    })

    it('stops repeating on release', () => {
        vi.useFakeTimers()
        const step = vi.fn(() => true)
        const button = mountButton(step, () => {})
        press(button)
        vi.advanceTimersByTime(HOLD_START_MS + 1)
        release(button)
        const calls = step.mock.calls.length
        vi.advanceTimersByTime(5000)
        expect(step.mock.calls.length).toBe(calls)
    })
})

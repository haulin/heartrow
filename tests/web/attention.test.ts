// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { watchAttention } from '../../src/platform/web/attention'

describe('watchAttention', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        document.documentElement.removeAttribute('data-away')
    })

    it('marks the page while the window has no focus or the tab is hidden, and clears the mark when it comes back', () => {
        const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
        const stop = watchAttention(document, window)
        const away = () => document.documentElement.hasAttribute('data-away')
        expect(away()).toBe(false)

        focus.mockReturnValue(false)
        window.dispatchEvent(new Event('blur'))
        expect(away()).toBe(true)

        focus.mockReturnValue(true)
        window.dispatchEvent(new Event('focus'))
        expect(away()).toBe(false)

        hidden.mockReturnValue(true)
        document.dispatchEvent(new Event('visibilitychange'))
        expect(away()).toBe(true)

        stop()
        hidden.mockReturnValue(false)
        document.dispatchEvent(new Event('visibilitychange'))
        expect(away()).toBe(true)
    })
})

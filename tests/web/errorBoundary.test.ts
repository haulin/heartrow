// @vitest-environment happy-dom
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { ErrorBoundary } from '../../src/platform/web/ErrorBoundary'

let host: HTMLElement | null = null

afterEach(() => {
    if (host) render(null, host)
    host?.remove()
    host = null
    vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
    it('shows the message in a dialog when drawing throws', () => {
        host = document.createElement('div')
        document.body.append(host)
        const Broken = () => {
            throw new Error('Glyph is not defined')
        }
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        void act(() => render(h(ErrorBoundary, null, h(Broken, null)), host!))
        expect(host.querySelector('dialog')?.textContent).toContain('Something went wrong')
        expect(host.querySelector('dialog')?.textContent).toContain('Glyph is not defined')
    })

    it('draws its children when nothing throws', () => {
        host = document.createElement('div')
        document.body.append(host)
        void act(() => render(h(ErrorBoundary, null, h('p', null, 'fine')), host!))
        expect(host.textContent).toBe('fine')
        expect(host.querySelector('dialog')).toBeNull()
    })
})

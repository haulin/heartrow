// @vitest-environment happy-dom
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { standardMode } from '../../src/core'
import type { GameEvent } from '../../src/core'
import { App } from '../../src/platform/web/App'
import { createAnimator, planEffects, resolveSpeed } from '../../src/platform/web/anim'
import { GameStore } from '../../src/platform/web/store'
import { createMemoryStorage } from '../../src/platform/web/storage'

let host: HTMLElement | null = null

function mount(seed = 4) {
    host = document.createElement('div')
    document.body.append(host)
    const store = new GameStore(standardMode(0), seed)
    const storage = createMemoryStorage()
    void act(() => render(h(App, { store, storage }), host!))
    return { store, storage, host }
}

afterEach(() => {
    if (host) render(null, host)
    host?.remove()
    host = null
    document.documentElement.removeAttribute('data-theme')
})

describe('App', () => {
    it('renders 5 row cards and 5 hand cards', () => {
        const { host } = mount()
        expect(host.querySelectorAll('[data-zone="row"] [data-card-id]')).toHaveLength(5)
        expect(host.querySelectorAll('[data-zone="hand"] [data-card-id]')).toHaveLength(5)
        expect(host.querySelector('#msg')?.textContent).toContain('Click hand cards')
    })

    it('plays a hand card on click and enables undo', () => {
        const { host, store } = mount()
        const before = store.getState().hand.map((c) => c.played)
        expect(before.every((p) => !p)).toBe(true)
        const buttons = host.querySelectorAll<HTMLButtonElement>('[data-zone="hand"] button.card')
        void act(() => buttons[0]!.click())
        expect(store.getState().hand[0]!.played).toBe(true)
        expect(host.querySelector('[data-zone="hand"] button.card')?.getAttribute('aria-disabled')).toBe('true')
        expect(store.getSession().history[0]).toMatch(/^T1 · Played/)
    })

    it('shows a rejection message when a recruit is unaffordable and cycles the theme', () => {
        const { host, storage } = mount()
        void act(() => host.querySelector<HTMLButtonElement>('[data-zone="row"] button.card')!.click())
        expect(host.querySelector('#msg')?.textContent).toMatch(/Need \d+ more/)
        expect(host.querySelector('[role="status"]')?.textContent).toMatch(/Need \d+ more/)
        const theme = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Theme'))!
        void act(() => theme.click())
        expect(document.documentElement.dataset.theme).toBe('light')
        expect(storage.get<{ theme: string }>('settings', { theme: '' }).theme).toBe('light')
    })
})

describe('animation module', () => {
    it('forces off under reduced motion', () => {
        expect(resolveSpeed('normal', true)).toBe('off')
        expect(resolveSpeed('fast', false)).toBe('fast')
    })

    it('plans effects from events and tolerates a DOM without the Web Animations API', async () => {
        const { host, store } = mount()
        const first = store.getState().hand[0]!
        const row0 = store.getState().row[0]!
        const events: GameEvent[] = [
            { type: 'played', card: first, gains: { gold: 0, power: 0, hearts: 0 } },
            { type: 'rowRefilled', card: row0 },
            { type: 'rejected', reason: 'cannotAfford' },
        ]
        const plan = planEffects(events, { root: host, move: { type: 'take', rowIndex: 0 } })
        expect(plan.map((e) => e.kind)).toEqual(['highlight', 'enter', 'shake'])
        await createAnimator(() => false).play(events, { root: host, move: { type: 'take', rowIndex: 0 }, speed: 'normal' })
        await createAnimator(() => true).play(events, { root: host, move: { type: 'take', rowIndex: 0 }, speed: 'normal' })
    })
})

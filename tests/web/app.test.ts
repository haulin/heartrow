// @vitest-environment happy-dom
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { standardMode } from '../../src/core'
import { App } from '../../src/platform/web/App'
import { planAfter, planBefore, resolveSpeed } from '../../src/platform/web/anim'
import { createPresenter } from '../../src/platform/web/anim/presenter'
import { copy } from '../../src/platform/web/Dialogs'
import { DEFAULT_SETTINGS, saveSettings } from '../../src/platform/web/settings'
import type { AnimSpeed } from '../../src/platform/web/settings'
import { GameStore } from '../../src/platform/web/store'
import { createMemoryStorage } from '../../src/platform/web/storage'

let host: HTMLElement | null = null

/** Tests run with animations off by default, so frames commit at once. */
function mount(seed = 4, anim: AnimSpeed = 'off', initial: 'home' | 'game' = 'game') {
    host = document.createElement('div')
    document.body.append(host)
    const store = new GameStore(standardMode(0), seed)
    const storage = createMemoryStorage()
    saveSettings(storage, { ...DEFAULT_SETTINGS, anim })
    void act(() => render(h(App, { store, storage, initial }), host!))
    return { store, storage, host }
}

const press = (host: HTMLElement, label: string) =>
    void act(() =>
        Array.from(host.querySelectorAll('button'))
            .find((b) => b.textContent?.startsWith(label))!
            .click(),
    )

afterEach(() => {
    if (host) render(null, host)
    host?.remove()
    host = null
    document.documentElement.removeAttribute('data-theme')
})

describe('App home screen', () => {
    it('opens on the menu without a game, and offers no resume', () => {
        const { host } = mount(4, 'off', 'home')
        expect(host.querySelector('[data-zone="row"]')).toBeNull()
        const labels = Array.from(host.querySelectorAll('nav button')).map((b) => b.textContent)
        expect(labels).toEqual(['Standard', expect.stringMatching(/^Long Run/), 'Custom generator…', 'Settings', 'About'])
    })

    it('describes the game and draws resource icons in About', () => {
        const { host } = mount(4, 'off', 'home')
        press(host, 'About')
        const about = host.querySelector('dialog')!
        expect(about.textContent).toContain('roguelike deckbuilder')
        expect(about.textContent).toContain('11,872 distinct recruits')
        expect(about.textContent).toContain('561 distinct enemies')
        expect(about.textContent).not.toContain('100,000')
        expect(about.querySelectorAll('.ico')).toHaveLength(3)
        expect(about.querySelector('.ico.g')).not.toBeNull()
        expect(about.querySelector('.ico.p')).not.toBeNull()
        expect(about.querySelector('.ico.h')).not.toBeNull()
    })

    it('starts a Standard run from the menu, goes home, and resumes the same run', () => {
        const { host, store } = mount(4, 'off', 'home')
        press(host, 'Standard')
        press(host, 'Level 2')
        expect(host.querySelectorAll('[data-zone="row"] [data-card-id]')).toHaveLength(5)
        expect(store.getState().goal).toBe(64)
        const seed = store.getState().seed
        press(host, '← Home')
        expect(host.querySelector('[data-zone="row"]')).toBeNull()
        press(host, 'Resume game')
        expect(host.querySelector('[data-zone="row"]')).not.toBeNull()
        expect(store.getState().seed).toBe(seed)
    })
})

describe('App level picker screen', () => {
    it('is a screen with three level buttons, has its own address, and Back from a pasted address goes home', () => {
        const { host } = mount(4, 'off', 'home')
        press(host, 'Standard')
        expect(window.location.search).toBe('?screen=standard')
        expect(host.querySelectorAll('.levels button')).toHaveLength(4)
        expect(host.querySelector('.levels button:last-child')?.textContent).toContain('96')
        expect(host.querySelector('dialog')).toBeNull()
        window.history.replaceState(null, '', '/?screen=standard')
        press(host, '← Back')
        expect(host.querySelector('.levels')).toBeNull()
        expect(host.querySelector('nav')).not.toBeNull()
        expect(window.location.search).toBe('')
    })
})

describe('App warns before a start replaces the run in progress', () => {
    it('says so on the level picker only when a run exists', () => {
        const fresh = mount(4, 'off', 'home')
        press(fresh.host, 'Standard')
        expect(fresh.host.querySelector('.replaces')).toBeNull()

        const running = mount(4)
        press(running.host, '← Home')
        press(running.host, 'Standard')
        expect(running.host.querySelector('.replaces')?.textContent).toContain('replaces the one in progress')
    })
})

describe('App generator editor screen', () => {
    it('opens from the run dialog with the run settings, keeps them in the address, and starts a custom run', () => {
        const { host, store } = mount(4)
        press(host, 'Standard')
        press(host, 'Open in the generator editor')
        expect(host.querySelector('.gen')).not.toBeNull()
        expect(host.querySelector('[data-zone="row"]')).toBeNull()
        expect(window.location.search).toContain('screen=custom')
        expect(window.location.search).not.toContain('seed=')
        const goal = Array.from(host.querySelectorAll<HTMLSelectElement>('.gen select')).find((s) => s.textContent?.includes('Level 1'))!
        goal.value = '1'
        void act(() => {
            goal.dispatchEvent(new Event('change', { bubbles: true }))
        })
        expect(window.location.search).toContain('goal=2')
        press(host, 'Start')
        expect(store.getState().config.id).toBe('custom')
        expect(store.getState().goal).toBe(64)
        expect(host.querySelector('[data-zone="row"]')).not.toBeNull()
    })

    it('opens from the menu, and Back from a pasted editor address goes to the menu', () => {
        window.history.replaceState(null, '', '/?screen=custom')
        const { host } = mount(4, 'off', 'home')
        press(host, 'Custom generator')
        expect(host.querySelector('.gen')).not.toBeNull()
        window.history.replaceState(null, '', '/?screen=custom')
        press(host, '← Back')
        expect(host.querySelector('.gen')).toBeNull()
        expect(host.querySelector('nav')).not.toBeNull()
        expect(window.location.search).toBe('')
    })
})

describe('App', () => {
    it('names the mode in the header and shows the goal and seed in its dialog', () => {
        const { host } = mount(4)
        press(host, 'Standard')
        const dialog = host.querySelector('dialog')!
        expect(dialog.textContent).toContain('Level 1')
        expect(dialog.textContent).toContain('Goal: 48 ♥ in 24 turns')
        expect(dialog.textContent).toContain('seed 4')
    })

    it('renders 5 row cards and 5 hand cards', () => {
        const { host } = mount()
        expect(host.querySelectorAll('[data-zone="row"] [data-card-id]')).toHaveLength(5)
        expect(host.querySelectorAll('[data-zone="hand"] [data-card-id]')).toHaveLength(5)
        expect(host.querySelector('#msg')?.textContent).toContain('Click hand cards')
    })

    it('switches to the staggered hand layout at ten cards', () => {
        const { host, store } = mount()
        const state = store.getState()
        state.hand.push(
            ...Array.from({ length: 5 }, (_, i) => ({
                ...state.hand[i % state.hand.length]!,
                id: 10000 + i,
                fx: [...state.hand[i % state.hand.length]!.fx],
                played: false,
            })),
        )
        void act(() => {
            store.dispatch({ type: 'play', handIndex: 0 })
        })
        expect(host.querySelector('[data-zone="hand"]')?.classList).toContain('large')
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

    it('keeps Skip exile after Undo in the action bar', () => {
        const { host, store } = mount()
        store.getState().hand[0]!.fx = ['exile']
        void act(() => host.querySelector<HTMLButtonElement>('[data-zone="hand"] button.card')!.click())
        const labels = Array.from(host.querySelectorAll('.bar button')).map((button) => button.textContent)
        expect(labels.at(-1)).toBe('Skip exile')
        expect(labels.indexOf('Undo')).toBeLessThan(labels.indexOf('Skip exile'))
    })

    it('shakes a river card that cannot be exiled', () => {
        const { host, store } = mount()
        store.getState().hand[0]!.fx = ['exile']
        void act(() => host.querySelector<HTMLButtonElement>('[data-zone="hand"] button.card')!.click())
        const edge = host.querySelector<HTMLButtonElement>('[data-zone="row"] .slot:last-child button.card')!
        void act(() => edge.click())
        expect(store.getState().pendingExile).toBe(true)
        expect(store.getState().stats.exiled).toBe(0)
        expect(edge.getAttribute('data-rejected')).toBe('')
    })

    it('shows a rejection message when a recruit is unaffordable', () => {
        const { host } = mount()
        void act(() => host.querySelector<HTMLButtonElement>('[data-zone="row"] button.card')!.click())
        expect(host.querySelector('#msg')?.textContent).toMatch(/Need \d+ more/)
        expect(host.querySelector('[role="status"]')?.textContent).toMatch(/Need \d+ more/)
    })

    it('keeps menu items out of the game bar and changes the theme in the settings dialog on the home screen', () => {
        const { host, storage } = mount()
        const buttons = () => Array.from(host.querySelectorAll('button'))
        const labels = buttons().map((b) => b.textContent)
        for (const menu of ['Settings', 'About', 'New game']) expect(labels).not.toContain(menu)
        expect(labels).toContain('← Home')
        press(host, '← Home')
        press(host, 'Settings')
        const select = host.querySelector<HTMLSelectElement>('select')!
        select.value = 'light'
        void act(() => {
            select.dispatchEvent(new Event('change', { bubbles: true }))
        })
        expect(document.documentElement.dataset.theme).toBe('light')
        expect(storage.get<{ theme: string }>('settings', { theme: '' }).theme).toBe('light')
    })
})

describe('animation module', () => {
    it('forces off under reduced motion', () => {
        expect(resolveSpeed('normal', true)).toBe('off')
        expect(resolveSpeed('fast', false)).toBe('fast')
    })

    it('plans effects before and after a frame', () => {
        const { host, store } = mount()
        const play = store.dispatch({ type: 'play', handIndex: store.getState().hand.findIndex((c) => c.fx.length === 0) })
        expect(planBefore(play, host).map((e) => e.kind)).toEqual(expect.arrayContaining(['flash', 'fly']))
        // The gold or power box pulses when the flight arrives (the presenter does that), not after the commit.
        expect(planAfter(play, host).map((e) => e.kind)).not.toContain('pulse')
        const take = store.dispatch({ type: 'take', rowIndex: 0 })
        if (take.rejected) expect(planAfter(take, host).map((e) => e.kind)).toEqual(['shake'])
        else expect(planBefore(take, host).map((e) => e.kind)).toContain('flyCard')
    })

    it('flies hearts from a Vault-only card with no printed gain badge', () => {
        const { host, store } = mount()
        const card = store.getState().hand[0]!
        Object.assign(card, { gold: 0, power: 0, hearts: 0, fx: ['vault'], main: 'gold' })
        store.getState().exile.push(card, card, card)
        host.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)
            ?.querySelectorAll('.bd b')
            .forEach((badge) => badge.remove())
        const body = host.querySelector<HTMLElement>(`[data-card-id="${card.id}"] .bd`)!
        const effect = document.createElement('i')
        effect.textContent = 'Vault'
        body.append(effect)
        const play = store.dispatch({ type: 'play', handIndex: 0 })
        const flight = planBefore(play, host).find((effect) => effect.kind === 'fly' && effect.gain?.stat === 'hearts')
        expect(flight).toBeDefined()
        expect(flight?.gain?.amount).toBe(1)
        expect(flight?.el.tagName).toBe('I')
    })

    it('flies gains from a Basics-only card with no printed gain badge', () => {
        const { host, store } = mount()
        const card = store.getState().hand[0]!
        Object.assign(card, { gold: 0, power: 0, hearts: 0, fx: ['basics'], main: 'gold' })
        store.getState().exile = store.getState().deck.splice(0, 3)
        host.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)
            ?.querySelectorAll('.bd b')
            .forEach((badge) => badge.remove())
        const body = host.querySelector<HTMLElement>(`[data-card-id="${card.id}"] .bd`)!
        const effect = document.createElement('i')
        effect.textContent = 'Basics'
        body.append(effect)
        const play = store.dispatch({ type: 'play', handIndex: 0 })
        const flight = planBefore(play, host).find((effect) => effect.kind === 'fly' && effect.gain?.stat === 'gold')
        expect(flight).toBeDefined()
        expect(flight?.gain?.amount).toBe(1)
        expect(flight?.el.tagName).toBe('I')
    })

    it('pulses the piles for a Cycle only when it moves cards', () => {
        const pilesPulse = (extraCards: number): boolean => {
            const { host, store } = mount()
            const state = store.getState()
            Object.assign(state.hand[0]!, { gold: 0, power: 0, hearts: 0, fx: ['cycle'], retain: false })
            state.hand.splice(1 + extraCards)
            return planAfter(store.dispatch({ type: 'play', handIndex: 0 }), host).some((e) => e.kind === 'pulse')
        }
        expect(pilesPulse(0)).toBe(false)
        expect(pilesPulse(2)).toBe(true)
    })

    it('flies every card that leaves the hand to the piles when the turn ends', () => {
        const { host, store } = mount()
        const before = store.getState().hand
        const kept = before.filter((c) => c.retain).length
        const end = store.dispatch({ type: 'endTurn' })
        const kinds = planBefore(end, host).map((e) => e.kind)
        expect(kinds.filter((k) => k === 'flyCard')).toHaveLength(before.length - kept)
        expect(kinds).toContain('leave')
    })

    it('commits frames at once when nothing can animate, and resolves clicks by card id', () => {
        const { host, store } = mount()
        const buttons = host.querySelectorAll<HTMLButtonElement>('[data-zone="hand"] button.card')
        void act(() => buttons[0]!.click())
        expect(store.pendingFrames()).toBe(0)
        expect(store.getShown()).toBe(store.getSession())
        // Clicking the same card again is ignored once it is played.
        void act(() => buttons[0]!.click())
        expect(store.getSession().history).toHaveLength(1)
    })

    it('holds the shown state back while an animation plays, then commits', async () => {
        const proto = HTMLElement.prototype as unknown as { animate?: unknown }
        const saved = proto.animate
        proto.animate = () => ({ finished: Promise.resolve(), cancel() {}, addEventListener() {} })
        try {
            const { host, store } = mount(4, 'fast')
            const shown = store.getShown()
            void act(() => host.querySelector<HTMLButtonElement>('[data-zone="hand"] button.card')!.click())
            expect(store.getShown()).toBe(shown)
            expect(store.getState().hand[0]!.played).toBe(true)
            await act(() => new Promise((r) => setTimeout(r, 20)))
            expect(store.getShown()).toBe(store.getSession())
            expect(store.pendingFrames()).toBe(0)
        } finally {
            proto.animate = saved
        }
    })

    it('drops pending animations on undo', () => {
        const proto = HTMLElement.prototype as unknown as { animate?: unknown }
        const saved = proto.animate
        proto.animate = () => ({ finished: new Promise(() => {}), cancel() {}, addEventListener() {} })
        try {
            const { host, store } = mount(4, 'fast')
            void act(() => host.querySelector<HTMLButtonElement>('[data-zone="hand"] button.card')!.click())
            expect(store.pendingFrames()).toBe(1)
            const presenter = createPresenter(store, { root: () => host, speed: () => 'fast', reducedMotion: () => false })
            store.undo()
            expect(store.pendingFrames()).toBe(0)
            expect(store.getShown()).toBe(store.getSession())
            presenter.dispose()
        } finally {
            proto.animate = saved
        }
    })
})

describe('clipboard helper', () => {
    it('does not claim success for a legacy copy on an insecure page', async () => {
        const secure = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
        const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand')
        Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
        const execCommand = vi.fn().mockReturnValue(true)
        Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
        try {
            expect(await copy('run')).toBe(false)
            expect(execCommand).toHaveBeenCalledWith('copy')
        } finally {
            if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand)
            else delete (document as unknown as { execCommand?: unknown }).execCommand
            if (secure) Object.defineProperty(window, 'isSecureContext', secure)
            else delete (window as unknown as { isSecureContext?: boolean }).isSecureContext
        }
    })
})

// @vitest-environment happy-dom
import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { EFFECTS, standardMode } from '../../src/core'
import { App } from '../../src/platform/web/App'
import { effectName } from '../../src/platform/web/custom'
import {
    FRESH_COMPENDIUM,
    activeFilterCount,
    compendiumQuery,
    compendiumViewFromSearch,
    matchingEffects,
} from '../../src/platform/web/compendiumView'
import { DEFAULT_SETTINGS, saveSettings } from '../../src/platform/web/settings'
import { GameStore } from '../../src/platform/web/store'
import { createMemoryStorage } from '../../src/platform/web/storage'

let host: HTMLElement | null = null

function mountCompendium() {
    host = document.createElement('div')
    document.body.append(host)
    const storage = createMemoryStorage()
    saveSettings(storage, { ...DEFAULT_SETTINGS, anim: 'off' })
    void act(() => render(h(App, { store: new GameStore(standardMode(0), 4), storage, initial: 'compendium' }), host!))
    return host
}

afterEach(() => {
    if (host) render(null, host)
    host?.remove()
    host = null
})

describe('compendium view', () => {
    it('writes only what differs from a fresh view, and reads it back', () => {
        expect(compendiumQuery(FRESH_COMPENDIUM)).toBe('?screen=compendium')
        const view = { ...FRESH_COMPENDIUM, effect: 'flip' as const, query: 'draw', lean: ['tide' as const], hearts: true }
        const query = compendiumQuery(view)
        expect(query).toBe('?screen=compendium&tab=effects&effect=flip&q=draw&lean=tide&hearts=1')
        expect(compendiumViewFromSearch(query)).toEqual({ ...view, tab: 'effects' })
    })

    it('ignores unknown names in a stale address', () => {
        const view = compendiumViewFromSearch('?screen=compendium&tab=nope&effect=nope&lean=pink&fam=nope')
        expect(view).toEqual(FRESH_COMPENDIUM)
    })

    it('filters by search and by filters, and counts the filters', () => {
        expect(matchingEffects(FRESH_COMPENDIUM)).toHaveLength(EFFECTS.length)
        const hearts = { ...FRESH_COMPENDIUM, hearts: true, enemies: true }
        expect(activeFilterCount(hearts)).toBe(2)
        expect(matchingEffects(hearts).length).toBeLessThan(EFFECTS.length)
        expect(matchingEffects({ ...FRESH_COMPENDIUM, query: 'zzzz-no-such-effect' })).toEqual([])
    })

    it('sorts by name when asked, and keeps the sort in the address', () => {
        const view = { ...FRESH_COMPENDIUM, sort: 'name' as const }
        const names = matchingEffects(view).map((effect) => effectName(effect.id))
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
        expect(compendiumQuery(view)).toBe('?screen=compendium&sort=name')
        expect(compendiumViewFromSearch('?screen=compendium&sort=name').sort).toBe('name')
    })

    it('matches the start of a word, not the middle of one', () => {
        const ids = (query: string) => matchingEffects({ ...FRESH_COMPENDIUM, query }).map((effect) => effect.id)
        expect(ids('flus')).toContain('flush')
        expect(ids('lush')).not.toContain('flush')
    })
})

describe('Compendium screen', () => {
    it('opens on the first tab, with the tab as the current crumb', () => {
        const host = mountCompendium()
        expect(host.querySelector('main.compendium')).not.toBeNull()
        expect(host.querySelector('.crumbs [aria-current="page"]')?.textContent).toBe('Generator')
        expect(host.querySelectorAll('.tabs button')).toHaveLength(3)
    })

    it('lists every effect, then opens one with its example card', () => {
        const host = mountCompendium()
        void act(() => (host.querySelectorAll('.tabs button')[1] as HTMLElement).click())
        expect(host.querySelectorAll('.cmp-row')).toHaveLength(EFFECTS.length)
        void act(() => (host.querySelector('.cmp-row') as HTMLElement).click())
        expect(host.querySelector('.crumbs [aria-current="page"]')).not.toBeNull()
        expect(host.querySelector('.blurb')?.textContent).not.toBe('')
    })

    it('steps through the example cards with the arrows and back to the same card', () => {
        const host = mountCompendium()
        void act(() => (host.querySelectorAll('.tabs button')[1] as HTMLElement).click())
        void act(() => (host.querySelector('.cmp-row') as HTMLElement).click())
        const back = host.querySelector('button.step.back') as HTMLButtonElement
        const next = host.querySelector('button.step:not(.back)') as HTMLButtonElement
        const first = host.querySelector('.cards.example .slot')?.innerHTML
        expect(back.disabled).toBe(true)
        void act(() => next.click())
        expect(back.disabled).toBe(false)
        void act(() => back.click())
        expect(back.disabled).toBe(true)
        expect(host.querySelector('.cards.example .slot')?.innerHTML).toBe(first)
    })
})

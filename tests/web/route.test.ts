import { describe, expect, it } from 'vite-plus/test'
import { standardMode } from '../../src/core'
import { hasRun, isEditor, routeFor, shareQuery } from '../../src/platform/web/mode'

describe('screen routes', () => {
    it('shows the home screen when the address names no run', () => {
        expect(hasRun('')).toBe(false)
        expect(hasRun('?utm=x')).toBe(false)
        expect(routeFor('', null)).toEqual({ screen: 'home' })
        expect(routeFor('', '?seed=1&mode=standard&goal=1')).toEqual({ screen: 'home' })
    })

    it('starts the run a game address names', () => {
        const route = routeFor('?seed=7&mode=long', null)
        expect(route.screen).toBe('game')
        expect(route.screen === 'game' && route.start?.seed).toBe(7)
        expect(route.screen === 'game' && route.start?.config.id).toBe('long')
        expect(hasRun('?mode=long')).toBe(true)
        expect(hasRun('?seed=5')).toBe(true)
    })

    it('shows the generator editor for screen=custom, with its settings from the address', () => {
        const search = '?screen=custom&goal=2&types=moss,foe&res=gold,power,hearts&sg=3&sp=7&fx=flip'
        expect(isEditor(search)).toBe(true)
        expect(isEditor('?mode=custom')).toBe(false)
        const route = routeFor(search, null)
        expect(route.screen).toBe('custom')
        expect(route.screen === 'custom' && route.def).toMatchObject({
            goalLevel: 1,
            types: ['moss', 'foe'],
            starterGold: 3,
            starterPower: 7,
            effects: ['flip'],
        })
        // The editor starts no run, even with a run in memory or a seed in the address.
        expect(routeFor(`${search}&seed=5&mode=long`, '?seed=5&mode=long').screen).toBe('custom')
    })

    it('shows the challenge picker for screen=challenges and starts no run', () => {
        expect(routeFor('?screen=challenges', null)).toEqual({ screen: 'challenges' })
        expect(routeFor('?screen=challenges&seed=5', '?seed=5')).toEqual({ screen: 'challenges' })
    })

    it('resumes the run in memory when the address matches it', () => {
        const run = shareQuery(standardMode(1), 42)
        expect(routeFor(run, run)).toEqual({ screen: 'game', start: null })
    })

    it('starts a different run when the address names another one', () => {
        const run = shareQuery(standardMode(1), 42)
        const route = routeFor(shareQuery(standardMode(1), 43), run)
        expect(route.screen === 'game' && route.start?.seed).toBe(43)
    })
})

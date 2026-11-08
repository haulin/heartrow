import { describe, expect, it } from 'vite-plus/test'
import {
    CUSTOM_EFFECTS,
    CUSTOM_PRESETS,
    CUSTOM_RESOURCES,
    CUSTOM_TYPES,
    DEFAULT_CUSTOM,
    customFromMode,
    customMode,
    customSummary,
    effectiveEffects,
    effectiveTypes,
    newGame,
    standardMode,
} from '../../src/core'
import { customQuery, effectName, parseCustom } from '../../src/platform/web/custom'
import { parseStartParams, shareQuery } from '../../src/platform/web/mode'

describe('custom generator links', () => {
    it('round-trips through a share link', () => {
        const def = {
            goalLevel: 2,
            types: ['moss' as const, 'foe' as const],
            resources: ['gold' as const, 'hearts' as const],
            effects: ['draw' as const, 'exile' as const],
            starterGold: 9,
            starterPower: 1,
        }
        const link = shareQuery(customMode(def), 77)
        const parsed = parseStartParams(link)
        expect(parsed.seed).toBe(77)
        expect(parsed.config.id).toBe('custom')
        expect(customFromMode(parsed.config)).toEqual(def)
        expect(parsed.config.goal).toBe(standardMode(2).goal)
        expect(parsed.config.starter).toEqual({ basicGold: 9, basicPower: 1 })
    })

    it('treats missing parts as everything, and an empty effect list as none', () => {
        expect(parseCustom(new URLSearchParams('mode=custom'))).toEqual(DEFAULT_CUSTOM)
        expect(parseCustom(new URLSearchParams('fx=')).effects).toEqual([])
    })

    it('still reads older links that have no resources or starter', () => {
        const def = parseCustom(new URLSearchParams('goal=2&types=moss,tide&fx=draw,exile'))
        expect(def).toMatchObject({
            goalLevel: 1,
            types: ['moss', 'tide'],
            resources: [...CUSTOM_RESOURCES],
            starterGold: 6,
            starterPower: 4,
        })
    })

    it('ignores removed gain controls', () => {
        const def = parseCustom(new URLSearchParams('fx=draw&gmin=2&gmax=4&eg=1'))
        expect(def).toEqual({ ...DEFAULT_CUSTOM, effects: ['draw'] })
    })

    it('ignores unknown names and bad numbers, and never allows zero card types or an empty starter', () => {
        const def = parseCustom(new URLSearchParams('goal=9&types=nope&res=nope&sg=0&sp=0&fx=draw,nope,exile'))
        expect(def).toEqual({ ...DEFAULT_CUSTOM, effects: ['draw', 'exile'] })
        expect(parseCustom(new URLSearchParams('goal=abc&sg=-3&sp=x')).goalLevel).toBe(0)
        expect(parseCustom(new URLSearchParams('sg=99&sp=0')).starterGold).toBe(12)
    })

    it('puts the generator and the starter into the game state', () => {
        const def = {
            ...DEFAULT_CUSTOM,
            types: ['tide' as const],
            resources: ['gold' as const],
            effects: [],
            starterGold: 10,
            starterPower: 0,
        }
        const state = newGame(customMode(def), 3).state
        expect(state.row.every((card) => card.type === 'tide' && card.fx.length === 0 && card.power === 0)).toBe(true)
        const basics = [...state.deck, ...state.hand].filter((card) => card.kind === 'basic')
        expect(basics).toHaveLength(10)
        expect(basics.every((card) => card.power === 0)).toBe(true)
    })

    it('spells out Standard like any generator, and names effects readably', () => {
        expect(shareQuery(standardMode(1), 5)).toBe(`?seed=5&mode=custom&${customQuery({ ...DEFAULT_CUSTOM, goalLevel: 1 })}`)
        expect(customQuery({ ...DEFAULT_CUSTOM, types: ['moss'], effects: [] })).toBe(
            'goal=1&types=moss&res=gold,power,hearts&sg=6&sp=4&fx=',
        )
        expect(effectName('reapG')).toBe('Reap G')
        expect(effectName('draw')).toBe('Draw')
    })

    it('counts only what can really be made when it describes a generator', () => {
        expect(customSummary(DEFAULT_CUSTOM)).toBe('all types; all resources; all effects')
        expect(customSummary({ ...DEFAULT_CUSTOM, effects: [] })).toBe('all types; all resources; no effects')
        expect(customSummary({ ...DEFAULT_CUSTOM, starterGold: 0, starterPower: 5 })).toBe(
            'all types; all resources; all effects; start with 0 ● and 5 ⚔ Basics',
        )
        const noTide = { ...DEFAULT_CUSTOM, types: ['moss' as const, 'ember' as const, 'foe' as const] }
        expect(customSummary(noTide)).toBe('moss, ember, foe; all resources; 23 of 24 effects')
        expect(effectiveEffects(noTide)).not.toContain('all3')
        const noHearts = { ...DEFAULT_CUSTOM, resources: ['gold' as const, 'power' as const] }
        expect(effectiveTypes(noHearts)).toEqual(['moss', 'ember', 'tide'])
        expect(customSummary({ ...DEFAULT_CUSTOM, types: ['foe'], resources: ['gold'] })).toContain('no card types')
    })

    it('has presets that survive a link and only name known things', () => {
        for (const preset of CUSTOM_PRESETS) {
            const g = preset.generator
            expect(parseCustom(new URLSearchParams(customQuery(g)))).toEqual(g)
            expect(g.types.every((t) => CUSTOM_TYPES.includes(t))).toBe(true)
            expect(g.effects.every((e) => CUSTOM_EFFECTS.includes(e))).toBe(true)
        }
    })
})

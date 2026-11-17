import { EFFECTS, EFFECT_BY_ID, EFFECT_FAMILIES } from '../../core'
import type { Colour, EffectDef, EffectFamily, EffectId } from '../../core'
import { effectName } from './custom'

export type CompendiumTab = 'generator' | 'effects' | 'types'

export const COMPENDIUM_TABS: readonly { id: CompendiumTab; name: string }[] = [
    { id: 'generator', name: 'Generator' },
    { id: 'effects', name: 'Effects' },
    { id: 'types', name: 'Types' },
]

export const COMPENDIUM_COLOURS: readonly Colour[] = ['moss', 'ember', 'tide']

/** Where the player is in the compendium: the tab, the effect opened, and the search and filters of the effect list. All of it is in the address. */
export interface CompendiumView {
    tab: CompendiumTab
    effect: EffectId | null
    query: string
    lean: Colour[]
    families: EffectFamily[]
    enemies: boolean
    hearts: boolean
    sort: EffectSort
}

/** The effect list is in family order, or in the alphabet. */
export type EffectSort = 'family' | 'name'

export const EFFECT_SORTS: readonly { id: EffectSort; name: string }[] = [
    { id: 'family', name: 'family' },
    { id: 'name', name: 'name' },
]

export const FRESH_COMPENDIUM: CompendiumView = {
    tab: 'generator',
    effect: null,
    query: '',
    lean: [],
    families: [],
    enemies: false,
    hearts: false,
    sort: 'family',
}

const FAMILY_IDS = EFFECT_FAMILIES.map((family) => family.id)

function listOf<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
    const wanted = (raw ?? '').split(',')
    return allowed.filter((item) => wanted.includes(item))
}

/** The address of the compendium at a view. Only what differs from a fresh view is written, and an opened effect always means the Effects tab. */
export function compendiumQuery(view: CompendiumView): string {
    const params = new URLSearchParams({ screen: 'compendium' })
    const tab = view.effect ? 'effects' : view.tab
    if (tab !== 'generator') params.set('tab', tab)
    if (view.effect) params.set('effect', view.effect)
    if (view.query) params.set('q', view.query)
    if (view.lean.length > 0) params.set('lean', view.lean.join(','))
    if (view.families.length > 0) params.set('fam', view.families.join(','))
    if (view.enemies) params.set('foe', '1')
    if (view.hearts) params.set('hearts', '1')
    if (view.sort !== FRESH_COMPENDIUM.sort) params.set('sort', view.sort)
    return `?${params.toString().replace(/%2C/g, ',')}`
}

/** The view an address names. Unknown tabs, effects and filter names are ignored, so a stale link still opens the compendium. */
export function compendiumViewFromSearch(search: string): CompendiumView {
    const params = new URLSearchParams(search)
    const wanted = params.get('effect')
    const effect = wanted !== null && Object.hasOwn(EFFECT_BY_ID, wanted) ? (wanted as EffectId) : null
    const tab = COMPENDIUM_TABS.find((candidate) => candidate.id === params.get('tab'))?.id ?? 'generator'
    return {
        tab: effect ? 'effects' : tab,
        effect,
        query: params.get('q') ?? '',
        lean: listOf(params.get('lean'), COMPENDIUM_COLOURS),
        families: listOf(params.get('fam'), FAMILY_IDS),
        enemies: params.get('foe') === '1',
        hearts: params.get('hearts') === '1',
        sort: EFFECT_SORTS.find((candidate) => candidate.id === params.get('sort'))?.id ?? FRESH_COMPENDIUM.sort,
    }
}

/** An effect that rolled hearts can pay them, so it counts as a heart source. */
export function canPayHearts(effect: EffectDef): boolean {
    return effect.pays === 'hearts' || effect.pays === 'rolled'
}

export function familyName(family: EffectFamily): string {
    return EFFECT_FAMILIES.find((candidate) => candidate.id === family)!.name
}

/** The words of an effect's name, sentence, blurb and family. A search word has to start one of them, so "ex" finds exile but not "next". */
function searchWords(effect: EffectDef): string[] {
    const text = [effectName(effect.id), effect.describe(), effect.blurb, familyName(effect.family)].join(' ').toLowerCase()
    return text.split(/[^a-z0-9]+/).filter(Boolean)
}

export function effectMatches(effect: EffectDef, view: CompendiumView): boolean {
    if (view.lean.length > 0 && !view.lean.some((colour) => effect.lean.includes(colour))) return false
    if (view.families.length > 0 && !view.families.includes(effect.family)) return false
    if (view.enemies && !effect.enemies) return false
    if (view.hearts && !canPayHearts(effect)) return false
    const words = view.query.toLowerCase().split(/\s+/).filter(Boolean)
    const known = searchWords(effect)
    return words.every((word) => known.some((candidate) => candidate.startsWith(word)))
}

/** The effects that fit the search and filters, in the order the view asks for. */
export function matchingEffects(view: CompendiumView): EffectDef[] {
    const byFamily = EFFECT_FAMILIES.flatMap((family) =>
        EFFECTS.filter((effect) => effect.family === family.id && effectMatches(effect, view)),
    )
    if (view.sort === 'family') return byFamily
    return byFamily.sort((a, b) => effectName(a.id).localeCompare(effectName(b.id)))
}

/** How many filters are on. The search text is not a filter. */
export function activeFilterCount(view: CompendiumView): number {
    return view.lean.length + view.families.length + (view.enemies ? 1 : 0) + (view.hearts ? 1 : 0)
}

export const percent = (share: number): string => `${Math.round(share * 1000) / 10}%`

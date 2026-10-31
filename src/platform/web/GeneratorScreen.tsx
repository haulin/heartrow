import { useEffect, useState } from 'preact/hooks'
import {
    CUSTOM_EFFECTS,
    CUSTOM_PRESETS,
    CUSTOM_RESOURCES,
    CUSTOM_TYPES,
    DEFAULT_CUSTOM,
    EFFECTS,
    GOALS,
    customSummary,
    effectiveEffects,
    effectiveTypes,
    generatorOf,
    standardMode,
    unmetNeeds,
} from '../../core'
import type { CustomGenerator, EffectId, GeneratorCardType, GeneratorResource } from '../../core'
import { MAX_STARTER, effectName } from './custom'

const TYPE_NAMES: Record<GeneratorCardType, string> = { moss: 'Moss', ember: 'Ember', tide: 'Tide', foe: 'Enemies' }
const RESOURCE_NAMES: Record<GeneratorResource, string> = { gold: 'Gold ●', power: 'Power ⚔', hearts: 'Hearts ♥' }
const NEED_NAMES: Record<string, string> = { ...TYPE_NAMES, ...RESOURCE_NAMES, exile: 'the Exile effect' }

const toggle = <T,>(list: readonly T[], all: readonly T[], item: T): T[] => {
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
    return all.filter((x) => next.includes(x))
}

/**
 * The custom generator editor, a screen of its own. Every change is reported through `onChange`, so the address always holds the
 * settings (a reload or a copied address gives the same editor). `onBack` leaves without starting a run.
 */
export function GeneratorScreen({
    initial,
    onChange,
    onStart,
    onBack,
}: {
    initial: CustomGenerator
    onChange: (def: CustomGenerator) => void
    onStart: (def: CustomGenerator) => void
    onBack: () => void
}) {
    const [def, setDef] = useState<CustomGenerator>(initial)
    useEffect(() => onChange(def), [def])
    // The preset stays picked until a control changes, then the settings count as custom.
    const [presetId, setPresetId] = useState('')
    const change = (over: Partial<CustomGenerator>) => {
        setPresetId('')
        setDef((d) => ({ ...d, ...over }))
    }
    const generator = generatorOf(def)
    const hasGold = def.resources.includes('gold')
    const hasPower = def.resources.includes('power')
    const enemiesPossible = hasPower && def.resources.includes('hearts')
    const ready = effectiveTypes(def).length > 0

    const toggleResource = (resource: GeneratorResource) => {
        const resources = toggle(def.resources, CUSTOM_RESOURCES, resource)
        if (resource === 'hearts') return change({ resources })
        // Basic cards that give a switched-off resource would be dead weight, so move them to the other one, and back again.
        const total = def.starterGold + def.starterPower
        const on = resources.includes(resource)
        if (!on && resource === 'gold')
            change({ resources, starterGold: 0, starterPower: resources.includes('power') ? total : def.starterPower })
        else if (!on) change({ resources, starterGold: resources.includes('gold') ? total : def.starterGold, starterPower: 0 })
        else if (resources.includes('gold') && resources.includes('power')) {
            change({ resources, starterGold: DEFAULT_CUSTOM.starterGold, starterPower: DEFAULT_CUSTOM.starterPower })
        } else change({ resources })
    }

    const loadPreset = (id: string) => {
        const picked = CUSTOM_PRESETS.find((p) => p.id === id)
        if (!picked) return setPresetId('')
        setDef({ ...picked.generator, goalLevel: def.goalLevel })
        setPresetId(id)
    }

    const starterInput = (key: 'starterGold' | 'starterPower', label: string, disabled: boolean) => (
        <label class={`pick wide${disabled ? ' off' : ''}`} title={disabled ? 'The resource is switched off.' : undefined}>
            {label}{' '}
            <input
                type="number"
                min={0}
                max={MAX_STARTER}
                value={def[key]}
                disabled={disabled}
                onChange={(e) => change({ [key]: Math.max(0, Math.min(MAX_STARTER, Math.floor(Number(e.currentTarget.value)) || 0)) })}
            />
        </label>
    )

    return (
        <main class="gen">
            <header>
                <button type="button" class="b alt" onClick={onBack}>
                    ← Back
                </button>
            </header>
            <h1>Custom generator</h1>
            <p class="rules">
                Choose what the generator may make. The settings go into the link, so you can open several tabs or share one.
            </p>
            <div class="col">
                <label>
                    Preset{' '}
                    <select value={presetId} onChange={(e) => loadPreset(e.currentTarget.value)}>
                        <option value="">Custom</option>
                        {CUSTOM_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>
                <p class="rules">{customSummary(def)}</p>
                <label>
                    Goal{' '}
                    <select value={def.goalLevel} onChange={(e) => change({ goalLevel: Number(e.currentTarget.value) })}>
                        {GOALS.map((goal, level) => (
                            <option key={goal} value={level}>
                                Level {level + 1}: {goal} ♥ in {standardMode(level).turns} turns
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <fieldset class="picks">
                <legend>Card types</legend>
                {CUSTOM_TYPES.map((type) => {
                    const off = type === 'foe' && !enemiesPossible
                    return (
                        <label
                            key={type}
                            class={`pick ${type}`}
                            title={off ? 'Enemies need power to defeat and hearts to pay out.' : undefined}
                        >
                            <input
                                type="checkbox"
                                checked={def.types.includes(type)}
                                disabled={off}
                                onChange={() => change({ types: toggle(def.types, CUSTOM_TYPES, type) })}
                            />
                            {TYPE_NAMES[type]}
                        </label>
                    )
                })}
            </fieldset>

            <fieldset class="picks">
                <legend>Cards give</legend>
                {CUSTOM_RESOURCES.map((resource) => (
                    <label
                        key={resource}
                        class="pick"
                        title={resource === 'gold' ? 'Recruits cost gold, so without it only enemies can be beaten.' : undefined}
                    >
                        <input type="checkbox" checked={def.resources.includes(resource)} onChange={() => toggleResource(resource)} />
                        {RESOURCE_NAMES[resource]}
                    </label>
                ))}
            </fieldset>

            <fieldset class="picks">
                <legend>Start with</legend>
                {starterInput('starterGold', 'Basic ●', !hasGold)}
                {starterInput('starterPower', 'Basic ⚔', !hasPower)}
            </fieldset>

            <fieldset class="picks">
                <legend>
                    Effects ({effectiveEffects(def).length} of {CUSTOM_EFFECTS.length}){' '}
                    <button type="button" class="b alt small" onClick={() => change({ effects: [...CUSTOM_EFFECTS] })}>
                        All
                    </button>{' '}
                    <button type="button" class="b alt small" onClick={() => change({ effects: [] })}>
                        None
                    </button>
                </legend>
                {EFFECTS.map((effect) => {
                    const unmet = unmetNeeds(generator, effect.id)
                    const off = unmet.length > 0
                    const title = off ? `${effect.text}\nNeeds ${unmet.map((need) => NEED_NAMES[need]).join(', ')}.` : effect.text
                    return (
                        <label key={effect.id} class={`pick${off ? ' off' : ''}`} title={title}>
                            <input
                                type="checkbox"
                                checked={def.effects.includes(effect.id)}
                                disabled={off}
                                onChange={() => change({ effects: toggle<EffectId>(def.effects, CUSTOM_EFFECTS, effect.id) })}
                            />
                            {effectName(effect.id)}
                        </label>
                    )
                })}
            </fieldset>

            <p class="rules">
                {ready
                    ? 'Hover an effect to see what it does. A greyed choice keeps its tick but does nothing while something it needs is switched off.'
                    : 'Pick at least one card type.'}
            </p>
            <div class="bar">
                <button type="button" class="b" disabled={!ready} onClick={() => onStart(def)}>
                    Start a new run
                </button>
            </div>
        </main>
    )
}

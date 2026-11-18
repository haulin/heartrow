import { useMemo, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { EFFECTS, EFFECT_BY_ID, EFFECT_FAMILIES, GENERATION, exampleCard, newGame, standardRun, priceTable } from '../../core'
import type { Colour, EffectDef, PriceTable } from '../../core'
import {
    COMPENDIUM_COLOURS,
    COMPENDIUM_TABS,
    EFFECT_SORTS,
    activeFilterCount,
    canPayHearts,
    familyName,
    leanColours,
    matchingEffects,
    percent,
} from './compendiumView'
import type { CompendiumView } from './compendiumView'
import { NEED_NAMES, TYPE_NAMES, effectName } from './custom'
import { runEffect } from './anim'
import { Glyph } from './Glyph'
import { Rich } from './Rich'
import type { AnimSpeed } from './settings'
import type { CardSkin } from './skins'
import { buildCardView } from './view/cardView'

export interface CompendiumProps {
    view: CompendiumView
    skin: CardSkin
    animSpeed: AnimSpeed
    /** Moves to another place, so Back returns to this one. */
    onNavigate: (view: CompendiumView) => void
    /** Changes the search or a filter in place, without a new history entry. */
    onAdjust: (view: CompendiumView) => void
    onHome: () => void
}

const PAYS_NAMES: Record<NonNullable<EffectDef['pays']>, string> = {
    gold: 'Gold ●',
    power: 'Power ⚔',
    hearts: 'Hearts ♥',
    main: "The card's own resource",
    rolled: 'A rolled resource: ● ⚔ or ♥',
}

const toggleIn = <T,>(list: readonly T[], item: T): T[] => (list.includes(item) ? list.filter((other) => other !== item) : [...list, item])

/** The reference: how cards are made, every effect, and the card types. Everything on it is read from the generator's own data. */
export function Compendium({ view, skin, animSpeed, onNavigate, onAdjust, onHome }: CompendiumProps) {
    const [filtersOpen, setFiltersOpen] = useState(false)
    const effect = view.effect ? EFFECT_BY_ID[view.effect] : null
    const listing = view.tab === 'effects' && !effect
    return (
        <main class="compendium">
            <div class="cmp-head">
                <Crumbs view={view} onNavigate={onNavigate} onHome={onHome} />
                <Tabs view={view} onNavigate={onNavigate} />
                {listing ? (
                    <SearchBar
                        view={view}
                        onAdjust={onAdjust}
                        filtersOpen={filtersOpen}
                        onToggleFilters={() => setFiltersOpen(!filtersOpen)}
                    />
                ) : null}
                {listing && filtersOpen ? <FilterPanel view={view} onAdjust={onAdjust} /> : null}
            </div>
            <div role="tabpanel" aria-label={COMPENDIUM_TABS.find((tab) => tab.id === view.tab)!.name}>
                {view.tab === 'generator' ? <HowItWorks onNavigate={(tab) => onNavigate({ ...view, tab, effect: null })} /> : null}
                {view.tab === 'effects' && effect ? (
                    <EffectDetail effect={effect} view={view} skin={skin} animSpeed={animSpeed} onNavigate={onNavigate} />
                ) : null}
                {view.tab === 'effects' && !effect ? <EffectList view={view} onNavigate={onNavigate} onAdjust={onAdjust} /> : null}
                {view.tab === 'types' ? <Types view={view} onNavigate={onNavigate} /> : null}
            </div>
        </main>
    )
}

function Crumbs({ view, onNavigate, onHome }: Pick<CompendiumProps, 'view' | 'onNavigate' | 'onHome'>) {
    const tab = COMPENDIUM_TABS.find((candidate) => candidate.id === view.tab)!
    const effect = view.effect ? EFFECT_BY_ID[view.effect] : null
    const items: { label: string; go: (() => void) | null }[] = [
        { label: 'Home', go: onHome },
        { label: 'Compendium', go: () => onNavigate({ ...view, tab: 'generator', effect: null }) },
        { label: tab.name, go: effect ? () => onNavigate({ ...view, effect: null }) : null },
    ]
    if (effect) items.push({ label: effectName(effect.id), go: null })
    return (
        <nav class="crumbs" aria-label="Breadcrumb">
            <ol>
                {items.map((item, index) => (
                    <li key={item.label}>
                        {item.go ? (
                            <button type="button" class="crumb" onClick={item.go}>
                                {item.label}
                            </button>
                        ) : (
                            <span aria-current="page">{item.label}</span>
                        )}
                        {index < items.length - 1 ? <Glyph name="chevron" /> : null}
                    </li>
                ))}
            </ol>
        </nav>
    )
}

function Tabs({ view, onNavigate }: Pick<CompendiumProps, 'view' | 'onNavigate'>) {
    return (
        <div class="tabs" role="tablist">
            {COMPENDIUM_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab.id === view.tab}
                    class={tab.id === view.tab ? 'on' : ''}
                    onClick={() => onNavigate({ ...view, tab: tab.id, effect: null })}
                >
                    {tab.name}
                </button>
            ))}
        </div>
    )
}

function Fact({ label, children }: { label: ComponentChildren; children: ComponentChildren }) {
    return (
        <div class="fact">
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    )
}

/** `accent` tints the heading and the slanted band on the right edge: a gem colour, or `foe` for enemies. */
function Box({ title, accent, children }: { title: string; accent?: Colour | 'foe'; children: ComponentChildren }) {
    return (
        <section class={`cmp-box${accent ? ` ${accent}` : ''}`}>
            <h3>{title}</h3>
            {children}
        </section>
    )
}

function HowItWorks({ onNavigate }: { onNavigate: (tab: 'types') => void }) {
    const {
        enemyShareSteps,
        effectChance,
        plainRetainChance,
        recruitBudgetPerCost,
        recruitBudgetBase,
        enemyBudgetPerCost,
        resourcePrice,
        leanShare,
    } = GENERATION
    const [firstStep, ...laterSteps] = enemyShareSteps
    return (
        <>
            <p class="rules">
                Every card is made when it enters the river. It is an enemy or a recruit first, then it gets a cost that sets its budget,
                and the budget pays for an effect and for gains. The numbers below are the ones the generator uses.
            </p>
            <div class="cmp-grid">
                <Box title="What a new card is">
                    <dl class="facts">
                        <Fact label="Enemy">{percent(firstStep!.share)}</Fact>
                        {laterSteps.map((step) => (
                            <Fact key={step.fromTurn} label={`Enemy, Long Run from turn ${step.fromTurn}`}>
                                {percent(step.share)}
                            </Fact>
                        ))}
                        <Fact label="Moss or Ember recruit with an effect">{percent(effectChance.moss)}</Fact>
                        <Fact label="Tide recruit with an effect">{percent(effectChance.tide)}</Fact>
                        <Fact label="Plain recruit with Retain">{percent(plainRetainChance)}</Fact>
                    </dl>
                    <p class="note">A recruit with an effect rolls Retain by effect: see the page of the effect.</p>
                </Box>
                <Box title="Budget">
                    <dl class="facts">
                        <Fact label="Recruit, per point of cost">{recruitBudgetPerCost}</Fact>
                        <Fact label="Recruit, extra by type: Moss, Ember, Tide">
                            {recruitBudgetBase.moss}, {recruitBudgetBase.ember}, {recruitBudgetBase.tide}
                        </Fact>
                        <Fact label="Enemy, per point of cost">{enemyBudgetPerCost}</Fact>
                    </dl>
                </Box>
                <Box title="Resources">
                    <dl class="facts">
                        <Fact label="Gold">
                            <Rich text={`${resourcePrice.gold} ●`} />
                        </Fact>
                        <Fact label="Power">
                            <Rich text={`${resourcePrice.power} ⚔`} />
                        </Fact>
                        <Fact label="Hearts">
                            <Rich text={`${resourcePrice.hearts} ♥`} />
                        </Fact>
                    </dl>
                    <p class="note">Budget price of one unit on a card.</p>
                </Box>
                <Box title="Leans">
                    <dl class="facts">
                        <Fact label="Share of the effect pool for a type's leans">{percent(leanShare)}</Fact>
                    </dl>
                    <p class="note">
                        Each type favours some effects.{' '}
                        <button type="button" class="link" onClick={() => onNavigate('types')}>
                            See which on the Types tab
                        </button>
                        .
                    </p>
                </Box>
            </div>
        </>
    )
}

function FilterChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return (
        <button type="button" class="chip" aria-pressed={on} onClick={onClick}>
            {label}
        </button>
    )
}

function FilterPanel({ view, onAdjust }: Pick<CompendiumProps, 'view' | 'onAdjust'>) {
    return (
        <div class="cmp-filters">
            <ChipRow label="Leans">
                {COMPENDIUM_COLOURS.map((colour) => (
                    <FilterChip
                        key={colour}
                        label={TYPE_NAMES[colour]}
                        on={view.lean.includes(colour)}
                        onClick={() => onAdjust({ ...view, lean: toggleIn(view.lean, colour) })}
                    />
                ))}
            </ChipRow>
            <ChipRow label="Family">
                {EFFECT_FAMILIES.map((family) => (
                    <FilterChip
                        key={family.id}
                        label={family.name}
                        on={view.families.includes(family.id)}
                        onClick={() => onAdjust({ ...view, families: toggleIn(view.families, family.id) })}
                    />
                ))}
            </ChipRow>
            <ChipRow label="Other">
                <FilterChip label="Can be on enemies" on={view.enemies} onClick={() => onAdjust({ ...view, enemies: !view.enemies })} />
                <FilterChip label="Can pay hearts" on={view.hearts} onClick={() => onAdjust({ ...view, hearts: !view.hearts })} />
            </ChipRow>
        </div>
    )
}

/** A label in a column of its own, with the chips flowing to the right of it, so a second row of chips never wraps under the label. */
function ChipRow({ label, children }: { label: string; children: ComponentChildren }) {
    return (
        <div class="chip-row" role="group" aria-label={label}>
            <span class="chips-name">{label}</span>
            <div class="chips">{children}</div>
        </div>
    )
}

function SearchBar({
    view,
    onAdjust,
    filtersOpen,
    onToggleFilters,
}: Pick<CompendiumProps, 'view' | 'onAdjust'> & { filtersOpen: boolean; onToggleFilters: () => void }) {
    const filters = activeFilterCount(view)
    const otherSort = EFFECT_SORTS.find((candidate) => candidate.id !== view.sort)!
    return (
        <div class="cmp-search">
            <input
                type="search"
                name="q"
                value={view.query}
                placeholder="Search all text, for example draw or exile"
                aria-label="Search effects"
                onInput={(event) => onAdjust({ ...view, query: event.currentTarget.value })}
            />
            <button
                type="button"
                class="b alt cmp-icon"
                aria-expanded={filtersOpen}
                aria-label={filters > 0 ? `Filters, ${filters} on` : 'Filters'}
                title="Filters"
                onClick={onToggleFilters}
            >
                <Glyph name="filter" />
                {filters > 0 ? <span class="count">{filters}</span> : null}
            </button>
            <button
                type="button"
                class="b alt cmp-icon"
                aria-label={`Sorted by ${view.sort}. Change sort`}
                title={`Sorted by ${view.sort}. Tap to sort by ${otherSort.name}.`}
                onClick={() => onAdjust({ ...view, sort: otherSort.id })}
            >
                <Glyph name="sort" />
            </button>
        </div>
    )
}

function EffectList({ view, onNavigate, onAdjust }: Pick<CompendiumProps, 'view' | 'onNavigate' | 'onAdjust'>) {
    const found = matchingEffects(view)
    const filters = activeFilterCount(view)
    const clear = () => onAdjust({ ...view, query: '', lean: [], families: [], enemies: false, hearts: false })
    return (
        <>
            <p class="note">
                {found.length} of {EFFECTS.length} effects, sorted by {view.sort}
                {filters > 0 || view.query ? (
                    <>
                        {' · '}
                        <button type="button" class="link" onClick={clear}>
                            Clear search and filters
                        </button>
                    </>
                ) : null}
            </p>
            <div class="cmp-list">
                {found.map((effect) => {
                    const leans = leanColours(effect)
                    return (
                        <button key={effect.id} type="button" class="cmp-row" onClick={() => onNavigate({ ...view, effect: effect.id })}>
                            <span class="cmp-row-head">
                                <span class="cmp-row-name">{effectName(effect.id)}</span>
                                <span class="pill">{familyName(effect.family)}</span>
                            </span>
                            <span class="cmp-row-text">
                                <Rich text={effect.describe()} />
                            </span>
                            {leans.length > 0 ? (
                                <span
                                    class="cmp-leans"
                                    aria-hidden="true"
                                    title={`Favoured by ${leans.map((c) => TYPE_NAMES[c]).join(', ')}`}
                                >
                                    {leans.map((colour) => (
                                        <i key={colour} class={colour} />
                                    ))}
                                </span>
                            ) : null}
                            <span class="sr-only">
                                {leans.length > 0 ? `Favoured by ${leans.map((c) => TYPE_NAMES[c]).join(', ')}.` : 'Favours no colour.'}
                            </span>
                        </button>
                    )
                })}
            </div>
        </>
    )
}

function EffectDetail({
    effect,
    view,
    skin,
    animSpeed,
    onNavigate,
}: {
    effect: EffectDef
    view: CompendiumView
    skin: CardSkin
    animSpeed: AnimSpeed
    onNavigate: CompendiumProps['onNavigate']
}) {
    const others = EFFECTS.filter((other) => other.family === effect.family && other.id !== effect.id)
    const prices = useMemo(() => priceTable(effect), [effect])
    const needs = effect.needs?.map((need) => NEED_NAMES[need]).join(', ')
    const needsAny = effect.needsAny?.map((need) => NEED_NAMES[need]).join(' or ')
    return (
        <>
            <div class="cmp-title">
                <h2>{effectName(effect.id)}</h2>
                <span class="pill">{familyName(effect.family)}</span>
            </div>
            <p class="blurb">{effect.blurb}</p>
            <div class="cmp-grid">
                <Box title="Card text">
                    <p class="sentence">
                        <Rich text={effect.describe()} />
                    </p>
                    <p class="note">
                        What the generator may print. Square brackets hold what it rolls: a number in the range, or one of the options.
                    </p>
                </Box>
                <Box title="Example card">
                    <ExampleCard key={effect.id} effect={effect} skin={skin} animSpeed={animSpeed} />
                </Box>
                <Box title="In the generator">
                    <dl class="facts">
                        <Fact label="Retain chance">{effect.retain ? percent(effect.retain.chance) : 'Never'}</Fact>
                        <Fact label="Leans">
                            {effect.lean.length > 0 ? effect.lean.map((colour) => TYPE_NAMES[colour]).join(', ') : 'No type'}
                        </Fact>
                        {effect.mildLean ? (
                            <Fact label="Mild lean">{effect.mildLean.map((colour) => TYPE_NAMES[colour]).join(', ')}</Fact>
                        ) : null}
                        <Fact label="Can be on">
                            {effect.enemyOnly ? 'Enemies only' : effect.enemies ? 'Recruits and enemies' : 'Recruits only'}
                        </Fact>
                        {effect.pays ? (
                            <Fact label="Pays">
                                <Rich text={PAYS_NAMES[effect.pays]} />
                            </Fact>
                        ) : null}
                        {needs ? (
                            <Fact label="Needs">
                                <Rich text={needs} />
                            </Fact>
                        ) : null}
                        {needsAny ? (
                            <Fact label="Needs one of">
                                <Rich text={needsAny} />
                            </Fact>
                        ) : null}
                        {prices ? null : <Fact label="Budget price">{effect.price}</Fact>}
                        {canPayHearts(effect) ? <Fact label="Can be a heart source">Yes</Fact> : null}
                    </dl>
                </Box>
                {prices ? (
                    <Box title="Price by roll">
                        <PriceList table={prices} />
                    </Box>
                ) : null}
                {others.length > 0 ? (
                    <Box title={`Also in ${familyName(effect.family)}`}>
                        <div class="chips">
                            {others.map((other) => (
                                <button key={other.id} type="button" class="chip" onClick={() => onNavigate({ ...view, effect: other.id })}>
                                    {effectName(other.id)}
                                </button>
                            ))}
                        </div>
                    </Box>
                ) : null}
            </div>
        </>
    )
}

/** Hearts cost more per unit, so an effect that can roll them gets a price column of its own. */
function PriceList({ table }: { table: PriceTable }) {
    const splitByResource = table.rows.some((row) => row.heartsPrice !== null)
    return (
        <table class="cmp-table">
            <thead>
                <tr>
                    {table.columns.map((name) => (
                        <th key={name}>{name}</th>
                    ))}
                    <th>
                        <Rich text={splitByResource ? 'Price ● ⚔' : 'Price'} />
                    </th>
                    {splitByResource ? (
                        <th>
                            <Rich text="Price ♥" />
                        </th>
                    ) : null}
                </tr>
            </thead>
            <tbody>
                {table.rows.map((row) => (
                    <tr key={row.values.join('-')}>
                        {row.values.map((value, index) => (
                            <td key={table.columns[index]}>{value}</td>
                        ))}
                        <td>{row.price ?? ''}</td>
                        {splitByResource ? <td>{row.heartsPrice ?? ''}</td> : null}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

const FIRST_EXAMPLE = 1

/** A real generated card with the effect. The state is only there for the card view; the card is shown as if in a pile. */
function ExampleCard({ effect, skin, animSpeed }: { effect: EffectDef; skin: CardSkin; animSpeed: AnimSpeed }) {
    const [seed, setSeed] = useState(FIRST_EXAMPLE)
    const [blowingUp, setBlowingUp] = useState(false)
    const slotRef = useRef<HTMLDivElement>(null)
    const card = useMemo(() => exampleCard(effect.id, seed), [effect.id, seed])
    const state = useMemo(() => newGame(standardRun(3), 1).state, [])
    if (!card) return <p class="note">No example card could be made.</p>
    const view = { ...buildCardView(card, 'pile', 0, state), title: 'Tap for another example' }
    return (
        <div class="cards example">
            <button
                type="button"
                class="step back"
                aria-label="Previous example"
                disabled={seed <= FIRST_EXAMPLE}
                onClick={() => showExample(seed - 1)}
            >
                <Glyph name="chevron" />
            </button>
            <div class="slot" ref={slotRef}>
                <skin.Card view={view} onActivate={() => showExample(seed + 1)} />
            </div>
            <button type="button" class="step" aria-label="Next example" onClick={() => showExample(seed + 1)}>
                <Glyph name="chevron" />
            </button>
        </div>
    )

    /** The card blows up like a defeated enemy, and the example with that number enters in its place. Without animation the card is swapped at once. */
    function showExample(target: number): void {
        const slot = slotRef.current
        if (blowingUp || target < FIRST_EXAMPLE) return
        const { wait } = slot ? runEffect({ kind: 'inflate', el: slot }, animSpeed, false) : { wait: [] }
        if (!slot || wait.length === 0) return setSeed(target)
        setBlowingUp(true)
        const finished = Promise.all(wait.map((animation) => animation.finished)).catch(() => undefined)
        void finished.then(() => {
            for (const animation of wait) animation.cancel()
            setSeed(target)
            setBlowingUp(false)
            runEffect({ kind: 'enter', el: slot }, animSpeed, false)
        })
    }
}

function Types({ view, onNavigate }: Pick<CompendiumProps, 'view' | 'onNavigate'>) {
    const { effectChance, recruitBudgetBase, enemyBudgetPerCost, enemyShareSteps } = GENERATION
    const open = (effect: EffectDef) => onNavigate({ ...view, tab: 'effects', effect: effect.id })
    const chipRow = (label: string, effects: EffectDef[]) => (
        <ChipRow label={label}>
            {effects.map((effect) => (
                <button key={effect.id} type="button" class="chip" onClick={() => open(effect)}>
                    {effectName(effect.id)}
                </button>
            ))}
        </ChipRow>
    )
    return (
        <div class="cmp-grid">
            {COMPENDIUM_COLOURS.map((colour) => {
                const mild = EFFECTS.filter((effect) => effect.mildLean?.includes(colour))
                return (
                    <Box key={colour} title={TYPE_NAMES[colour]} accent={colour}>
                        <dl class="facts">
                            <Fact label="Extra budget">{recruitBudgetBase[colour]}</Fact>
                            <Fact label="Chance of an effect">{percent(effectChance[colour])}</Fact>
                        </dl>
                        {chipRow(
                            'Leans',
                            EFFECTS.filter((effect) => effect.lean.includes(colour)),
                        )}
                        {mild.length > 0 ? chipRow('Mild lean', mild) : null}
                    </Box>
                )
            })}
            <Box title="Enemies" accent="foe">
                <dl class="facts">
                    <Fact label="Budget per point of cost">{enemyBudgetPerCost}</Fact>
                    <Fact label="Chance of an effect">{percent(effectChance.foe)}</Fact>
                    <Fact label="Share of new cards">{percent(enemyShareSteps[0]!.share)}</Fact>
                </dl>
            </Box>
            <Box title="Basic">
                <p class="note">
                    Starter cards. The generator never makes them, so they have no budget, effect or lean. The Basics effect counts the ones
                    still in your deck, and Exile can remove them.
                </p>
            </Box>
        </div>
    )
}

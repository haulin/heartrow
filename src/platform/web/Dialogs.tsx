import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { LONG_MODE, standardMode } from '../../core'
import type { Card, GameState, ModeConfig } from '../../core'
import { Rich } from './Rich'
import { ANIM_SPEEDS, THEMES } from './settings'
import type { Settings } from './settings'
import { shareQuery } from './mode'
import { SKINS } from './skins'
import type { CardSkin } from './skins'
import { deckSummary, sortPile } from './text'
import { buildCardView } from './view/cardView'

export function Modal({ onClose, children }: { onClose: () => void; children: ComponentChildren }) {
    const ref = useRef<HTMLDialogElement>(null)
    useEffect(() => {
        const d = ref.current
        if (!d || d.open) return
        const opener = document.activeElement
        if (typeof d.showModal === 'function') d.showModal()
        else d.setAttribute('open', '')
        return () => {
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
        }
    }, [])
    return (
        <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div class="dlg">
                {children}
                <div class="dlg-actions">
                    <button type="button" class="b" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </dialog>
    )
}

const GOALS_LABEL = (level: number): string => {
    const m = standardMode(level)
    return `Level ${level + 1}: ${m.goal} ♥ in ${m.turns} turns`
}

export function NewGameDialog({ onPick, onClose }: { onPick: (config: ModeConfig) => void; onClose: () => void }) {
    return (
        <Modal onClose={onClose}>
            <h2>New game</h2>
            <div class="col">
                {[0, 1, 2].map((level) => (
                    <button key={level} type="button" class="b alt" onClick={() => onPick(standardMode(level))}>
                        <Rich text={GOALS_LABEL(level)} />
                    </button>
                ))}
                <hr />
                <button type="button" class="b alt" onClick={() => onPick(LONG_MODE)}>
                    <Rich text={`Long Run: highest hearts after ${LONG_MODE.turns} turns`} />
                </button>
            </div>
        </Modal>
    )
}

const copy = (text: string): void => {
    void globalThis.navigator?.clipboard?.writeText(text).catch(() => undefined)
}

export function SeedLine({ state }: { state: GameState }) {
    const link = `${globalThis.location?.origin ?? ''}${globalThis.location?.pathname ?? ''}${shareQuery(state.config, state.seed)}`
    return (
        <p class="rules">
            Mode <code>{state.mode}</code>, seed <code>{state.seed}</code>{' '}
            <button type="button" class="b alt small" onClick={() => copy(String(state.seed))}>
                Copy seed
            </button>{' '}
            <button type="button" class="b alt small" onClick={() => copy(link)}>
                Copy link
            </button>
        </p>
    )
}

export function AboutDialog({ state, onClose }: { state: GameState; onClose: () => void }) {
    return (
        <Modal onClose={onClose}>
            <h2>About Heartrow</h2>
            <p class="rules">Version {__APP_VERSION__}</p>
            <p>
                Click a hand card to play it, or a recruit row card to buy it. Recruits cost gold ●, go to your discard and work whenever
                you draw them. Enemies cost power ⚔: defeating one gives its hearts ♥ and effects once, and if one falls off the right edge
                you lose that many.
            </p>
            <p>
                Standard levels last 24 turns. Long Run lasts 42 turns and records a high score instead of ending when you reach a heart
                target. Its costs and enemy pressure increase after turn 24.
            </p>
            <p>
                Every card is generated as it appears. Moss leans gold and rewards a larger deck, Ember leans power and enemies, Tide leans
                draw, exile, and hearts.
            </p>
            <SeedLine state={state} />
        </Modal>
    )
}

export function LogDialog({ state, history, onClose }: { state: GameState; history: string[]; onClose: () => void }) {
    return (
        <Modal onClose={onClose}>
            <h2>Log (newest first)</h2>
            <SeedLine state={state} />
            <div class="logbox">
                {history
                    .slice()
                    .reverse()
                    .map((line, i) => (
                        <div key={i} class="logline">
                            <Rich text={line} />
                        </div>
                    ))}
            </div>
        </Modal>
    )
}

const PILES: [keyof Pick<GameState, 'deck' | 'discard' | 'exile'>, string][] = [
    ['deck', 'Draw pile (sorted; order hidden)'],
    ['discard', 'Discard'],
    ['exile', 'Exile'],
]

/** A number and its resource symbol, in the resource's colour, so the figure you look for is easy to find. */
function Count({ cls, n, sym }: { cls: 'g' | 'p' | 'h'; n: number; sym: string }) {
    return (
        <span class={`${cls} cnt`}>
            <Rich text={`${n} ${sym}`} />
        </span>
    )
}

export function PilesDialog({ state, skin, onClose }: { state: GameState; skin: CardSkin; onClose: () => void }) {
    const d = deckSummary(state)
    return (
        <Modal onClose={onClose}>
            <div class="summary">
                <div>
                    <b>Your deck:</b> {d.total} cards
                </div>
                <div>
                    <span class="lab">plain gains</span> <Count cls="g" n={d.gold} sym="●" /> <Count cls="p" n={d.power} sym="⚔" />{' '}
                    <Count cls="h" n={d.hearts} sym="♥" />
                </div>
                <div>
                    <span class="lab">effects</span> <Count cls="g" n={d.fxGold} sym="●" /> <Count cls="p" n={d.fxPower} sym="⚔" />{' '}
                    <Count cls="h" n={d.fxHearts} sym="♥" /> {d.fxOther} other
                </div>
                <div>
                    <span class="lab">types</span> <span class="cnt moss">{d.moss} Moss</span>{' '}
                    <span class="cnt ember">{d.ember} Ember</span> <span class="cnt tide">{d.tide} Tide</span>{' '}
                    <span class="cnt">{d.plain} Basic</span>
                </div>
            </div>
            {PILES.map(([name, title]) => {
                const cards: Card[] = sortPile(state[name])
                return (
                    <section key={name}>
                        <h2>
                            {title} · {state[name].length}
                        </h2>
                        <div class="mini">
                            {cards.length === 0 ? <span class="rules">Empty.</span> : null}
                            {cards.map((c) => (
                                <div key={c.id} class="slot">
                                    <skin.Card view={buildCardView(c, 'pile', 0, state)} />
                                </div>
                            ))}
                        </div>
                    </section>
                )
            })}
        </Modal>
    )
}

const LABEL: Record<string, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    off: 'Off',
    fast: 'Fast',
    normal: 'Normal',
    slow: 'Extra slow',
}

export function SettingsDialog({
    settings,
    onChange,
    onClose,
}: {
    settings: Settings
    onChange: (s: Settings) => void
    onClose: () => void
}) {
    return (
        <Modal onClose={onClose}>
            <h2>Settings</h2>
            <div class="col">
                <label>
                    Theme{' '}
                    <select
                        value={settings.theme}
                        onChange={(e) => onChange({ ...settings, theme: e.currentTarget.value as Settings['theme'] })}
                    >
                        {THEMES.map((t) => (
                            <option key={t} value={t}>
                                {LABEL[t]}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Animations{' '}
                    <select
                        value={settings.anim}
                        onChange={(e) => onChange({ ...settings, anim: e.currentTarget.value as Settings['anim'] })}
                    >
                        {ANIM_SPEEDS.map((t) => (
                            <option key={t} value={t}>
                                {LABEL[t]}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Card style{' '}
                    <select value={settings.skin} onChange={(e) => onChange({ ...settings, skin: e.currentTarget.value })}>
                        {SKINS.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </label>
                <p class="rules">Animations are always off when your system asks for reduced motion.</p>
            </div>
        </Modal>
    )
}

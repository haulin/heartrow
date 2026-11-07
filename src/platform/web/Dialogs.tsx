import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { GOALS } from '../../core'
import type { Card, GameState, Move } from '../../core'
import { runName } from './challenges'
import { Rich } from './Rich'
import { ANIM_SPEEDS, THEMES } from './settings'
import type { Settings } from './settings'
import { shareQuery } from './mode'
import { SKINS } from './skins'
import type { CardSkin } from './skins'
import { deckSummary, heartsBreakdown, moveFacts, outcomeLine, sortPile } from './text'
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

/** Copies text. A LAN page over HTTP is not a secure context, so it cannot promise that the browser clipboard was updated. */
export async function copy(text: string): Promise<boolean> {
    const secure = globalThis.isSecureContext === true
    try {
        if (secure && globalThis.navigator.clipboard) {
            await globalThis.navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // Try the legacy path below. A browser may expose the API but still reject this write.
    }
    try {
        const box = document.createElement('textarea')
        box.value = text
        box.style.position = 'fixed'
        box.style.opacity = '0'
        document.body.append(box)
        box.focus()
        box.select()
        box.setSelectionRange(0, box.value.length)
        document.execCommand('copy')
        box.remove()
        // The legacy command can return true without making the system clipboard available.
        return false
    } catch {
        return false
    }
}

/** A button that copies `text` and says so for a moment: "Copied", or "Not copied" when the browser refuses. */
export function CopyButton({ label, text, title }: { label: string; text: () => string; title?: string }) {
    const [result, setResult] = useState<'copied' | 'failed' | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    useEffect(() => () => clearTimeout(timer.current), [])
    const click = async () => {
        setResult((await copy(text())) ? 'copied' : 'failed')
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setResult(null), 1500)
    }
    // All three texts share one grid cell and the inactive ones are hidden, so the button keeps the width of the widest and nothing moves
    // when the text changes. The check mark is drawn, not typed: the bundled font has no such glyph, so a typed one would come from a system font.
    const shown = result ?? 'idle'
    return (
        <button type="button" class="b alt small swap" title={title} onClick={click}>
            <span class={shown === 'idle' ? '' : 'gone'}>{label}</span>
            <span class={shown === 'copied' ? '' : 'gone'}>
                Copied{' '}
                <svg class="tick" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 6.5l3 3 5-6" />
                </svg>
            </span>
            <span class={shown === 'failed' ? '' : 'gone'}>Not copied</span>
        </button>
    )
}

/** `run` gives the saved-run record (the address and the moves) as text, for a bug report: replaying it rebuilds the run. */
export function SeedLine({ state, run }: { state: GameState; run?: () => string }) {
    const link = `${globalThis.location?.origin ?? ''}${globalThis.location?.pathname ?? ''}${shareQuery(state.config, state.seed)}`
    return (
        <p class="rules">
            Mode <code>{state.mode}</code>, seed <code>{state.seed}</code> <CopyButton label="Copy seed" text={() => String(state.seed)} />{' '}
            <CopyButton label="Copy link" text={() => link} />
            {run ? (
                <>
                    {' '}
                    <CopyButton
                        label="Copy run"
                        text={run}
                        title="Copies the link and every move of this run, to replay it for a bug report."
                    />
                </>
            ) : null}
        </p>
    )
}

/** What kind of run this is: the mode, its goal and length, the generator settings of a custom run, and the seed. */
export function RunDialog({
    state,
    run,
    onLoad,
    onEdit,
    onClose,
}: {
    state: GameState
    run: () => string
    onLoad: () => void
    onEdit: () => void
    onClose: () => void
}) {
    const level = state.goal === null ? -1 : GOALS.indexOf(state.goal)
    return (
        <Modal onClose={onClose}>
            <h2>
                {runName(state.config)}
                {state.config.id !== 'long' && level >= 0 ? ` · Level ${level + 1}` : ''}
            </h2>
            <p>
                <Rich
                    text={
                        state.goal === null
                            ? `${state.maxTurns} turns, the highest hearts wins.`
                            : `Goal: ${state.goal} ♥ in ${state.maxTurns} turns.`
                    }
                />
            </p>
            {state.config.description ? <p class="rules">Generator: {state.config.description}.</p> : null}
            <p>
                <button
                    type="button"
                    class="b alt"
                    onClick={onEdit}
                    title="Opens the generator editor with these settings. Back returns to the run."
                >
                    Open in the generator editor…
                </button>
            </p>
            <p>
                <button type="button" class="b alt" onClick={onLoad} title="Replaces this run with a pasted saved or bot replay.">
                    Paste replay…
                </button>
            </p>
            <SeedLine state={state} run={run} />
        </Modal>
    )
}

/** What a paste box says after a try: a refusal, or news of what it did. */
export interface PasteFeedback {
    message: string
    ok: boolean
}

interface PasteDialogProps {
    title: string
    hint: string
    ariaLabel: string
    placeholder: string
    button: string
    onSubmit: (text: string) => PasteFeedback | null
    onClose: () => void
}

function PasteDialog({ title, hint, ariaLabel, placeholder, button, onSubmit, onClose }: PasteDialogProps) {
    const [text, setText] = useState('')
    const [feedback, setFeedback] = useState<PasteFeedback | null>(null)
    return (
        <Modal onClose={onClose}>
            <h2>{title}</h2>
            <p class="rules">{hint}</p>
            <textarea
                name="paste"
                aria-label={ariaLabel}
                rows={8}
                value={text}
                onInput={(e) => setText(e.currentTarget.value)}
                placeholder={placeholder}
            />
            {feedback ? <p class={feedback.ok ? 'rules' : 'replaces'}>{feedback.message}</p> : null}
            <p>
                <button type="button" class="b" onClick={() => setFeedback(onSubmit(text))} disabled={!text.trim()}>
                    {button}
                </button>
            </p>
        </Modal>
    )
}

export function LoadRunDialog({ onLoad, onClose }: { onLoad: (text: string) => string | null; onClose: () => void }) {
    const submit = (text: string): PasteFeedback | null => {
        const error = onLoad(text)
        return error === null ? null : { message: error, ok: false }
    }
    return (
        <PasteDialog
            title="Paste replay"
            hint="Paste a saved run or bot replay as JSON. This replaces the run in progress."
            ariaLabel="Replay JSON"
            placeholder='{"version":"…","query":"?…","moves":[…]}'
            button="Load replay"
            onSubmit={submit}
            onClose={onClose}
        />
    )
}

export function LoadResultsDialog({ onImport, onClose }: { onImport: (text: string) => PasteFeedback; onClose: () => void }) {
    return (
        <PasteDialog
            title="Paste results"
            hint="Paste results copied from another device. The better record of each goal is kept, and nothing is removed."
            ariaLabel="Results JSON"
            placeholder='{"results":{…}}'
            button="Import results"
            onSubmit={onImport}
            onClose={onClose}
        />
    )
}

export function AboutDialog({ state, onClose }: { state?: GameState | undefined; onClose: () => void }) {
    return (
        <Modal onClose={onClose}>
            <h2>About Heartrow</h2>
            <p class="rules">Version {__APP_VERSION__}</p>
            <p>
                <Rich text="Heartrow is a small, single-player roguelike deckbuilder. Click a hand card to play it, or a recruit row card to buy it. Recruits cost gold ●, go to your discard and work whenever you draw them. Enemies cost power ⚔: defeating one gives its hearts ♥ and effects once, and if one falls off the right edge you lose that many." />
            </p>
            <p>
                Standard levels last 24 turns. Long Run lasts 42 turns and records a high score instead of ending when you reach a heart
                target. Its costs and enemy pressure increase after turn 24.
            </p>
            <p>
                Every card is generated as it appears. Moss leans gold and rewards a larger deck, Ember leans power and enemies, Tide leans
                draw, exile, and hearts.
            </p>
            <p class="rules">
                Standard can produce 11,872 distinct recruits and 561 distinct enemies. Custom generators change the card pool and its
                variety.
            </p>
            {state ? <SeedLine state={state} /> : null}
        </Modal>
    )
}

export function LogDialog({
    state,
    history,
    run,
    onSummary,
    onClose,
}: {
    state: GameState
    history: string[]
    run: () => string
    onSummary: () => void
    onClose: () => void
}) {
    return (
        <Modal onClose={onClose}>
            <h2>Log (newest first)</h2>
            <SeedLine state={state} run={run} />
            <p>
                <button
                    type="button"
                    class="b alt small"
                    onClick={onSummary}
                    title="The figures of this run so far, or of the finished run."
                >
                    Run summary…
                </button>
            </p>
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

/** The labelled figures of a run, in the order the summary lists them. */
function runFacts(state: GameState, moves: readonly Move[]): [label: string, value: string][] {
    const s = state.stats
    const pace = moveFacts(moves)
    return [
        ['Defeated', String(s.kills)],
        ['Recruited', String(s.recruited)],
        ['Exiled', String(s.exiled)],
        ['Lost to escapes', `${s.lostToEscapes} ♥`],
        ['Wasted gold', `${s.wastedGold} ●`],
        ['Wasted power', `${s.wastedPower} ⚔`],
        ['Flushes left', String(state.flushes)],
        ...(pace
            ? ([
                  ['Moves', String(pace.total)],
                  ['Moves per turn', pace.perTurn],
                  ['Busiest turn', `${pace.busiest} (T${pace.busiestTurn})`],
              ] as [string, string][])
            : []),
    ]
}

/** Opens by itself when a run ends: how it ended, where the hearts came from, and the figures of the run. */
export function SummaryDialog({ state, moves, onClose }: { state: GameState; moves: readonly Move[]; onClose: () => void }) {
    const sources = heartsBreakdown(state)
    const largest = Math.max(1, ...sources.map((source) => source.amount))
    return (
        <Modal onClose={onClose}>
            <h2>Run summary</h2>
            <p class={`outcome ${state.status}`}>
                <Rich text={outcomeLine(state) ?? `So far: ${state.hearts} ♥ on turn ${state.turn}.`} />
            </p>
            {sources.length > 0 ? (
                <section>
                    <h3>Hearts from</h3>
                    <ul class="bars">
                        {sources.map(({ name, amount }) => (
                            <li key={name}>
                                <span class="bar-name">{name}</span>
                                <span class="bar-track">
                                    <span class="bar-fill" style={{ width: `${(amount / largest) * 100}%` }} />
                                </span>
                                <span class="bar-value">
                                    <Rich text={`${amount} ♥`} />
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
            <section>
                <h3>Run</h3>
                <dl class="facts">
                    {runFacts(state, moves).map(([label, value]) => (
                        <div key={label} class="fact">
                            <dt>{label}</dt>
                            <dd>
                                <Rich text={value} />
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
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
    results,
    onPasteResults,
    onClose,
}: {
    settings: Settings
    onChange: (s: Settings) => void
    /** The results as text, to copy to another device. */
    results: () => string
    onPasteResults: () => void
    onClose: () => void
}) {
    return (
        <Modal onClose={onClose}>
            <h2>Settings</h2>
            <div class="col">
                <label>
                    Theme{' '}
                    <select
                        name="theme"
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
                        name="animations"
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
                    <select name="cardStyle" value={settings.skin} onChange={(e) => onChange({ ...settings, skin: e.currentTarget.value })}>
                        {SKINS.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </label>
                <p class="rules">Animations are always off when your system asks for reduced motion.</p>
                <p class="rules">
                    Challenge results{' '}
                    <CopyButton label="Copy results" text={results} title="Copies your results to paste on another device." />{' '}
                    <button type="button" class="b alt small" onClick={onPasteResults} title="Merges results copied from another device.">
                        Paste results…
                    </button>
                </p>
            </div>
        </Modal>
    )
}

import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'
import { GOALS, LONG_MODE } from '../../core'
import type { ModeConfig } from '../../core'
import { LONG_GOAL, resultOf, selectedGoal } from './challenges'
import type { Challenge, ChallengeView, Result, Results } from './challenges'
import { Glyph } from './Glyph'
import { Rich } from './Rich'
import { ResultNote } from './ResultNote'

/** The row counts as stopped when it has not scrolled for this long. */
const SCROLL_STOP_MS = 120

/** A mouse press that moves less than this is still a click. */
const CLICK_SLOP_PX = 5

/** One star per goal, filled when won. Long Run fills once it was played. */
function Stars({ challenge, results }: { challenge: Challenge; results: Results }) {
    if (!challenge.tracked) return <div class="stars" />
    const goals = challenge.hasLongRun ? [...GOALS.keys(), LONG_GOAL] : [...GOALS.keys()]
    const won = goals.map((goal) => {
        const result = resultOf(results, challenge.id, goal)
        return goal === LONG_GOAL ? result.best !== null : result.won
    })
    const count = won.filter(Boolean).length
    return (
        <div class="stars" role="img" aria-label={`${count} of ${goals.length} goals done`}>
            {won.map((on, i) => (
                <Glyph key={i} name={on ? 'star' : 'star-outline'} />
            ))}
        </div>
    )
}

/**
 * The cards: a scroll-snapping row, so touch and the wheel are the browser's own. A mouse drag moves the row and lets the
 * browser snap it on release. `index` is the card in the middle once the row stops, and a change of `index` from outside
 * scrolls to it. Reporting only when the row stops keeps a jump over several cards from flickering through the ones in between.
 */
function Cards({
    challenges,
    results,
    index,
    onIndex,
}: {
    challenges: Challenge[]
    results: Results
    index: number
    onIndex: (i: number) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const stopTimer = useRef(0)
    const drag = useRef<{ startX: number; startScroll: number } | null>(null)
    const dragged = useRef(false)

    const stepOf = (el: HTMLDivElement): number => {
        const first = el.children[0] as HTMLElement | undefined
        const second = el.children[1] as HTMLElement | undefined
        return (first && second ? second.offsetLeft - first.offsetLeft : el.clientWidth) || 1
    }
    const clampIndex = (i: number) => Math.max(0, Math.min(challenges.length - 1, i))
    const nearest = (el: HTMLDivElement) => clampIndex(Math.round(el.scrollLeft / stepOf(el)))

    // The first position is set at once, so a screen that is shown again opens on the card it was left on.
    useLayoutEffect(() => {
        const el = ref.current
        if (el) el.scrollLeft = index * stepOf(el)
    }, [])

    useEffect(() => {
        const el = ref.current
        if (el && nearest(el) !== index) el.scrollTo?.({ left: index * stepOf(el), behavior: 'smooth' })
    }, [index])

    useEffect(() => () => clearTimeout(stopTimer.current), [])

    const onDown = (e: PointerEvent) => {
        const el = ref.current
        dragged.current = false
        if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
        el.setPointerCapture(e.pointerId)
        el.style.scrollSnapType = 'none'
        drag.current = { startX: e.clientX, startScroll: el.scrollLeft }
    }
    const onMove = (e: PointerEvent) => {
        const el = ref.current
        const d = drag.current
        if (!el || !d) return
        if (Math.abs(e.clientX - d.startX) > CLICK_SLOP_PX) dragged.current = true
        el.scrollLeft = d.startScroll - (e.clientX - d.startX)
    }
    // A click on a card that is not in the middle brings it there. A drag that ends over a card is not a click on it.
    // The slide is found by position, because a captured mouse sends the click to the row and not to the card under it.
    const onClick = (e: MouseEvent) => {
        const el = ref.current
        if (!el || dragged.current) return
        const hit = [...el.children].findIndex((slide) => {
            const box = slide.getBoundingClientRect()
            return e.clientX >= box.left && e.clientX <= box.right
        })
        if (hit >= 0 && hit !== index) onIndex(hit)
    }
    const onUp = () => {
        const el = ref.current
        if (!el || !drag.current) return
        drag.current = null
        // Snapping back on makes the browser settle on the nearest card. The scroll is the fallback for one that does not.
        el.style.scrollSnapType = ''
        el.scrollTo?.({ left: nearest(el) * stepOf(el), behavior: 'smooth' })
    }

    const onScroll = () => {
        clearTimeout(stopTimer.current)
        stopTimer.current = window.setTimeout(() => {
            const el = ref.current
            if (el && nearest(el) !== index) onIndex(nearest(el))
        }, SCROLL_STOP_MS)
    }

    return (
        <div
            ref={ref}
            class="cards-scroll"
            onScroll={onScroll}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClick={onClick}
        >
            {challenges.map((c) => (
                <div class="slide" key={c.id} aria-label={c.name} style={{ '--accent': c.accent }}>
                    <div class="slide-icon">
                        <Glyph name={c.icon} />
                    </div>
                    <div class="slide-name">{c.name}</div>
                    <p class="slide-blurb">
                        <Rich text={c.blurb} />
                    </p>
                    <Stars challenge={c} results={results} />
                </div>
            ))}
        </div>
    )
}

/** Round miniature icons, one per challenge, that shrink to fit when there are many. Tapping one scrolls the cards to it. */
function IconDots({ challenges, index, onJump }: { challenges: Challenge[]; index: number; onJump: (i: number) => void }) {
    return (
        <nav class="dots" aria-label="Challenges">
            {challenges.map((c, i) => (
                <button
                    key={c.id}
                    type="button"
                    class={`dot${i === index ? ' on' : ''}`}
                    title={c.name}
                    aria-label={c.name}
                    aria-current={i === index}
                    onClick={() => onJump(i)}
                >
                    <Glyph name={c.icon} />
                </button>
            ))}
        </nav>
    )
}

function GoalRow({
    label,
    detail,
    result,
    isLong,
    selected,
    onSelect,
}: {
    label: string
    detail: string
    result: Result | null
    isLong: boolean
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            class={`goalrow${selected ? ' on' : ''}${result?.won && !isLong ? ' won' : ''}`}
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
        >
            <span class="radio" />
            <span class="goalrow-text">
                <span class="goalrow-label">{label}</span>
                <span class="goalrow-detail">
                    <Rich text={detail} />
                </span>
            </span>
            {result ? (
                <span class="goalrow-result">
                    <ResultNote result={result} isLong={isLong} />
                </span>
            ) : null}
        </button>
    )
}

function goalLabel(goal: number): string {
    return goal === LONG_GOAL ? 'Long Run' : `Level ${goal + 1}`
}

/** The goals of one challenge, in a list that scrolls, so any number of goals fits. */
function GoalList({
    challenge,
    results,
    selected,
    onSelect,
    onEdit,
}: {
    challenge: Challenge
    results: Results
    selected: number
    onSelect: (goal: number) => void
    onEdit: () => void
}) {
    const goals = challenge.hasLongRun ? [...GOALS.keys(), LONG_GOAL] : [...GOALS.keys()]
    return (
        <div class="goals" role="radiogroup" aria-label="Goal">
            {goals.map((goal) => {
                const isLong = goal === LONG_GOAL
                const mode: ModeConfig = isLong ? LONG_MODE : challenge.mode(goal)
                const detail = isLong ? `No target, ${mode.turns} turns, scored by hearts` : `${mode.goal} ♥ in ${mode.turns} turns`
                return (
                    <GoalRow
                        key={goal}
                        label={goalLabel(goal)}
                        detail={detail}
                        result={challenge.tracked ? resultOf(results, challenge.id, goal) : null}
                        isLong={isLong}
                        selected={selected === goal}
                        onSelect={() => onSelect(goal)}
                    />
                )
            })}
            {challenge.tracked ? null : (
                <button type="button" class="goalrow edit" onClick={onEdit}>
                    <span class="goalrow-text">
                        <span class="goalrow-label">Generator</span>
                        <span class="goalrow-detail">{challenge.mode(0).description}</span>
                    </span>
                    <span class="goalrow-result">
                        Edit
                        <Glyph name="chevron" />
                    </span>
                </button>
            )}
        </div>
    )
}

export interface ChallengeScreenProps {
    challenges: Challenge[]
    results: Results
    /** A run is in progress, and starting a challenge replaces it. */
    replaces: boolean
    onStart: (config: ModeConfig) => void
    /** Opens the generator editor with the custom settings. */
    onEdit: () => void
    onBack: () => void
    /** Where the player was: the card in the middle and the goal picked on each card. Kept by the caller, so leaving and coming back finds the same place. */
    view: ChallengeView
    onView: (view: ChallengeView) => void
}

/** The challenge picker: cards to scroll through, the goals of the current card, and Start pinned at the bottom. */
export function ChallengeScreen({ challenges, results, replaces, onStart, onEdit, onBack, view, onView }: ChallengeScreenProps) {
    const current = challenges[view.index]!
    const selected = selectedGoal(view, results, current.id)
    return (
        <main class="challenges" style={{ '--accent': current.accent }}>
            <header>
                <button type="button" class="b alt" onClick={onBack}>
                    <Glyph name="back" />
                    Back
                </button>
                <h1>Challenges</h1>
            </header>
            <Cards challenges={challenges} results={results} index={view.index} onIndex={(index) => onView({ ...view, index })} />
            <IconDots challenges={challenges} index={view.index} onJump={(index) => onView({ ...view, index })} />
            <GoalList
                challenge={current}
                results={results}
                selected={selected}
                onSelect={(goal) => onView({ ...view, picked: { ...view.picked, [current.id]: goal } })}
                onEdit={onEdit}
            />
            <button type="button" class="b start" onClick={() => onStart(current.mode(selected))}>
                Start {current.name} · {goalLabel(selected)}
            </button>
            {replaces ? <p class="replaces">Starting replaces the run in progress.</p> : null}
        </main>
    )
}

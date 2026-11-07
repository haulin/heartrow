import { GOALS, LONG_MODE, standardMode } from '../../core'
import type { ModeConfig } from '../../core'
import { LONG_GOAL, resultOf } from './challenges'
import type { Results } from './challenges'
import { Glyph } from './Glyph'
import { ResultNote } from './ResultNote'
import { Rich } from './Rich'

const STANDARD = 'standard'

/** The Standard picker: the four levels and Long Run as big buttons that share the screen. More hearts, more pressure. */
export function StandardScreen({
    results,
    replaces,
    onPick,
    onBack,
}: {
    results: Results
    /** A run is in progress, and starting a level replaces it. */
    replaces: boolean
    onPick: (config: ModeConfig) => void
    onBack: () => void
}) {
    const longBest = resultOf(results, STANDARD, LONG_GOAL).best
    return (
        <main class="levelpick">
            <header>
                <button type="button" class="b alt" onClick={onBack}>
                    <Glyph name="back" />
                    Back
                </button>
            </header>
            <h1>Standard</h1>
            <p class="rules">
                The standard game: a fresh river of recruits and enemies, with every card type and effect in play. Choose a goal, and
                collect that many hearts before the turns run out.
            </p>
            {replaces ? <p class="replaces">Picking a level starts a new run and replaces the one in progress.</p> : null}
            <nav class="levels" aria-label="Levels">
                {GOALS.map((_, level) => {
                    const mode = standardMode(level)
                    const result = resultOf(results, STANDARD, level)
                    return (
                        <button
                            key={level}
                            type="button"
                            class={`b level l${level}${result.won ? ' won' : ''}`}
                            onClick={() => onPick(mode)}
                        >
                            <span class="lv">Level {level + 1}</span>
                            <span class="goal">
                                <Rich text={`${mode.goal} ♥`} />
                            </span>
                            <span class="sub">
                                <Rich text={`in ${mode.turns} turns`} />
                                {result.best === null ? null : (
                                    <>
                                        {' · '}
                                        <ResultNote result={result} isLong={false} />
                                    </>
                                )}
                            </span>
                        </button>
                    )
                })}
                <button type="button" class="b level long" onClick={() => onPick(LONG_MODE)}>
                    <span class="lv">Long Run</span>
                    <span class="goal">
                        <Rich text={longBest === null ? `${LONG_MODE.turns} turns` : `${longBest} ♥`} />
                    </span>
                    <span class="sub">
                        <Rich text={longBest === null ? 'no target, high score' : `best of ${LONG_MODE.turns} turns, no target`} />
                    </span>
                </button>
            </nav>
        </main>
    )
}

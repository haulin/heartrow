import { GOALS, LONG_GOAL, standardRun } from '../../core'
import type { ModeConfig } from '../../core'
import { resultOf } from './challenges'
import type { Results } from './challenges'
import { Glyph } from './Glyph'
import { ResultNote } from './ResultNote'
import { Rich } from './Rich'
import { goalLine } from './text'

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
                {GOALS.map((goal, level) => {
                    const mode = standardRun(level)
                    const result = resultOf(results, STANDARD, level)
                    return (
                        <button
                            key={goal.key}
                            type="button"
                            class={`b level ${level === LONG_GOAL ? 'long' : `l${level}`}${result.won ? ' won' : ''}`}
                            onClick={() => onPick(mode)}
                        >
                            <span class="lv">{goal.name}</span>
                            <span class="sub">
                                <Rich text={goalLine(goal)} />
                            </span>
                            <span class="result">
                                <ResultNote result={result} />
                            </span>
                        </button>
                    )
                })}
            </nav>
        </main>
    )
}

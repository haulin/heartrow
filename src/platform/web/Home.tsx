import { GOALS, LONG_MODE, standardMode } from '../../core'
import type { ModeConfig } from '../../core'
import { Rich } from './Rich'

/** The level picker: three big buttons that share the screen. More hearts, more pressure. */
export function StandardScreen({
    replaces,
    onPick,
    onBack,
}: {
    /** A run is in progress, and starting a level replaces it. */
    replaces: boolean
    onPick: (config: ModeConfig) => void
    onBack: () => void
}) {
    return (
        <main class="levelpick">
            <header>
                <button type="button" class="b alt" onClick={onBack}>
                    ← Back
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
                    const m = standardMode(level)
                    return (
                        <button key={level} type="button" class={`b level l${level}`} onClick={() => onPick(m)}>
                            <span class="lv">Level {level + 1}</span>
                            <span class="goal">
                                <Rich text={`${m.goal} ♥`} />
                            </span>
                            <span class="sub">in {m.turns} turns</span>
                        </button>
                    )
                })}
            </nav>
        </main>
    )
}

export interface HomeProps {
    canResume: boolean
    onResume: () => void
    onStandard: () => void
    onLong: (config: ModeConfig) => void
    onCustom: () => void
    onSettings: () => void
    onAbout: () => void
}

/** The home screen. Standard and Custom open their own screens; Long Run starts at once. */
export function Home({ canResume, onResume, onStandard, onLong, onCustom, onSettings, onAbout }: HomeProps) {
    return (
        <main class="home">
            <h1>Heartrow</h1>
            <p class="rules">Recruit from the river, defeat enemies, and collect hearts before the turns run out.</p>
            <nav class="col" aria-label="Main menu">
                {canResume ? (
                    <button type="button" class="b" onClick={onResume}>
                        Resume game
                    </button>
                ) : null}
                <button type="button" class={canResume ? 'b alt' : 'b'} onClick={onStandard}>
                    Standard
                </button>
                <button type="button" class="b alt" onClick={() => onLong(LONG_MODE)}>
                    <Rich text={`Long Run: ${LONG_MODE.turns} turns, high score`} />
                </button>
                <button type="button" class="b alt" onClick={onCustom}>
                    Custom generator…
                </button>
                <button type="button" class="b alt" onClick={onSettings}>
                    Settings
                </button>
                <button type="button" class="b alt" onClick={onAbout}>
                    About
                </button>
            </nav>
        </main>
    )
}

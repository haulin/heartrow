export interface HomeProps {
    canResume: boolean
    onResume: () => void
    onStandard: () => void
    onChallenges: () => void
    onSettings: () => void
    onAbout: () => void
}

/** The home screen. Standard (with Long Run) is the plain way to start; Challenges has the generator presets and Custom. */
export function Home({ canResume, onResume, onStandard, onChallenges, onSettings, onAbout }: HomeProps) {
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
                <button type="button" class="b alt" onClick={onChallenges}>
                    Challenges
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

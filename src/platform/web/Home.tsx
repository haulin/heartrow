import { LONG_MODE, standardMode } from '../../core'
import type { ModeConfig } from '../../core'
import { Modal } from './Dialogs'
import { Rich } from './Rich'

const levelLabel = (level: number): string => {
    const m = standardMode(level)
    return `Level ${level + 1}: ${m.goal} ♥ in ${m.turns} turns`
}

export function StandardDialog({ onPick, onClose }: { onPick: (config: ModeConfig) => void; onClose: () => void }) {
    return (
        <Modal onClose={onClose}>
            <h2>Standard</h2>
            <div class="col">
                {[0, 1, 2].map((level) => (
                    <button key={level} type="button" class="b alt" onClick={() => onPick(standardMode(level))}>
                        <Rich text={levelLabel(level)} />
                    </button>
                ))}
            </div>
        </Modal>
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

/** The home screen. The setup for each mode is still a dialog opened from here. */
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

import type { Result } from './challenges'
import { Glyph } from './Glyph'
import { Rich } from './Rich'

/** What the player did on a goal: a star, the hearts and the earliest turn for a win, the best hearts otherwise, or "not played". */
export function ResultNote({ result, isLong }: { result: Result; isLong: boolean }) {
    if (result.best === null) return <span class="note">not played</span>
    const hearts = <Rich text={`${result.best} ♥`} />
    if (result.won && !isLong) {
        return (
            <span class="note won">
                <span class="note-main">
                    <Glyph name="star" /> {hearts}
                </span>
                {result.turn === null ? null : (
                    <span
                        class="note-sub"
                        title="Your fastest win of this goal. It may be a different game than the one with the most hearts."
                    >
                        fastest: turn {result.turn}
                    </span>
                )}
            </span>
        )
    }
    return <span class="note">best {hearts}</span>
}

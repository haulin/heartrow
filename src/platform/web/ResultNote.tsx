import type { Result } from './challenges'
import { Glyph } from './Glyph'
import { Rich } from './Rich'

/** What the player did on a goal: a star and the hearts for a win, the best hearts otherwise, or "not played". */
export function ResultNote({ result, isLong }: { result: Result; isLong: boolean }) {
    if (result.best === null) return <span class="note">not played</span>
    const hearts = <Rich text={`${result.best} ♥`} />
    if (result.won && !isLong) {
        return (
            <span class="note won">
                <Glyph name="star" /> {hearts}
            </span>
        )
    }
    return <span class="note">best {hearts}</span>
}

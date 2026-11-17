import type { TurnHearts } from './text'

const WIDTH = 300
const HEIGHT = 120
const PAD = 6

/** The y position of `value` on a scale that runs from `low` (bottom) to `high` (top). */
function plotY(value: number, low: number, high: number): number {
    const span = Math.max(1, high - low)
    return HEIGHT - PAD - ((value - low) / span) * (HEIGHT - 2 * PAD)
}

function describe(turns: readonly TurnHearts[]): string {
    const best = turns.reduce((top, turn) => (turn.gained > top.gained ? turn : top))
    return `Hearts per turn over ${turns.length} turns: ${turns.at(-1)!.total} hearts at the end; the best turn was turn ${best.turn} with ${best.gained}.`
}

/** A bar for what each turn added, on its own scale, and a line for the running total on another. */
export function HeartsChart({ turns }: { turns: readonly TurnHearts[] }) {
    const slot = WIDTH / turns.length
    const lowest = Math.min(0, ...turns.map((turn) => turn.gained))
    const highest = Math.max(1, ...turns.map((turn) => turn.gained))
    const zero = plotY(0, lowest, highest)
    const topTotal = Math.max(1, ...turns.map((turn) => turn.total))
    const lowTotal = Math.min(0, ...turns.map((turn) => turn.total))
    const line = turns.map((turn, i) => `${(i + 0.5) * slot},${plotY(turn.total, lowTotal, topTotal)}`).join(' ')
    return (
        <figure class="hearts-chart">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={describe(turns)} preserveAspectRatio="none">
                <line class="chart-base" x1="0" x2={WIDTH} y1={zero} y2={zero} />
                {turns.map((turn, i) => {
                    const y = plotY(turn.gained, lowest, highest)
                    return (
                        <rect
                            key={turn.turn}
                            class={turn.gained < 0 ? 'chart-loss' : 'chart-gain'}
                            x={i * slot + slot * 0.15}
                            width={slot * 0.7}
                            y={Math.min(y, zero)}
                            height={Math.abs(zero - y)}
                        >
                            <title>{`Turn ${turn.turn}: ${turn.gained >= 0 ? '+' : ''}${turn.gained} hearts, ${turn.total} in all`}</title>
                        </rect>
                    )
                })}
                <polyline class="chart-total" points={line} vector-effect="non-scaling-stroke" />
            </svg>
            <figcaption>Bars: hearts each turn added. Line: hearts so far.</figcaption>
        </figure>
    )
}

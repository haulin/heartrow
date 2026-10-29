import { Rich } from '../../Rich'
import type { CardSkinProps } from '../types'

const CURRENCY_CLASS = { gold: 'g', power: 'p', hearts: 'h' } as const

const LOCK_PATH =
    'M65 330h200c8.284 0 15-6.716 15-15V145c0-8.284-6.716-15-15-15h-15V85C250 38.131 211.869 0 165 0S80 38.131 80 85v45H65c-8.284 0-15 6.716-15 15v170c0 8.284 6.716 15 15 15zm115-95.014V255c0 8.284-6.716 15-15 15s-15-6.716-15-15v-20.014c-6.068-4.565-10-11.824-10-19.986 0-13.785 11.215-25 25-25s25 11.215 25 25c0 8.162-3.932 15.421-10 19.986zM110 85c0-30.327 24.673-55 55-55s55 24.673 55 55v45H110V85z'

export function DefaultCard({ view, onActivate }: CardSkinProps) {
    const cls = [
        'card',
        view.type,
        view.kind === 'enemy' ? 'enemy' : '',
        view.zone === 'row' && !view.affordable ? 'no' : '',
        view.edge === 'enemy' ? 'edge' : view.edge === 'rim' ? 'rim' : '',
        view.played ? 'played' : '',
    ]
        .filter(Boolean)
        .join(' ')

    const inner = (
        <>
            <div class="top">
                {view.cost ? (
                    <span class={CURRENCY_CLASS[view.cost.currency]}>
                        <Rich text={view.cost.text} />
                    </span>
                ) : (
                    <span />
                )}
                <em>{view.typeName}</em>
            </div>
            {view.edge ? (
                <span class="lock" role="img" title="This card stays when you redraw" aria-label="This card stays when you redraw">
                    <svg viewBox="0 0 330 330" aria-hidden="true">
                        <path fill="currentColor" d={LOCK_PATH} />
                    </svg>
                </span>
            ) : null}
            <svg class="art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {view.art.map((shape, i) => {
                    const Tag = shape.tag
                    return <Tag key={i} {...shape.attrs} />
                })}
            </svg>
            <div class="bd">
                {view.gains.map((g) => (
                    <b key={g.currency} class={CURRENCY_CLASS[g.currency]}>
                        <Rich text={g.text} />
                    </b>
                ))}
                {view.effects.map((line, i) => (
                    <i key={i} class={view.effectsAreDefeat ? 'fe' : undefined}>
                        <Rich text={line} />
                    </i>
                ))}
                {view.retain ? <i>{view.retain}</i> : null}
            </div>
        </>
    )

    if (!onActivate) {
        return (
            <div class={cls} role="img" aria-label={view.label} data-card-id={view.id}>
                {inner}
            </div>
        )
    }
    return (
        <button
            type="button"
            class={cls}
            data-card-id={view.id}
            aria-label={view.label}
            aria-disabled={view.zone === 'row' ? (!view.affordable ? 'true' : undefined) : view.played ? 'true' : undefined}
            aria-describedby={view.pendingExile ? 'msg' : undefined}
            title={view.title || undefined}
            onClick={onActivate}
        >
            {inner}
        </button>
    )
}

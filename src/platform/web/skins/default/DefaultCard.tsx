import { Rich } from '../../Rich'
import type { CardSkinProps } from '../types'

const CURRENCY_CLASS = { gold: 'g', power: 'p', hearts: 'h' } as const

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
                <span class="lock" role="img" title="This card stays when you redraw" aria-label="This card stays when you redraw"></span>
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
                {view.retain ? (
                    <i>
                        <Rich text={view.retain} />
                    </i>
                ) : null}
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

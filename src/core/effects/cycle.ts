import { RETAIN_OFTEN } from '../generator/budget'
import { drawCards } from '../state'
import type { EffectContext, EffectDef } from './types'

export function discardUnplayed({ state, card, events }: EffectContext, purge: boolean): void {
    const out = state.hand.filter((other) => !other.played && other !== card && (purge || !other.retain))
    state.hand = state.hand.filter((other) => !out.includes(other))
    drawCards(state, out.length, events, 'cycle')
    state.discard.push(...out)
    events.push({ type: 'cycled', count: out.length, purge })
}

export const cycle: EffectDef = {
    id: 'cycle',
    price: 1.5,
    text: 'Discard your unplayed cards except Retain ones, draw as many',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    apply(ctx) {
        discardUnplayed(ctx, false)
    },
}

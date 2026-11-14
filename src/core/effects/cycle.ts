import { RETAIN_OFTEN } from '../generator/budget'
import { drawCards } from '../state'
import type { EffectContext, EffectDef } from './types'

/**
 * Draws as many cards as the deck and the discard pile hold, then discards the hand cards, then draws the rest. The cards just discarded
 * can only come back to make up a shortfall, so a Redraw never hands you the same cards while other cards are left.
 */
export function discardUnplayed({ state, card, events }: EffectContext, redraw: boolean): void {
    const out = state.hand.filter((other) => !other.played && other !== card && (redraw || !other.retain))
    state.hand = state.hand.filter((other) => !out.includes(other))
    const fresh = Math.min(out.length, state.deck.length + state.discard.length)
    drawCards(state, fresh, events, 'cycle')
    state.discard.push(...out)
    drawCards(state, out.length - fresh, events, 'cycle')
    events.push({ type: 'cycled', count: out.length, redraw })
}

export const cycle: EffectDef = {
    id: 'cycle',
    price: 1.5,
    family: 'cards',
    describe: () => 'Cycle unplayed cards except Retain ones',
    enemies: true,
    lean: ['tide'],
    retain: RETAIN_OFTEN,
    apply(ctx) {
        discardUnplayed(ctx, false)
    },
}

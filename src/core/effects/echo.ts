import { ECHO_PRICE, RETAIN_SOMETIMES } from '../generator/budget'
import { cloneCard } from '../state'
import { EFFECT_BY_ID } from './index'
import type { EffectDef } from './types'

export const echo: EffectDef = {
    id: 'echo',
    family: 'repeat',
    price: ECHO_PRICE,
    describe: () => 'Echo the last card played or enemy defeated',
    enemies: false,
    lean: [],
    retain: RETAIN_SOMETIMES,
    apply(ctx) {
        const { state, events, gain } = ctx
        const previous = state.lastUsed
        events.push({ type: 'echoed', card: previous ? cloneCard(previous) : null })
        if (!previous) return
        gain('gold', previous.gold)
        gain('power', previous.power)
        gain('hearts', previous.hearts)
        // An echoed Echo gives its gains again but does not look further back. The card counts as played for Bond.
        for (const id of previous.fx) if (id !== 'echo') EFFECT_BY_ID[id].apply({ ...ctx, card: previous, hadType: true })
    },
}

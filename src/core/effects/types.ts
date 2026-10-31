import type { Rng } from '../rng'
import type { Card, Colour, Currency, EffectId, EffectNeed, GameEvent, GameState } from '../types'

export interface EffectContext {
    state: GameState
    card: Card
    events: GameEvent[]
    /** `play`: resolved from a hand card. `defeat`: resolved when an enemy is defeated. */
    source: 'play' | 'defeat'
    /** A card of the same type was already played earlier this turn. */
    hadType: boolean
    /** Enemies in the row before the defeated enemy left it. */
    rowEnemies: number
    /** Adds to the state, and to the defeat summary when the source is a defeat. */
    gain: (resource: Currency | 'hearts', amount: number) => void
}

export interface EffectDef {
    id: EffectId
    /** Budget price. Scaled by the draw count when `perDrawCard` is set. */
    price: number
    perDrawCard?: true
    text: string
    /** What a generator must allow for the effect to make sense. The generator skips the effect when any need is off. */
    needs?: readonly EffectNeed[]
    /** Allowed as an enemy defeat effect. */
    enemies: boolean
    /** Colours whose effect pool favours this effect. */
    lean: readonly Colour[]
    /** Colours that get one extra copy in the pool. */
    extraFor?: readonly Colour[]
    /** Eligible for the Retain roll. */
    retainable?: true
    /** Rolls effect parameters onto the card and returns the total budget the effect consumes. */
    roll?(rng: Rng, card: Card, budget: number): number
    apply(ctx: EffectContext): void
}

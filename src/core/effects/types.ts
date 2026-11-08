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

export interface EffectRollContext {
    currencies: readonly Currency[]
    hearts: boolean
}

/** Effects of one shape with different parameters, kept together in the generator list. An effect has one family. */
export type EffectFamily = 'cards' | 'count' | 'streak' | 'resource' | 'price' | 'reap' | 'river' | 'repeat'

export interface EffectDef {
    id: EffectId
    family: EffectFamily
    /** Budget price. Scaled by the draw count when `perDrawCard` is set. */
    price: number
    perDrawCard?: true
    /**
     * The one place the effect's sentence is written. With a card it is that card's text (its rolled values); without one it is the
     * sentence for the generator list, with every value the effect can roll in brackets (see `slot` in `wording.ts`).
     */
    describe(card?: Card): string
    /** Acts while an enemy sits in the river, so its text has no "Defeat:" prefix. */
    passive?: true
    /** What a generator must allow for the effect to make sense. The generator skips the effect when any need is off. */
    needs?: readonly EffectNeed[]
    /** Alternative needs: at least one item in the group must be allowed. */
    needsAny?: readonly EffectNeed[]
    /** Allowed as an enemy defeat effect. */
    enemies: boolean
    /** Only enemies may roll it. */
    enemyOnly?: true
    /** Which resource the deck summary counts the effect under: a fixed one, the card's main one, or the one rolled onto the card. No value counts as other. */
    pays?: 'gold' | 'power' | 'hearts' | 'main' | 'rolled'
    /** Colours whose effect pool favours this effect. */
    lean: readonly Colour[]
    /** Colours that get one extra copy in the pool. */
    extraFor?: readonly Colour[]
    /** Retain roll for recruits: budget price and chance. Every effect a recruit can roll sets it. */
    retain?: { readonly price: number; readonly chance: number }
    /** Rolls effect parameters onto the card and returns the total budget the effect consumes. */
    roll?(rng: Rng, card: Card, budget: number, context: EffectRollContext): number
    apply(ctx: EffectContext): void
}

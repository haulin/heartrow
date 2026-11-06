import type { Streams } from './rng'

export type Colour = 'moss' | 'ember' | 'tide'
export type CardType = Colour | 'plain' | 'foe'
export type GeneratorCardType = Colour | 'foe'
export type GeneratorResource = Currency | 'hearts'
/** What a generator must allow for an effect to be worth rolling. `exile` means the exile effect itself is allowed. */
export type EffectNeed = GeneratorResource | GeneratorCardType | 'exile'
export type CardKind = 'recruit' | 'enemy' | 'basic'
export type Currency = 'gold' | 'power'

export interface EffectParams {
    currency?: GeneratorResource
    drawCount?: number
    bondCount?: number
    amount?: number
    perCards?: number
    costPerCards?: number
}

export type EffectId =
    | 'draw'
    | 'flip'
    | 'exile'
    | 'cheap'
    | 'foes'
    | 'all3'
    | 'vault'
    | 'basics'
    | 'pile'
    | 'hoard'
    | 'bulk'
    | 'bond'
    | 'kin'
    | 'weak'
    | 'army'
    | 'cycle'
    | 'purge'
    | 'swap'
    | 'reapG'
    | 'reapP'

export interface Card {
    id: number
    type: CardType
    kind: CardKind
    cost: number
    gold: number
    power: number
    hearts: number
    fx: EffectId[]
    main: Currency
    fxParams?: EffectParams
    retain?: boolean
    played?: boolean
}

export type GameStatus = 'playing' | 'won' | 'lost' | 'finished'

export interface RunStats {
    kills: number
    recruited: number
    exiled: number
    playedCards: number
    lostToEscapes: number
    wastedGold: number
    wastedPower: number
}

export interface GameState {
    mode: string
    config: ModeConfig
    seed: number
    turn: number
    maxTurns: number
    goal: number | null
    status: GameStatus
    goalReached: boolean
    hearts: number
    gold: number
    power: number
    recruitDiscount: number
    enemyDiscount: number
    reapGold: number
    reapPower: number
    redraws: number
    typesPlayed: CardType[]
    pendingExile: boolean
    deck: Card[]
    hand: Card[]
    discard: Card[]
    exile: Card[]
    row: Card[]
    nextCardId: number
    stats: RunStats
    streams: Streams
}

export type Move =
    | { type: 'play'; handIndex: number }
    | { type: 'exile'; handIndex: number }
    | { type: 'exile'; rowIndex: number }
    | { type: 'skipExile' }
    | { type: 'take'; rowIndex: number }
    | { type: 'redraw' }
    | { type: 'endTurn' }

export interface Gains {
    gold: number
    power: number
    hearts: number
}

export type DrawCause = 'effect' | 'cycle' | 'turnStart' | 'setup'

export type RejectReason =
    | 'gameOver'
    | 'pendingExile'
    | 'alreadyPlayed'
    | 'cannotExile'
    | 'cannotAfford'
    | 'noRedraws'
    | 'noSuchCard'
    | 'noExilePending'
    | 'unknownMove'

export type GameEvent =
    | { type: 'rejected'; reason: RejectReason; short?: number; currency?: Currency }
    | { type: 'played'; card: Card; gains: Gains }
    | { type: 'drew'; cardIds: number[]; requested: number; cause: DrawCause }
    | { type: 'reshuffled' }
    | { type: 'flipped'; currency: GeneratorResource; amount: number }
    | { type: 'swapped' }
    | { type: 'cycled'; count: number; purge: boolean }
    | { type: 'exiled'; card: Card }
    | { type: 'exileSkipped' }
    | { type: 'recruited'; card: Card; paid: number }
    | { type: 'defeated'; card: Card; paid: number; gains: Gains }
    | { type: 'rowRefilled'; card: Card }
    | { type: 'rowRedrawn'; cards: Card[]; kept: Card }
    | { type: 'escaped'; card: Card; hearts: number }
    | { type: 'reaped'; hearts: number }
    | { type: 'retained'; count: number }
    | { type: 'turnStarted'; turn: number; redrawGained: boolean }
    | { type: 'goalReached' }
    | { type: 'gameOver'; status: GameStatus }

export interface StepResult {
    state: GameState
    events: GameEvent[]
}

export interface DifficultyStep {
    fromTurn: number
    costBonus: number
    foeChance: number
    cheapChance: number
}

export interface ModeConfig {
    id: string
    name: string
    description?: string
    turns: number
    redrawEvery: number
    goal: number | null
    difficultyCapTurn: number
    steps: DifficultyStep[]
    lateFillerFromTurn: number | null
    starter: StarterSpec
    generator?: GeneratorConfig
}

export interface StarterSpec {
    basicGold: number
    basicPower: number
}

export interface GeneratorConfig {
    allowedTypes: GeneratorCardType[]
    /** What cards and effects may give. Gold is treated as allowed when nothing else is, because recruits cost gold. */
    allowedResources: GeneratorResource[]
    allowedEffects: EffectId[]
}

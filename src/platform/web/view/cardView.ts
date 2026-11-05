import { TYPE_NAMES, canAfford, cardCost, effectText } from '../../../core'
import type { Card, CardKind, CardType, GameState } from '../../../core'
import { spoken } from '../text'
import { cardArt } from './art'
import type { ArtShape } from './art'

export type CardZone = 'row' | 'hand' | 'pile'

export interface GainView {
    currency: 'gold' | 'power' | 'hearts'
    text: string
}

/** Everything a card skin needs. It has no game state and no core imports, so skins stay presentation only. */
export interface CardView {
    id: number
    zone: CardZone
    index: number
    type: CardType
    kind: CardKind
    typeName: string
    cost: { text: string; currency: 'gold' | 'power' } | null
    gains: GainView[]
    effects: string[]
    effectsAreDefeat: boolean
    retain: string | null
    affordable: boolean
    played: boolean
    edge: 'rim' | 'enemy' | null
    pendingExile: boolean
    exileBlocked: boolean
    art: ArtShape[]
    label: string
    title: string
}

const ROW_TITLES = {
    enemy: 'Enemy: defeat it with power. You get its hearts and effects right away, once.',
    recruit: 'Recruit: buy it with gold. It goes to your discard, and its gains and effects happen when you play it from your hand.',
}

export function buildCardView(card: Card, zone: CardZone, index: number, state: GameState): CardView {
    const gains: GainView[] = []
    if (card.gold) gains.push({ currency: 'gold', text: `+${card.gold} ●` })
    if (card.power) gains.push({ currency: 'power', text: `+${card.power} ⚔` })
    if (card.hearts) gains.push({ currency: 'hearts', text: `+${card.hearts} ♥` })

    const lines = effectText(card)
    const retain = card.retain ? (lines.pop() ?? null) : null

    const costValue = zone === 'row' ? cardCost(state, card) : card.cost
    const cost =
        card.kind === 'recruit'
            ? { text: `${costValue} ●`, currency: 'gold' as const }
            : card.kind === 'enemy'
              ? { text: `${costValue} ⚔`, currency: 'power' as const }
              : null

    const affordable = zone === 'row' ? canAfford(state, card) : true
    const isEdge = zone === 'row' && index === state.row.length - 1
    const typeName = TYPE_NAMES[card.type]
    const played = zone === 'hand' && card.played === true
    const canExile = zone === 'hand' || (card.kind === 'recruit' && !isEdge)

    const body = [...gains.map((g) => g.text), ...lines, ...(retain ? [retain] : [])].join(' ')
    const prefix = zone === 'row' ? `${card.kind === 'enemy' ? 'Enemy' : 'Recruit'} ` : ''
    const buy = zone === 'row' ? `${card.kind === 'recruit' ? 'gold ●' : 'power ⚔'} to ${card.kind === 'recruit' ? 'buy' : 'defeat'}. ` : ''
    const exileLabel = state.pendingExile ? (canExile ? ' Select to exile.' : ' Cannot be exiled now.') : ''
    const label = spoken(
        `${prefix}${typeName} card. ${buy}${body}${played ? ' Already played this turn.' : ''}${exileLabel}`.replace(/\s+/g, ' '),
    )

    return {
        id: card.id,
        zone,
        index,
        type: card.type,
        kind: card.kind,
        typeName,
        cost,
        gains,
        effects: lines,
        effectsAreDefeat: card.kind === 'enemy',
        retain,
        affordable,
        played,
        edge: isEdge ? (card.kind === 'enemy' ? 'enemy' : 'rim') : null,
        pendingExile: state.pendingExile && canExile,
        exileBlocked: state.pendingExile && !canExile,
        art: cardArt(card),
        label,
        title: state.pendingExile
            ? canExile
                ? 'Click to exile this card.'
                : 'This card cannot be exiled.'
            : zone === 'row'
              ? card.kind === 'enemy'
                  ? ROW_TITLES.enemy
                  : ROW_TITLES.recruit
              : '',
    }
}

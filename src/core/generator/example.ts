import { standardRun } from '../custom'
import { newGame } from '../moves'
import type { Card, EffectId } from '../types'
import { makeCard } from './make'

/** The effects the compendium shows are rare (about one card in a hundred), so the search gives up only after a long run of cards. */
const MAX_ATTEMPTS = 20000
const TURNS_PER_CYCLE = 24

/**
 * A real generated card that carries `id`, made by the Standard generator for the seed. The same seed gives the same card, and the next seed
 * gives another roll of the effect. The cards come from different turns, so costs and rolls vary.
 */
export function exampleCard(id: EffectId, seed: number): Card | null {
    const { state } = newGame(standardRun(3), seed)
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const card = makeCard(state, (attempt % TURNS_PER_CYCLE) + 1)
        if (card.fx.includes(id)) return card
    }
    return null
}

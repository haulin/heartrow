import type { EffectId } from '../types'
import { all3 } from './all3'
import { army } from './army'
import { basics } from './basics'
import { bond } from './bond'
import { bulk } from './bulk'
import { cheap } from './cheap'
import { flip } from './flip'
import { cycle } from './cycle'
import { draw } from './draw'
import { exile } from './exile'
import { foes } from './foes'
import { hoard } from './hoard'
import { kin } from './kin'
import { pile } from './pile'
import { reapG } from './reapG'
import { reapP } from './reapP'
import { redraw } from './redraw'
import { swap } from './swap'
import { vault } from './vault'
import { weak } from './weak'
import { echo } from './echo'
import { push } from './push'
import { reload } from './reload'
import { shift } from './shift'
import type { EffectDef, EffectFamily } from './types'

export type { EffectContext, EffectDef, EffectFamily } from './types'

/** The families in the order the generator list shows them, with the heading of each. */
export const EFFECT_FAMILIES: readonly { id: EffectFamily; name: string }[] = [
    { id: 'cards', name: 'Cards' },
    { id: 'resource', name: 'Resources' },
    { id: 'count', name: 'Counting cards' },
    { id: 'streak', name: 'Same type' },
    { id: 'price', name: 'Prices' },
    { id: 'reap', name: 'End of turn' },
    { id: 'river', name: 'River' },
    { id: 'repeat', name: 'Repeat' },
]

/** Pool order matters: the generator draws from it in this order. */
export const EFFECTS: readonly EffectDef[] = [
    draw,
    flip,
    exile,
    cheap,
    foes,
    all3,
    vault,
    basics,
    pile,
    hoard,
    bulk,
    bond,
    kin,
    weak,
    army,
    cycle,
    redraw,
    swap,
    reapG,
    reapP,
    reload,
    push,
    shift,
    echo,
]

export const EFFECT_BY_ID = Object.fromEntries(EFFECTS.map((effect) => [effect.id, effect])) as Record<EffectId, EffectDef>

export function effectPrice(id: EffectId, drawCount = 1): number {
    const effect = EFFECT_BY_ID[id]
    return effect.perDrawCard ? effect.price * drawCount : effect.price
}

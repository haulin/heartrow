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
import { purge } from './purge'
import { reapG } from './reapG'
import { reapP } from './reapP'
import { swap } from './swap'
import { vault } from './vault'
import { weak } from './weak'
import type { EffectDef } from './types'

export type { EffectContext, EffectDef } from './types'

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
    purge,
    swap,
    reapG,
    reapP,
]

export const EFFECT_BY_ID = Object.fromEntries(EFFECTS.map((effect) => [effect.id, effect])) as Record<EffectId, EffectDef>

export function effectPrice(id: EffectId, drawCount = 1): number {
    const effect = EFFECT_BY_ID[id]
    return effect.perDrawCard ? effect.price * drawCount : effect.price
}

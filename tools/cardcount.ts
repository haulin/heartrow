import { EFFECTS, createRng, makeCard, nextInt, newGame, standardMode } from '../src/core'
import type { Card, CardKind } from '../src/core'

interface VariantGroup {
    samples: number
    variants: Map<string, number>
}

interface KindCount {
    samples: number
    observed: number
    estimated: number | string
    byCost: Record<string, { samples: number; observed: number; estimated: number | string }>
    distribution: {
        cardsWith: Record<'gold' | 'power' | 'hearts', number>
        units: Record<'gold' | 'power' | 'hearts', number>
        effects: Record<string, number>
    }
}

interface Counts {
    samples: number
    seed: number
    effects: number
    recruit: KindCount
    enemy: KindCount
}

const DEFAULT_SAMPLES = 100_000
const TURN_COUNT = standardMode(0).turns

function cardKey(card: Card): string {
    return JSON.stringify([
        card.type,
        card.kind,
        card.cost,
        card.gold,
        card.power,
        card.hearts,
        card.fx,
        card.main,
        card.fxParams ?? null,
        card.retain ?? false,
    ])
}

function estimate(variants: Map<string, number>): number | string {
    let singletons = 0
    let doubletons = 0
    for (const count of variants.values()) {
        if (count === 1) singletons++
        if (count === 2) doubletons++
    }
    return doubletons ? Math.round(variants.size + (singletons * singletons) / (2 * doubletons)) : `${variants.size} (saturated)`
}

function countKind(groups: Map<number, VariantGroup>, all: Map<string, number>, distribution: KindCount['distribution']): KindCount {
    const byCost: KindCount['byCost'] = {}
    let samples = 0
    for (const [cost, group] of [...groups.entries()].sort(([a], [b]) => a - b)) {
        samples += group.samples
        byCost[cost] = { samples: group.samples, observed: group.variants.size, estimated: estimate(group.variants) }
    }
    return { samples, observed: all.size, estimated: estimate(all), byCost, distribution }
}

export function countCards(samples = DEFAULT_SAMPLES, seed = 1): Counts {
    const state = newGame(standardMode(0), seed).state
    const sampleRng = createRng(seed, 'cardcount')
    const all = new Map<CardKind, Map<string, number>>([
        ['recruit', new Map()],
        ['enemy', new Map()],
    ])
    const byCost = new Map<CardKind, Map<number, VariantGroup>>([
        ['recruit', new Map()],
        ['enemy', new Map()],
    ])
    const distributions: Record<'recruit' | 'enemy', KindCount['distribution']> = {
        recruit: { cardsWith: { gold: 0, power: 0, hearts: 0 }, units: { gold: 0, power: 0, hearts: 0 }, effects: {} },
        enemy: { cardsWith: { gold: 0, power: 0, hearts: 0 }, units: { gold: 0, power: 0, hearts: 0 }, effects: {} },
    }

    for (let i = 0; i < samples; i++) {
        const card = makeCard(state, 1 + nextInt(sampleRng, TURN_COUNT))
        const key = cardKey(card)
        const variants = all.get(card.kind)!
        variants.set(key, (variants.get(key) ?? 0) + 1)
        const costs = byCost.get(card.kind)!
        let group = costs.get(card.cost)
        if (!group) {
            group = { samples: 0, variants: new Map() }
            costs.set(card.cost, group)
        }
        group.samples++
        group.variants.set(key, (group.variants.get(key) ?? 0) + 1)
        if (card.kind === 'basic') continue
        const distribution = distributions[card.kind]
        for (const resource of ['gold', 'power', 'hearts'] as const) {
            distribution.units[resource] += card[resource]
            if (card[resource] > 0) distribution.cardsWith[resource]++
        }
        for (const id of card.fx) distribution.effects[id] = (distribution.effects[id] ?? 0) + 1
    }

    return {
        samples,
        seed,
        effects: EFFECTS.length,
        recruit: countKind(byCost.get('recruit')!, all.get('recruit')!, distributions.recruit),
        enemy: countKind(byCost.get('enemy')!, all.get('enemy')!, distributions.enemy),
    }
}

function print(counts: Counts): void {
    console.log(`samples ${counts.samples}, seed ${counts.seed}, ${counts.effects} effects`)
    for (const kind of ['recruit', 'enemy'] as const) {
        const summary = counts[kind]
        console.log(`${kind} observed ${summary.observed}, estimated total ${summary.estimated}`)
        console.log(
            `  resource cards gold ${summary.distribution.cardsWith.gold} power ${summary.distribution.cardsWith.power} hearts ${summary.distribution.cardsWith.hearts}`,
        )
        console.log(
            `  resource units gold ${summary.distribution.units.gold} power ${summary.distribution.units.power} hearts ${summary.distribution.units.hearts}`,
        )
        console.log(
            `  effects ${
                Object.entries(summary.distribution.effects)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([id, count]) => `${id} ${count}`)
                    .join(', ') || 'none'
            }`,
        )
        console.log('  cost samples observed estimated')
        for (const [cost, row] of Object.entries(summary.byCost)) {
            console.log(
                `  ${cost.padStart(4)} ${String(row.samples).padStart(7)} ${String(row.observed).padStart(8)} ${String(row.estimated).padStart(9)}`,
            )
        }
    }
}

export function main(argv: string[]): void {
    const samplesIndex = argv.indexOf('--samples')
    const seedIndex = argv.indexOf('--seed')
    const samples = samplesIndex >= 0 ? Math.max(1, Math.round(Number(argv[samplesIndex + 1]))) : DEFAULT_SAMPLES
    const seed = seedIndex >= 0 ? Number(argv[seedIndex + 1]) >>> 0 : 1
    const counts = countCards(samples, seed)
    if (argv.includes('--json')) console.log(JSON.stringify(counts, null, 2))
    else print(counts)
}

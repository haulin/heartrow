import { describe, expect, it } from 'vitest'
import { LONG_MODE, PROFILE_IDS, aggregate, makeProfile, runBatch, standardMode } from '../../src/core'
import type { BatchStats, ModeConfig } from '../../src/core'
import baseline from '../baseline.json'

type Metric = { mean: number; sd: number; tolerance: number }
const bots = baseline.bots as unknown as Record<string, Record<string, Record<string, Metric>>>
const GAMES = baseline.meta.gamesPerSeed
const SEEDS = baseline.meta.seeds
const MODE_CONFIGS: Record<string, ModeConfig> = { standard: standardMode(0), long: LONG_MODE }
/** Metrics with zero spread in the baseline (for example the kills of the pacifist) still get a small absolute margin. */
const ABS_FLOOR = 0.05
/** Median and p10 are integers per seed, so a baseline spread of 0 (the standard `none` median is 2 in all five seeds) only means the five seeds landed on the same integer. One step is the smallest meaningful difference. */
const INTEGER_FLOOR = 1
const INTEGER_METRICS = ['medianHearts', 'p10Hearts']
const TOLERANCE_SLACK = Number(process.env.BOT_SLACK ?? 1)

function metrics(s: BatchStats): Record<string, number | null> {
  return {
    meanHearts: s.meanHearts,
    medianHearts: s.medianHearts,
    p10Hearts: s.p10Hearts,
    meanKills: s.meanKills,
    meanLost: s.meanLost,
    meanTurns: s.meanTurns,
    meanBought: s.meanBought,
    meanExiled: s.meanExiled,
    meanCards: s.meanCards,
    goalHitRate: s.goalHitRate,
    meanHeartsT24: s.meanHeartsT24,
  }
}

describe('bot profiles match the v7 prototype baseline', () => {
  for (const [modeId, profiles] of Object.entries(bots)) {
    for (const [profileId, expectedMetrics] of Object.entries(profiles)) {
      it(`${modeId} ${profileId}`, () => {
        expect(PROFILE_IDS).toContain(profileId)
        const perSeed = SEEDS.map((seed) => metrics(aggregate(runBatch(MODE_CONFIGS[modeId]!, () => makeProfile(profileId as (typeof PROFILE_IDS)[number]), GAMES, seed))))
        const failures: string[] = []
        const rows: string[] = []
        for (const [name, expected] of Object.entries(expectedMetrics)) {
          const got = perSeed.reduce((sum, m) => sum + (m[name] ?? 0), 0) / perSeed.length
          const tolerance = Math.max(expected.tolerance * TOLERANCE_SLACK, INTEGER_METRICS.includes(name) ? INTEGER_FLOOR : ABS_FLOOR)
          const ratio = Math.abs(got - expected.mean) / tolerance
          rows.push(`${name.padEnd(13)} port ${got.toFixed(2).padStart(8)} baseline ${expected.mean.toFixed(2).padStart(8)} ± ${tolerance.toFixed(2).padStart(5)} (${(ratio * 100).toFixed(0)}%)`)
          if (ratio > 1) failures.push(`${name}: got ${got.toFixed(3)}, baseline ${expected.mean} ± ${tolerance.toFixed(3)}`)
        }
        console.log(`${modeId} ${profileId}\n  ${rows.join('\n  ')}`)
        expect(failures).toEqual([])
      })
    }
  }
})

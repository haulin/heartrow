import { LONG_MODE, ALL_PROFILE_IDS, PROFILE_IDS, aggregate, makeProfile, runBatch, standardMode } from '../src/core'
import type { ProfileId } from '../src/core'

export function main(argv: string[]): void {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 2) args[argv[i]!.replace(/^--/, '')] = argv[i + 1] ?? ''
  const games = Number(args.games ?? 400)
  const seed = Number(args.seed ?? 1)
  const modeId = args.mode ?? 'standard'
  const ids = (args.policies ?? PROFILE_IDS.join(',')).split(',') as ProfileId[]
  const config = modeId === 'long' ? LONG_MODE : standardMode(0)
  const goal = config.goal
  for (const id of ids) {
    if (!ALL_PROFILE_IDS.includes(id)) throw new Error(`Unknown policy "${id}". Known: ${ALL_PROFILE_IDS.join(', ')}`)
    const s = aggregate(runBatch(config, () => makeProfile(id), games, seed))
    const f = (x: number) => x.toFixed(1)
    console.log(
      id.padEnd(8),
      modeId.padEnd(8),
      'goal',
      goal ?? 0,
      'hit',
      (s.goalHitRate * 100).toFixed(0) + '%',
      'avg',
      f(s.meanHearts),
      'median',
      s.medianHearts,
      'p10',
      s.p10Hearts,
      s.meanHeartsT24 === null ? '' : 'T24 avg ' + f(s.meanHeartsT24),
      '| kills',
      f(s.meanKills),
      'cards',
      f(s.meanCards),
      'bought',
      f(s.meanBought),
      'exiled',
      f(s.meanExiled),
      'redraws left',
      f(s.meanRedrawsLeft),
      'plays/turn',
      f(s.meanPlaysPerTurn),
      'turns',
      f(s.meanTurns),
      'lost to escapes',
      f(s.meanLost),
      'wasted gold',
      f(s.meanWastedGold),
      'power',
      f(s.meanWastedPower),
      '| best',
      s.bestHearts + ' ♥',
      s.capped ? `| CAPPED ${s.capped}` : '',
    )
  }
}

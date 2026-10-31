import { readFileSync } from 'node:fs'
import {
    ALL_PROFILE_IDS,
    CUSTOM_PRESETS,
    GOALS,
    LONG_MODE,
    PROFILE_IDS,
    aggregate,
    applyMove,
    customMode,
    makeProfile,
    newGame,
    runBatch,
    standardMode,
} from '../src/core'
import type { Move, ProfileId } from '../src/core'
// A saved run is a web record (its address is a link), so the replay reads it with the web layer's own parser.
import { parseStartParams } from '../src/platform/web/mode'
import { deckSummary } from '../src/platform/web/text'

/** Replays a "Copy run" record (a saved run: address plus moves) and prints where it ends up. */
function replay(path: string): void {
    const run = JSON.parse(readFileSync(path, 'utf8')) as { version: string; query: string; moves: Move[] }
    const { config, seed } = parseStartParams(run.query)
    let state = newGame(config, seed).state
    let rejected = 0
    for (const move of run.moves) {
        const out = applyMove(state, move)
        if (out.events.some((e) => e.type === 'rejected')) rejected++
        state = out.state
    }
    const d = deckSummary(state)
    console.log(`run from version ${run.version}, ${run.moves.length} moves, ${rejected} rejected, seed ${seed}, ${config.id}`)
    console.log(`turn ${state.turn}/${state.maxTurns}, status ${state.status}, hearts ${state.hearts}${state.goal ? `/${state.goal}` : ''}`)
    console.log(`now: gold ${state.gold}, power ${state.power}, redraws ${state.redraws}`)
    console.log(
        `deck ${d.total} cards (draw ${state.deck.length}, hand ${state.hand.length}, discard ${state.discard.length}, exile ${state.exile.length})`,
    )
    console.log(`plain gains: ${d.gold} gold, ${d.power} power, ${d.hearts} hearts`)
    console.log(`effects: ${d.fxGold} gold, ${d.fxPower} power, ${d.fxHearts} hearts, ${d.fxOther} other`)
    console.log(`types: ${d.moss} Moss, ${d.ember} Ember, ${d.tide} Tide, ${d.plain} Basic`)
}

export function main(argv: string[]): void {
    const args: Record<string, string> = {}
    for (let i = 0; i < argv.length; i += 2) args[argv[i]!.replace(/^--/, '')] = argv[i + 1] ?? ''
    if (args.replay) return replay(args.replay)
    const games = Number(args.games ?? 400)
    const seed = Number(args.seed ?? 1)
    // `--mode standard|long`, `--goal 1|2|3` for Standard, and `--preset <id>` for a custom generator from the web presets.
    const level = Math.min(Math.max(Math.round(Number(args.goal ?? 1)) - 1, 0), GOALS.length - 1)
    const preset = args.preset ? CUSTOM_PRESETS.find((p) => p.id === args.preset) : undefined
    if (args.preset && !preset) throw new Error(`Unknown preset "${args.preset}". Known: ${CUSTOM_PRESETS.map((p) => p.id).join(', ')}`)
    const config = preset ? customMode({ ...preset.generator, goalLevel: level }) : args.mode === 'long' ? LONG_MODE : standardMode(level)
    const modeId = preset ? `${preset.id}` : args.mode === 'long' ? 'long' : `std${level + 1}`
    const ids = (args.policies ?? PROFILE_IDS.join(',')).split(',') as ProfileId[]
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

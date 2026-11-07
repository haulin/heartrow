import { readFileSync, writeFileSync } from 'node:fs'
import {
    ALL_PROFILE_IDS,
    CUSTOM_PRESETS,
    DEFAULT_CUSTOM,
    GOALS,
    LONG_MODE,
    PROFILE_IDS,
    aggregate,
    applyMove,
    batchSeed,
    composePolicies,
    customMode,
    createRng,
    expectedCardCost,
    legalMoves,
    makeProfile,
    newGame,
    pickMove,
    playGame,
    runBatch,
    standardMode,
} from '../src/core'
import type { Card, GameState, Move, ProfileId, ProfileOptions, SelectionMode } from '../src/core'
// A saved run is a web record (its address is a link), so the replay reads it with the web layer's own parser.
import { parseStartParams, shareQuery } from '../src/platform/web/mode'
import { deckSummary } from '../src/platform/web/text'

const { version: APP_VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

/** Replays a "Copy run" record (a saved run: address plus moves) and prints where it ends up. */
function replay(path: string): void {
    const run = JSON.parse(readFileSync(path, 'utf8')) as { version: string; query: string; moves: Move[] }
    const { config, seed } = parseStartParams(run.query)
    let state = newGame(config, seed).state
    let rejected = 0
    for (const move of run.moves) {
        if (move.type === 'endTurn') console.log(turnLine(state))
        const out = applyMove(state, move)
        if (out.events.some((e) => e.type === 'rejected')) rejected++
        state = out.state
    }
    const d = deckSummary(state)
    console.log(`run from version ${run.version}, ${run.moves.length} moves, ${rejected} rejected, seed ${seed}, ${config.id}`)
    console.log(`turn ${state.turn}/${state.maxTurns}, status ${state.status}, hearts ${state.hearts}${state.goal ? `/${state.goal}` : ''}`)
    console.log(`now: gold ${state.gold}, power ${state.power}, flushes ${state.flushes}`)
    console.log(
        `deck ${d.total} cards (draw ${state.deck.length}, hand ${state.hand.length}, discard ${state.discard.length}, exile ${state.exile.length})`,
    )
    console.log(`plain gains: ${d.gold} gold, ${d.power} power, ${d.hearts} hearts`)
    console.log(`effects: ${d.fxGold} gold, ${d.fxPower} power, ${d.fxHearts} hearts, ${d.fxOther} other`)
    console.log(`types: ${d.moss} Moss, ${d.ember} Ember, ${d.tide} Tide, ${d.plain} Basic`)
}

/** One line per turn end: what was left unspent, and the river the player left behind (cost, gains, effects). */
function turnLine(state: GameState): string {
    const river = state.row.map(
        (c) => `${c.kind === 'enemy' ? 'E' : 'R'}${c.cost}:${c.gold}G${c.power}P${c.hearts}H${c.fx.length ? `[${c.fx.join(',')}]` : ''}`,
    )
    return `T${state.turn} end: hearts ${state.hearts}, unspent ${state.gold}G ${state.power}P, hand ${state.hand.length}, river ${river.join(' ')}`
}

const moveKey = (move: Move): string => JSON.stringify(move)

function moveLabel(state: GameState, move: Move): string {
    if (move.type === 'flush' || move.type === 'endTurn' || move.type === 'skipExile') return move.type
    let index: number
    let card: GameState['hand'][number] | undefined
    if (move.type === 'take' || (move.type === 'exile' && 'rowIndex' in move)) {
        index = move.rowIndex
        card = state.row[index]
    } else {
        index = move.handIndex
        card = state.hand[index]
    }
    const cardText = card
        ? `${card.kind} ${card.type} cost ${card.cost}, +${card.gold}G +${card.power}P +${card.hearts}H${card.fx.length ? ` [${card.fx.join(',')}]` : ''}`
        : 'missing card'
    return `${move.type} ${index}: ${cardText}`
}

/** Explains the policy factors and selected move at one step of a saved bot replay. */
function explain(path: string, rawMove: string | undefined): void {
    const record = JSON.parse(readFileSync(path, 'utf8')) as {
        query: string
        moves: Move[]
        bot?: { profile?: string; selection?: string; botSeed?: number; phase?: ProfileOptions['phase'] | null }
    }
    if (!record.bot?.profile || record.bot.botSeed === undefined) throw new Error('Replay does not contain bot metadata')
    const moveNumber = Math.max(1, Math.round(Number(rawMove ?? 1)))
    if (moveNumber > record.moves.length) throw new Error(`Move ${moveNumber} is outside the replay (${record.moves.length} moves)`)
    const { config, seed } = parseStartParams(record.query)
    const selection = record.bot.selection === 'greedy' || record.bot.selection === 'sample' ? record.bot.selection : undefined
    const profile = makeProfile(record.bot.profile as ProfileId, selection, record.bot.phase ? { phase: record.bot.phase } : undefined)
    const policy = composePolicies(profile.policies, profile.id)
    const rng = createRng(record.bot.botSeed, 'bot')
    let state = newGame(config, seed).state
    const mismatches: string[] = []
    for (let i = 0; i < moveNumber - 1; i++) {
        const legal = legalMoves(state)
        const predicted = pickMove(state, legal, policy, rng, profile.pick)
        if (!predicted || moveKey(predicted) !== moveKey(record.moves[i]!)) {
            mismatches.push(
                `move ${i + 1}: recorded ${moveLabel(state, record.moves[i]!)}; predicted ${predicted ? moveLabel(state, predicted) : 'none'}`,
            )
        }
        const outcome = applyMove(state, record.moves[i]!)
        if (outcome.events.some((event) => event.type === 'rejected')) throw new Error(`Recorded move ${i + 1} is rejected`)
        state = outcome.state
    }
    const legal = legalMoves(state)
    const predicted = pickMove(state, legal, policy, rng, profile.pick)
    const actual = record.moves[moveNumber - 1]!
    console.log(
        `explain ${path}: ${record.bot.profile}, ${profile.pick.mode}, seed ${seed}, move ${moveNumber}/${record.moves.length}, turn ${state.turn}`,
    )
    console.log(
        `state: ${state.hearts}H, ${state.gold}G, ${state.power}P, ${state.flushes} flushes, hand ${state.hand.length}, row ${state.row.length}, expected costs ${expectedCardCost(state, 'recruit').toFixed(1)}G/${expectedCardCost(state, 'enemy').toFixed(1)}P`,
    )
    console.log(`recorded: ${moveLabel(state, actual)}`)
    console.log(`predicted: ${predicted ? moveLabel(state, predicted) : 'none'}`)
    if (mismatches.length) {
        console.log(`earlier mismatches: ${mismatches.length}`)
        for (const mismatch of mismatches) console.log(`  ${mismatch}`)
    }
    console.log('legal moves and policy factors:')
    for (const move of legal) {
        let total = 1
        const factors = profile.policies.map((item) => {
            const raw = item.weight(state, move, legal)
            const factor = raw > 0 && raw < Infinity ? raw : 0
            total *= factor
            return `${item.id}=${factor}`
        })
        console.log(`- ${moveLabel(state, move)} => ${total} (${factors.join(', ')})`)
    }
}

interface UndoPeekStats {
    samples: number
    first: number
    shifted: number
    all: number
}

const cardKey = (card: Card): string =>
    JSON.stringify([card.type, card.kind, card.cost, card.gold, card.power, card.hearts, card.fx, card.main, card.fxParams, card.retain])

const percent = (value: number, total: number): string => `${((value / total) * 100).toFixed(1)}%`

/** Runs the selected bot profiles and writes the lowest-heart game as a pasteable saved-run record. */
function writeWorstRun(
    output: string,
    config: Parameters<typeof playGame>[0],
    ids: ProfileId[],
    selection: SelectionMode | undefined,
    profileOptions: ProfileOptions | undefined,
    games: number,
    seeds: number,
    seed: number,
): void {
    let worst:
        | {
              id: ProfileId
              baseSeed: number
              gameIndex: number
              gameSeed: number
              botSeed: number
              result: ReturnType<typeof playGame>
          }
        | undefined
    for (let offset = 0; offset < seeds; offset++) {
        const baseSeed = seed + offset
        for (const id of ids) {
            for (let gameIndex = 0; gameIndex < games; gameIndex++) {
                const gameSeed = batchSeed(baseSeed, gameIndex)
                const botSeed = batchSeed(baseSeed + 7919, gameIndex)
                const result = playGame(config, gameSeed, makeProfile(id, selection, profileOptions), botSeed)
                if (!worst || result.summary.hearts < worst.result.summary.hearts) {
                    worst = { id, baseSeed, gameIndex, gameSeed, botSeed, result }
                }
            }
        }
    }
    if (!worst) throw new Error('No games to inspect')
    const record = {
        version: APP_VERSION,
        query: shareQuery(config, worst.gameSeed),
        moves: worst.result.moves,
        bot: {
            profile: worst.id,
            selection: selection ?? 'profile-default',
            baseSeed: worst.baseSeed,
            gameIndex: worst.gameIndex,
            gameSeed: worst.gameSeed,
            botSeed: worst.botSeed,
            phase: profileOptions?.phase ?? null,
        },
        summary: worst.result.summary,
    }
    writeFileSync(output, JSON.stringify(record, null, 2) + '\n')
    console.log(
        `wrote ${output}: ${worst.id}, ${worst.result.summary.hearts} hearts, seed ${worst.gameSeed}, ${worst.result.moves.length} moves`,
    )
}

/** Compares the cards previewed by flush+undo with the cards generated after ending the turn. */
function undoPreview(args: Record<string, string>): void {
    const games = Math.max(1, Math.round(Number(args.games ?? 1000)))
    const baseSeed = Number(args.seed ?? 1)
    const level = Math.min(Math.max(Math.round(Number(args.goal ?? 1)) - 1, 0), GOALS.length - 1)
    const config = args.mode === 'long' ? LONG_MODE : standardMode(level)
    const byTurn = new Map<number, UndoPeekStats>()
    const overall: UndoPeekStats = { samples: 0, first: 0, shifted: 0, all: 0 }

    for (let game = 0; game < games; game++) {
        let state = newGame(config, batchSeed(baseSeed, game)).state
        while (state.status === 'playing' && state.turn < state.maxTurns) {
            if (state.flushes > 0) {
                const preview = applyMove(state, { type: 'flush' }).state.row.slice(0, 4)
                const afterEnd = applyMove(state, { type: 'endTurn' }).state
                if (afterEnd.status === 'playing') {
                    const nextFlush = applyMove(afterEnd, { type: 'flush' }).state.row.slice(0, 4)
                    const first = cardKey(preview[0]!) === cardKey(afterEnd.row[0]!)
                    const shifted = preview.slice(1).filter((card, i) => cardKey(card) === cardKey(nextFlush[i]!)).length
                    const all = first && shifted === 3
                    const stats = byTurn.get(state.turn) ?? { samples: 0, first: 0, shifted: 0, all: 0 }
                    stats.samples++
                    stats.first += first ? 1 : 0
                    stats.shifted += shifted
                    stats.all += all ? 1 : 0
                    byTurn.set(state.turn, stats)
                    overall.samples++
                    overall.first += first ? 1 : 0
                    overall.shifted += shifted
                    overall.all += all ? 1 : 0
                }
            }
            state = applyMove(state, { type: 'endTurn' }).state
        }
    }

    console.log(`undo-preview ${config.name}: ${games} games, ${overall.samples} turn states, no row purchases`)
    console.log(`first preview card becomes next row card: ${percent(overall.first, overall.samples)}`)
    console.log(`preview cards 2–4 match next flush cards 1–3: ${percent(overall.shifted, overall.samples * 3)}`)
    console.log(`all four preview cards match their future positions: ${percent(overall.all, overall.samples)}`)
    console.log('by turn:')
    for (const [turn, stats] of byTurn) {
        console.log(
            `T${turn}: first ${percent(stats.first, stats.samples)}, next flush ${percent(stats.shifted, stats.samples * 3)}, all four ${percent(stats.all, stats.samples)}`,
        )
    }
}

export function main(argv: string[]): void {
    const args: Record<string, string> = {}
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i]!.replace(/^--/, '')
        const next = argv[i + 1]
        args[key] = next && !next.startsWith('--') ? next : 'true'
        if (args[key] !== 'true') i++
    }
    if (args.replay) return replay(args.replay)
    if (args.explain) return explain(args.explain, args.move)
    if (args.analysis === 'undo') return undoPreview(args)
    const games = Number(args.games ?? 400)
    const seed = Number(args.seed ?? 1)
    const seeds = Math.max(1, Math.round(Number(args.seeds ?? 1)))
    // `--mode standard|long`, `--goal 1|2|3|4` for Standard, `--preset <id>` for a custom generator from the web presets, `--phase earlyEnd,lateStart` for lab-human, `--worst <file>` for a pasteable failure record, and `--sg/--sp` to override starter Basic counts. `--seeds` repeats the batch with consecutive base seeds.
    const level = Math.min(Math.max(Math.round(Number(args.goal ?? 1)) - 1, 0), GOALS.length - 1)
    const preset = args.preset ? CUSTOM_PRESETS.find((p) => p.id === args.preset) : undefined
    if (args.preset && !preset) throw new Error(`Unknown preset "${args.preset}". Known: ${CUSTOM_PRESETS.map((p) => p.id).join(', ')}`)
    const starterGold = args.sg === undefined ? undefined : Math.max(0, Math.round(Number(args.sg)))
    const starterPower = args.sp === undefined ? undefined : Math.max(0, Math.round(Number(args.sp)))
    const phaseValues = args.phase?.split(',').map(Number)
    if (
        phaseValues &&
        (phaseValues.length !== 2 ||
            phaseValues.some((value) => !Number.isInteger(value) || value < 0) ||
            phaseValues[0]! >= phaseValues[1]!)
    ) {
        throw new Error('Phase thresholds must be two integers in the form earlyEnd,lateStart with earlyEnd < lateStart')
    }
    const profileOptions: ProfileOptions | undefined = phaseValues
        ? { phase: { earlyEnd: phaseValues[0]!, lateStart: phaseValues[1]! } }
        : undefined
    if ((starterGold !== undefined || starterPower !== undefined) && args.mode === 'long') {
        throw new Error('Starter overrides are only supported for Standard and custom modes')
    }
    const starterBase = preset?.generator ?? DEFAULT_CUSTOM
    const starterOverride = starterGold !== undefined || starterPower !== undefined
    const config = starterOverride
        ? customMode({
              ...starterBase,
              goalLevel: level,
              starterGold: starterGold ?? starterBase.starterGold,
              starterPower: starterPower ?? starterBase.starterPower,
          })
        : preset
          ? customMode({ ...preset.generator, goalLevel: level })
          : args.mode === 'long'
            ? LONG_MODE
            : standardMode(level)
    const modeBase = preset ? `${preset.id}` : args.mode === 'long' ? 'long' : `std${level + 1}`
    const phaseSuffix = phaseValues ? `-phase${phaseValues[0]}-${phaseValues[1]}` : ''
    const modeId = `${starterOverride ? `${modeBase}-sg${config.starter.basicGold}-sp${config.starter.basicPower}` : modeBase}${phaseSuffix}`
    const ids = (args.policies ?? PROFILE_IDS.join(',')).split(',') as ProfileId[]
    if (args.selection && args.selection !== 'greedy' && args.selection !== 'sample') {
        throw new Error(`Unknown selection "${args.selection}". Known: greedy, sample`)
    }
    const selection = args.selection as SelectionMode | undefined
    const goal = config.goal
    for (const id of ids) if (!ALL_PROFILE_IDS.includes(id)) throw new Error(`Unknown policy "${id}". Known: ${ALL_PROFILE_IDS.join(', ')}`)
    if (args.worst !== undefined) {
        writeWorstRun(args.worst === 'true' ? 'bot-worst.json' : args.worst, config, ids, selection, profileOptions, games, seeds, seed)
        return
    }
    const results = new Map<ProfileId, ReturnType<typeof runBatch>[number][]>()
    for (const id of ids) results.set(id, [])
    // `--game-seed <n>` plays that exact game (the seed in a "Copy run" address) `--games` times, varying only the bot's own randomness.
    const gameSeed = args['game-seed'] === undefined ? undefined : Number(args['game-seed'])
    for (let offset = 0; offset < seeds; offset++) {
        for (const id of ids) {
            const make = () => makeProfile(id, selection, profileOptions)
            results
                .get(id)!
                .push(
                    ...(gameSeed === undefined
                        ? runBatch(config, make, games, seed + offset)
                        : Array.from({ length: games }, (_, i) => playGame(config, gameSeed, make(), batchSeed(seed + offset, i)).summary)),
                )
        }
    }
    const rows = ids.map((id) => {
        const s = aggregate(results.get(id)!)
        return { id, stats: s }
    })
    if (args.json === 'true') {
        console.log(
            JSON.stringify({ mode: modeId, goal, games, seeds, seed, selection: selection ?? 'profile-default', profiles: rows }, null, 2),
        )
        return
    }
    for (const { id, stats: s } of rows) {
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
            'p90',
            s.p90Hearts,
            s.meanHeartsT24 === null ? '' : 'T24 avg ' + f(s.meanHeartsT24),
            '| kills',
            f(s.meanKills),
            'cards',
            f(s.meanCards),
            'bought',
            f(s.meanBought),
            'exiled',
            f(s.meanExiled),
            'flushes left',
            f(s.meanFlushesLeft),
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
            '| worst',
            s.worstHearts + ' ♥',
            'best',
            s.bestHearts + ' ♥',
            s.capped ? `| CAPPED ${s.capped}` : '',
        )
    }
}

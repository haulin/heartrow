import { describe, expect, it } from 'vitest'
import { CUSTOM_PRESETS, LONG_MODE, applyMove, customMode, makeProfile, playGame, standardMode } from '../../src/core'
import { basicCard, blank, enemy, mk } from './helpers'

const heartsTotal = (heartsFrom: Record<string, number | undefined>): number => {
    let total = 0
    for (const amount of Object.values(heartsFrom)) total += amount ?? 0
    return total
}

describe('hearts by source', () => {
    it('adds up to the hearts of the run, plus the ones lost to escapes, whatever the mode and the bot', () => {
        const modes = [standardMode(1), LONG_MODE, ...CUSTOM_PRESETS.map((preset) => customMode({ ...preset.generator, goalLevel: 1 }))]
        for (const config of modes) {
            for (const id of ['mixed', 'build', 'smart'] as const) {
                for (let seed = 1; seed <= 4; seed++) {
                    const { state } = playGame(config, seed, makeProfile(id))
                    expect(heartsTotal(state.stats.heartsFrom) - state.stats.lostToEscapes).toBe(state.hearts)
                }
            }
        }
    })

    it('names a recruit, an enemy and an effect as the source', () => {
        const s = blank()
        s.hand = [mk({ hearts: 2 }), mk({ fx: ['vault'], hearts: 0 })]
        s.exile = [basicCard(), basicCard(), basicCard(), basicCard(), basicCard(), basicCard()]
        const afterPlain = applyMove(s, { type: 'play', handIndex: 0 }).state
        const afterVault = applyMove(afterPlain, { type: 'play', handIndex: 1 }).state
        expect(afterVault.stats.heartsFrom).toEqual({ plain: 2, vault: 2 })
    })

    it('credits the printed hearts of a defeated enemy', () => {
        const s = blank()
        s.power = 9
        s.row = [enemy({ hearts: 4, cost: 3 }), mk(), mk(), mk(), mk()]
        const done = applyMove(s, { type: 'take', rowIndex: 0 }).state
        expect(done.stats.heartsFrom.defeat).toBe(4)
    })

    it('credits the end-of-turn reaping to its effect', () => {
        const s = blank()
        s.reapGold = 1
        s.gold = 9
        const done = applyMove(s, { type: 'endTurn' }).state
        expect(done.stats.heartsFrom).toEqual({ reapG: 3 })
    })
})

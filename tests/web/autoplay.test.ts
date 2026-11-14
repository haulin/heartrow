import { describe, expect, it } from 'vite-plus/test'
import type { Card } from '../../src/core'
import { autoplayKind, isSimplePlay, playsInAutoplay } from '../../src/platform/web/autoplay'

const card = (over: Partial<Card>): Card => ({
    id: 1,
    type: 'moss',
    kind: 'recruit',
    cost: 2,
    gold: 2,
    power: 0,
    hearts: 0,
    fx: [],
    main: 'gold',
    ...over,
})

describe('Play simple', () => {
    it('plays plain gains', () => {
        expect(isSimplePlay(card({}))).toBe(true)
    })

    it('leaves out cards with effects, played cards and Retain cards', () => {
        expect(isSimplePlay(card({ fx: ['draw'] }))).toBe(false)
        expect(isSimplePlay(card({ played: true }))).toBe(false)
        expect(isSimplePlay(card({ retain: true }))).toBe(false)
    })
})

describe('Play rest', () => {
    it('is offered once no simple card is left', () => {
        expect(autoplayKind([card({}), card({ fx: ['draw'] })])).toBe('simple')
        expect(autoplayKind([card({ played: true }), card({ fx: ['draw'] }), card({ retain: true })])).toBe('rest')
        expect(autoplayKind([card({ played: true })])).toBeUndefined()
        expect(autoplayKind([])).toBeUndefined()
    })

    it('plays every unplayed card, and simple plays only simple ones', () => {
        expect(playsInAutoplay('rest', card({ fx: ['draw'], retain: true }))).toBe(true)
        expect(playsInAutoplay('rest', card({ played: true }))).toBe(false)
        expect(playsInAutoplay('simple', card({ fx: ['draw'] }))).toBe(false)
    })
})

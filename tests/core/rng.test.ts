import { describe, expect, it } from 'vitest'
import { chance, cloneRng, createRng, createStreams, nextFloat, nextInt, shuffle } from '../../src/core/rng'

describe('rng', () => {
  it('is deterministic per seed and label', () => {
    const a = createRng(42, 'gen')
    const b = createRng(42, 'gen')
    expect(Array.from({ length: 20 }, () => nextFloat(a))).toEqual(Array.from({ length: 20 }, () => nextFloat(b)))
  })

  it('differs across seeds and labels', () => {
    expect(nextFloat(createRng(1, 'gen'))).not.toBe(nextFloat(createRng(2, 'gen')))
    expect(nextFloat(createRng(1, 'gen'))).not.toBe(nextFloat(createRng(1, 'shuffle')))
  })

  it('keeps streams independent', () => {
    const s1 = createStreams(7)
    const s2 = createStreams(7)
    for (let i = 0; i < 50; i++) nextFloat(s1.gen)
    expect(nextFloat(s1.shuffle)).toBe(nextFloat(s2.shuffle))
  })

  it('stays in range and is roughly uniform', () => {
    const r = createRng(3)
    const counts = [0, 0, 0, 0, 0]
    for (let i = 0; i < 50000; i++) counts[nextInt(r, 5)]!++
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(500)
    let hits = 0
    for (let i = 0; i < 20000; i++) if (chance(r, 0.3)) hits++
    expect(Math.abs(hits - 6000)).toBeLessThan(300)
  })

  it('shuffles into a permutation and survives JSON round trip', () => {
    const r = createRng(9)
    const items = Array.from({ length: 30 }, (_, i) => i)
    expect(shuffle(r, items.slice()).sort((a, b) => a - b)).toEqual(items)
    const copy = JSON.parse(JSON.stringify(r)) as typeof r
    expect(nextFloat(copy)).toBe(nextFloat(cloneRng(r)))
  })
})

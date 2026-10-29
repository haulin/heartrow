import type { Card } from '../../../core'

export interface ArtShape {
  tag: 'circle' | 'rect' | 'polygon' | 'line'
  attrs: Record<string, string | number>
}

function hashSeed(card: Card): number {
  let a = 0
  const text = [card.type, card.kind, card.cost, card.gold, card.power, card.hearts, card.fx.join(), card.drawCount || ''].join('|')
  for (const ch of text) a = (a * 31 + ch.charCodeAt(0)) | 0
  return a
}

/** Pure function of the card's fields. It has its own tiny PRNG and never touches the core RNG streams. */
export function cardArt(card: Card): ArtShape[] {
  let a = hashSeed(card)
  const r = (): number => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const color = `var(--${card.type === 'plain' ? 'dim' : card.type})`
  const count = card.type === 'plain' ? 7 : Math.min(18, 5 + card.cost)
  const shapes: ArtShape[] = []
  for (let i = 0; i < count; i++) {
    const x = r() * 100
    const y = r() * 100
    const z = 8 + r() * 26
    const o = 0.25 + r() * 0.5
    const d = (r() * 90) | 0
    const rot = `rotate(${d} ${x} ${y})`
    switch (card.type) {
      case 'moss':
        shapes.push({ tag: 'circle', attrs: { cx: x, cy: y, r: z / 1.6, fill: color, opacity: o } })
        break
      case 'ember':
        shapes.push({ tag: 'rect', attrs: { x: x - z / 2, y: y - z / 3, width: z, height: z * 0.66, fill: color, transform: rot, opacity: o } })
        break
      case 'tide':
        shapes.push({ tag: 'circle', attrs: { cx: x, cy: y, r: z / 1.5, fill: 'none', stroke: color, 'stroke-width': 3, opacity: o } })
        break
      case 'foe':
        shapes.push({ tag: 'polygon', attrs: { points: `${x},${y - z} ${x + z * 0.8},${y + z * 0.6} ${x - z * 0.8},${y + z * 0.6}`, fill: color, transform: rot, opacity: o } })
        break
      default:
        shapes.push({
          tag: 'line',
          attrs: { x1: card.power ? x + 30 : x - 30, y1: 102, x2: card.power ? x - 30 : x + 30, y2: -2, stroke: color, 'stroke-width': 2 + z / 5, opacity: o },
        })
    }
  }
  return shapes
}

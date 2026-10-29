export type Rng = [number, number, number, number]

export type StreamName = 'gen' | 'shuffle' | 'flip'

export type Streams = Record<StreamName, Rng>

const STREAM_NAMES: StreamName[] = ['gen', 'shuffle', 'flip']

function hashString(text: string): number {
    let h = 2166136261
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function mix(a: number): number {
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t ^= t >>> 15
    t = Math.imul(t, 0x735a2d97)
    return (t ^ (t >>> 15)) >>> 0
}

export function createRng(seed: number, label = ''): Rng {
    let x = (seed ^ hashString(label)) >>> 0
    const next = (): number => {
        x = mix(x)
        return x
    }
    const rng: Rng = [next(), next(), next(), next()]
    for (let i = 0; i < 12; i++) nextUint32(rng)
    return rng
}

export function createStreams(seed: number): Streams {
    const streams = {} as Streams
    for (const name of STREAM_NAMES) streams[name] = createRng(seed, name)
    return streams
}

export function nextUint32(rng: Rng): number {
    const a = rng[0]
    const b = rng[1]
    const c = rng[2]
    const d = rng[3]
    const t = (((a + b) | 0) + d) | 0
    rng[3] = (d + 1) | 0
    rng[0] = b ^ (b >>> 9)
    rng[1] = (c + (c << 3)) | 0
    rng[2] = (((c << 21) | (c >>> 11)) + t) | 0
    return t >>> 0
}

export function nextFloat(rng: Rng): number {
    return nextUint32(rng) / 4294967296
}

export function nextInt(rng: Rng, n: number): number {
    return Math.floor(nextFloat(rng) * n)
}

export function chance(rng: Rng, p: number): boolean {
    return nextFloat(rng) < p
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
    return items[nextInt(rng, items.length)] as T
}

export function shuffle<T>(rng: Rng, items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = nextInt(rng, i + 1)
        const tmp = items[i] as T
        items[i] = items[j] as T
        items[j] = tmp
    }
    return items
}

export function cloneRng(rng: Rng): Rng {
    return [rng[0], rng[1], rng[2], rng[3]]
}

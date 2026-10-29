import { LONG_MODE, MODES, standardMode } from '../../core'
import type { ModeConfig } from '../../core'

export function modeFromId(id: string | null | undefined): ModeConfig {
    if (!id) return standardMode(0)
    const key = id.toLowerCase()
    const known = MODES.find((m) => m.id === key)
    if (known) return known
    if (key === 'long') return LONG_MODE
    const level = /^(?:standard|level)?(\d)$/.exec(key)
    if (level) {
        const n = Number(level[1])
        if (n >= 1 && n <= 3) return standardMode(n - 1)
    }
    return standardMode(0)
}

export function randomSeed(): number {
    return (Math.floor(Math.random() * 0x100000000) ^ (Date.now() & 0xffffffff)) >>> 0
}

export interface StartParams {
    config: ModeConfig
    seed: number
}

export function parseStartParams(search: string, fallbackSeed: () => number = randomSeed): StartParams {
    const params = new URLSearchParams(search)
    const raw = params.get('seed')
    const parsed = raw !== null && /^-?\d+$/.test(raw) ? Number(raw) >>> 0 : null
    return { config: modeFromId(params.get('mode')), seed: parsed ?? fallbackSeed() }
}

export function shareQuery(config: ModeConfig, seed: number): string {
    return `?seed=${seed}&mode=${config.id}`
}

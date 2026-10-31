import { LONG_MODE, MODES, standardMode } from '../../core'
import type { ModeConfig } from '../../core'
import { CUSTOM_ID, customFromMode, customMode, customQuery, parseCustom } from './custom'

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
    const config = params.get('mode')?.toLowerCase() === CUSTOM_ID ? customMode(parseCustom(params)) : modeFromId(params.get('mode'))
    return { config, seed: parsed ?? fallbackSeed() }
}

export function shareQuery(config: ModeConfig, seed: number): string {
    const custom = customFromMode(config)
    return `?seed=${seed}&mode=${config.id}${custom ? '&' + customQuery(custom) : ''}`
}

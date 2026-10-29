// Loads the v7 prototype script into a node:vm with a stubbed DOM and a seeded Math.random.
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makePolicies, POLICIES } from './policies.mjs'

export { POLICIES }
const here = path.dirname(fileURLToPath(import.meta.url))
export const PROTOTYPE_FILE = 'prototypes/v7/heartrow-v7.html'
export const PROTOTYPE_PATH = path.resolve(here, '../..', PROTOTYPE_FILE)
let scriptCache = null
export function loadScript() {
    if (!scriptCache) scriptCache = fs.readFileSync(PROTOTYPE_PATH, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1]
    return scriptCache
}

export function mulberry32(seed) {
    let a = seed >>> 0
    return function () {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// Mix several values (numbers/strings) into one 32-bit seed (FNV-1a style).
export function mixSeed(...parts) {
    let h = 0x811c9dc5
    for (const ch of parts.join('|')) {
        h ^= ch.charCodeAt(0)
        h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
}

// Fresh prototype context. Math.random is replaced before the script runs, so even the initial newGame() is seeded.
export function createContext(seed) {
    const ctx = {
        document: { querySelector: () => ({ setAttribute() {} }), querySelectorAll: () => [] },
        addEventListener() {},
        structuredClone,
    }
    vm.createContext(ctx)
    ctx.__rand = mulberry32(seed)
    vm.runInContext('Math.random=__rand', ctx)
    vm.runInContext(loadScript(), ctx)
    ctx.render = () => {}
    ctx.snap = () => {} // skip DOM rendering and undo snapshots for speed
    const G = (x) => vm.runInContext(x, ctx)
    return { ctx, G, getState: () => G('S') }
}

// Start a game in 'standard' or 'long' mode. Standard uses level 1 (goal = goal, default 48).
export function startGame(env, mode = 'standard', goal = 48) {
    if (mode == 'standard') env.G('GOALS[0]=' + goal)
    env.ctx.newGame(0, mode)
    return env.getState()
}

// Play one full game with a policy from a given seed. Returns the final state and extra info.
export function playGame(seed, mode, policy, goal = 48) {
    const env = createContext(seed)
    if (mode == 'standard') env.G('GOALS[0]=' + goal)
    const pol = makePolicies(env.ctx, env.G)
    const g = pol.game(policy, mode)
    return { ...g, env }
}
export { makePolicies }

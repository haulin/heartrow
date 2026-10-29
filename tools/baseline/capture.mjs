#!/usr/bin/env node
// Captures statistical baselines from the v7 prototype.
// Usage: node tools/baseline/capture.mjs --out tests/baseline.json [--games 400] [--samples 100000] [--seeds 5] [--modes standard,long] [--policies ...] [--goal 48]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createContext, makePolicies, mixSeed, POLICIES, PROTOTYPE_FILE } from './harness.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt('out', 'tests/baseline.json');
const GAMES = +opt('games', 400), SAMPLES = +opt('samples', 100000), NSEEDS = +opt('seeds', 5), GOAL = +opt('goal', 48);
const MODES = opt('modes', 'standard,long').split(','), POLS = opt('policies', POLICIES.join(',')).split(',');
const BASE_SEED = +opt('base-seed', 1);
const SEEDS = Array.from({ length: NSEEDS }, (_, i) => BASE_SEED + i);
const TURNS = { standard: 24, long: 42 };
const BUCKETS = {
  standard: [[1, 8], [9, 16], [17, 24]],
  long: [[1, 8], [9, 16], [17, 24], [25, 36], [37, 42]],
};
const bname = ([a, b]) => `t${a}-${b}`;

const mean = x => x.reduce((p, q) => p + q, 0) / x.length;
const sd = x => x.length < 2 ? 0 : Math.sqrt(x.reduce((p, q) => p + (q - mean(x)) ** 2, 0) / (x.length - 1));
const sortNum = x => x.slice().sort((p, q) => p - q);
const round = v => Math.round(v * 1e6) / 1e6;

// ---- (a) generated cards -------------------------------------------------
function genStats(seed, mode, [lo, hi]) {
  const env = createContext(mixSeed('gen', seed, mode, lo, hi));
  env.ctx.newGame(0, mode); // sets MODE inside the prototype
  const effects = vm.runInContext('Object.keys(FX)', env.ctx);
  const turns = hi - lo + 1;
  const acc = { n: 0, recruit: 0, enemy: 0, moss: 0, ember: 0, tide: 0, costAll: 0, costR: 0, costE: 0, goldR: 0, powerR: 0, heartsR: 0, heartsE: 0, fxAny: 0, fxAnyR: 0, fxAnyE: 0, retain: 0, drawN: 0, drawCount: 0, fx: Object.fromEntries(effects.map(k => [k, 0])), fxR: Object.fromEntries(effects.map(k => [k, 0])), fxE: Object.fromEntries(effects.map(k => [k, 0])) };
  for (let i = 0; i < SAMPLES; i++) {
    const turn = lo + (i % turns);
    const c = env.ctx.make(turn);
    acc.n++; acc.costAll += c.cost;
    const hasFx = c.fx.length > 0;
    if (hasFx) { acc.fxAny++; acc.fx[c.fx[0]]++; if (c.fx[0] == 'draw') { acc.drawN += c.dn; acc.drawCount++; } }
    if (c.ret) acc.retain++;
    if (c.kind == 'recruit') {
      acc.recruit++; acc[c.type]++; acc.costR += c.cost; acc.goldR += c.gold; acc.powerR += c.power; acc.heartsR += c.hearts;
      if (hasFx) { acc.fxAnyR++; acc.fxR[c.fx[0]]++; }
    } else {
      acc.enemy++; acc.costE += c.cost; acc.heartsE += c.hearts;
      if (hasFx) { acc.fxAnyE++; acc.fxE[c.fx[0]]++; }
    }
  }
  const m = {};
  const div = (a, b) => b ? a / b : 0;
  m.recruitShare = acc.recruit / acc.n; m.enemyShare = acc.enemy / acc.n;
  for (const t of ['moss', 'ember', 'tide']) m['typeShare.' + t] = div(acc[t], acc.recruit);
  m.meanCost = acc.costAll / acc.n; m.meanCost_recruit = div(acc.costR, acc.recruit); m.meanCost_enemy = div(acc.costE, acc.enemy);
  m.meanGold_recruit = div(acc.goldR, acc.recruit); m.meanPower_recruit = div(acc.powerR, acc.recruit); m.meanHearts_recruit = div(acc.heartsR, acc.recruit);
  m.meanHearts_enemy = div(acc.heartsE, acc.enemy);
  m.fxShare = acc.fxAny / acc.n; m.fxShare_recruit = div(acc.fxAnyR, acc.recruit); m.fxShare_enemy = div(acc.fxAnyE, acc.enemy);
  m.retainShare = acc.retain / acc.n; m.meanDrawN = div(acc.drawN, acc.drawCount);
  for (const k of effects) { m['fx.' + k] = acc.fx[k] / acc.n; m['fx_recruit.' + k] = div(acc.fxR[k], acc.recruit); m['fx_enemy.' + k] = div(acc.fxE[k], acc.enemy); }
  return m;
}

// ---- (b) bot results -----------------------------------------------------
function botStats(seed, mode, pol) {
  const env = createContext(mixSeed('bot', seed, mode, pol));
  if (mode == 'standard') env.G('GOALS[0]=' + GOAL);
  const P = makePolicies(env.ctx, env.G);
  const r = { h: [], k: [], lost: [], t: [], b: [], x: [], cards: [], cp: [] };
  for (let i = 0; i < GAMES; i++) {
    const g = P.game(pol, mode), S = g.S;
    r.h.push(S.hearts); r.k.push(S.k); r.lost.push(S.lost); r.t.push(S.turn); r.b.push(S.b); r.x.push(S.x); r.cards.push(S.deck.length + S.hand.length + S.discard.length);
    if (g.checkpoint !== null) r.cp.push(g.checkpoint);
  }
  const h = sortNum(r.h), N = GAMES;
  const m = {
    meanHearts: mean(r.h), medianHearts: h[N >> 1], p10Hearts: h[Math.floor(N * .1)],
    meanKills: mean(r.k), meanLost: mean(r.lost), meanTurns: mean(r.t), meanBought: mean(r.b), meanExiled: mean(r.x), meanCards: mean(r.cards),
  };
  if (mode == 'standard') m.goalHitRate = r.h.filter(x => x >= GOAL).length / N;
  if (mode == 'long' && r.cp.length) m.meanHeartsT24 = mean(r.cp);
  return m;
}

// ---- aggregate -----------------------------------------------------------
function aggregate(perSeed) { // perSeed: array of {metric: value}
  const out = {};
  for (const k of Object.keys(perSeed[0])) {
    const v = perSeed.map(s => s[k]), mu = mean(v), s = sd(v);
    out[k] = { mean: round(mu), sd: round(s), tolerance: round(Math.max(3 * s, 0.02 * Math.abs(mu))), perSeed: v.map(round) };
  }
  return out;
}

const t0 = Date.now();
const log = (...a) => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const result = {
  meta: {
    prototype: PROTOTYPE_FILE, generatedAt: new Date().toISOString().slice(0, 10), node: process.version,
    seeds: SEEDS, prng: 'mulberry32; per-batch seed = FNV-1a(kind|seed|mode|policy or bucket)',
    gamesPerSeed: GAMES, generatedCardsPerBucketPerSeed: SAMPLES, goal: GOAL, modes: MODES, policies: POLS,
    turnBuckets: Object.fromEntries(MODES.map(m => [m, BUCKETS[m].map(bname)])),
    toleranceRule: 'tolerance = max(3 * stddev across seeds, 2% of mean). Stddev is the sample (n-1) stddev of per-seed values, each computed from gamesPerSeed games or generatedCardsPerBucketPerSeed cards. A port should use the same counts, or scale the tolerance by sqrt(counts ratio).',
    notes: 'Cards sampled uniformly over the turns in each bucket. effect frequencies use the first (only) effect: fx.<k> = share of all cards, fx_recruit/fx_enemy = share within that kind. Bot goalHitRate only in standard mode. meanHeartsT24 only in long mode.',
  },
  generation: {}, bots: {},
};
for (const mode of MODES) {
  result.generation[mode] = {};
  for (const b of BUCKETS[mode]) {
    result.generation[mode][bname(b)] = aggregate(SEEDS.map(s => genStats(s, mode, b)));
    log('gen', mode, bname(b));
  }
  result.bots[mode] = {};
  for (const pol of POLS) {
    result.bots[mode][pol] = aggregate(SEEDS.map(s => botStats(s, mode, pol)));
    log('bot', mode, pol);
  }
}
result.meta.runtimeSeconds = Math.round((Date.now() - t0) / 1000);
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
log('wrote', OUT);

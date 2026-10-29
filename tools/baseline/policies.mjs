// Bot policies copied verbatim (behaviour-identical) from prototypes/v7/bot.js.
// Do not import from prototypes. `makePolicies(ctx, G)` binds the logic to a game context.
// ctx: vm context holding the prototype globals. G(expr): evaluate an expression in that context (used to read `S`).
export const POLICIES = ['mixed', 'none', 'build', 'rush', 'pacifist', 'smart'];
const HEARTFX = { all3: 10, vault: 8, reapG: 8, reapP: 8 };

export function makePolicies(ctx, G) {
  const C = { t: 0, z: 0, e: 0 };
  function smartScore(c, i) { return c.kind == 'enemy' ? 100 + c.hearts * 12 + (i == 4 ? 40 : 0) - c.cost * .5 : 20 + (c.gold + c.power) * 2 + c.hearts * 10 + c.fx.length * 8 - ctx.cost(c) }
  function pacifistScore(c, i) { if (c.kind == 'enemy') return 0; if (c.power && !c.gold && !c.hearts && !c.fx.length) return -Infinity; const h = c.fx.reduce((v, k) => v + (HEARTFX[k] || 0), 0), x = c.fx.includes('exile') ? 18 : 0, d = c.fx.includes('draw') ? 8 : 0, q = c.fx.some(k => k == 'cycle' || k == 'purge') ? 14 : 0; return 20 + c.hearts * 25 + c.gold * 4 + h + x + d + q + c.fx.length * 4 - ctx.cost(c) }
  function retainChanges(S, c) { if (!c.ret) return true; if (c.gold || c.power || c.hearts) return true; for (const k of c.fx) { if (k == 'draw') return S.deck.length + S.discard.length > 0; if (k == 'coin' || k == 'cheap' || k == 'weak' || k == 'reapG' || k == 'reapP' || k == 'exile') return true; if (k == 'swap' && S.gold != S.power) return true; if (k == 'foes' && S.row.some(x => x.kind == 'enemy')) return true; if (k == 'all3' && S.types.size >= 3) return true; if (k == 'vault' && S.exile.length >= 3) return true; if (k == 'basics' && [...S.deck, ...S.hand, ...S.discard].filter(x => x.kind == 'basic').length >= 4) return true; if (k == 'pile' && S.discard.length >= 3) return true; if (k == 'bond' && S.types.has(c.type)) return true; if (k == 'kin' && S.hand.some(x => x.u && x !== c && x.type == c.type)) return true; if (k == 'army' && [...S.deck, ...S.hand, ...S.discard].filter(x => x.type == c.type).length >= 4) return true; if ((k == 'cycle' || k == 'purge') && S.hand.some(x => !x.u && x !== c && (k == 'purge' || !x.ret))) return true } return false }
  function exileIndex(S, pol) { if (pol == 'pacifist') { let i = S.hand.findIndex(c => c.power && !c.hearts && !c.gold && !c.fx.length); if (i >= 0) return i; i = S.hand.findIndex(c => c.power && !c.hearts); if (i >= 0) return i; i = S.hand.findIndex(c => c.power); if (i >= 0) return i } let i = S.hand.findIndex(c => c.kind == 'basic' && c.gold && c.u); if (i < 0 && S.turn > 3) i = S.hand.findIndex(c => c.kind == 'basic' && c.gold); return i }
  function pacifistPlayIndex(S) { const live = c => !c.u && retainChanges(S, c), pick = f => S.hand.findIndex(c => live(c) && f(c)), heart = c => c.hearts > 0 || c.fx.some(k => HEARTFX[k]); let i = pick(c => c.fx.includes('purge')); if (i >= 0) { const h = pick(heart); return h >= 0 ? h : i } i = pick(c => c.fx.includes('draw')); if (i >= 0) return i; i = pick(heart); if (i >= 0) return i; i = pick(c => c.gold > 0); if (i >= 0) return i; i = pick(c => c.fx.length && !c.fx.includes('cycle')); if (i >= 0) return i; return pick(c => c.fx.length) }
  function shouldProtectEdge(S, pol) { const edge = S.row[4]; return (pol == 'smart' || pol == 'mixed') && S.mull > 0 && edge && edge.kind == 'enemy' && ctx.can(edge) && S.row.slice(0, 4).some(c => c.kind == 'enemy') }
  function turn(pol) {
    let S = G('S');
    { const ne = S.row.filter(c => c.kind == 'enemy').length; C.t++; C.e += ne; if (!ne) C.z++ }
    for (let g = 0; g < 40 && !S.over; g++) {
      S = G('S'); // play phase
      if (S.pending) { const i = exileIndex(S, pol); i >= 0 ? ctx.play(i) : ctx.skip(); continue }
      const di = S.hand.findIndex(c => !c.u && retainChanges(S, c) && c.fx.includes('draw')); if (di >= 0) { ctx.play(di); continue }
      if (pol == 'pacifist') { const i = pacifistPlayIndex(S); if (i < 0) break; ctx.play(i); continue }
      if (pol == 'smart') { const i = S.hand.findIndex(c => !c.u && retainChanges(S, c)); if (i < 0) break; ctx.play(i); continue }
      let i = S.hand.findIndex(c => !c.u && retainChanges(S, c) && c.fx.length && !c.fx.includes('cycle')); // effect cards first, discard-effects last
      if (i < 0) i = S.hand.findIndex(c => !c.u && retainChanges(S, c) && !c.fx.includes('cycle')); if (i < 0) i = S.hand.findIndex(c => !c.u && retainChanges(S, c)); if (i < 0) break; ctx.play(i)
    }
    let redrawn = false;
    for (let g = 0; g < 20; g++) {
      S = G('S'); if (S.over || S.pending) break; const left = S.max - S.turn;
      if (pol == 'smart' && !redrawn && S.mull > 0 && S.turn < S.max - 2) { const bestAny = Math.max(...S.row.map((c, i) => smartScore(c, i))), bestCan = Math.max(...S.row.filter(ctx.can).map((c, i) => smartScore(c, S.row.indexOf(c)))); if (bestCan === -Infinity || bestAny - bestCan >= 12) { ctx.mulligan(); redrawn = true; continue } }
      if (!redrawn && shouldProtectEdge(S, pol)) { ctx.mulligan(); redrawn = true; continue }
      let best = -1, bs = -1; // buy phase
      S.row.forEach((c, i) => {
        if (!ctx.can(c)) return; let s;
        if (pol == 'pacifist') s = left < 3 ? 0 : pacifistScore(c, i);
        else if (pol == 'smart') s = smartScore(c, i);
        else if (c.kind == 'enemy') s = pol == 'build' && S.turn < 9 ? 1 : 100 + c.hearts * 10 + (i == 4 ? 50 : 0);
        else s = pol == 'none' || left < 3 ? 0 : (pol == 'rush' && S.turn > 3 ? 0 : 10 + ctx.cost(c) + c.hearts * 2);
        if (s > bs) { bs = s; best = i }
      });
      if (best < 0 || bs <= 0) break; ctx.take(best)
    }
    S = G('S'); if (pol != 'smart' && !S.over && S.mull > 0 && !S.row.some(c => ctx.can(c)) && S.turn < S.max - 2) ctx.mulligan(); return S
  }
  function game(pol, mode) {
    ctx.newGame(0, mode); let S = G('S'), n = 0, checkpoint = null;
    while (!S.over && n++ < 100) { S = turn(pol); S = G('S'); if (S.turn == 24) checkpoint = S.hearts; if (!S.over) ctx.endTurn(); S = G('S') }
    return { S, checkpoint };
  }
  return { turn, game, counters: C };
}

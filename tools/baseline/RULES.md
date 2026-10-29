# Heartrow v7 rules as implemented

This checklist describes what `prototypes/v7/heartrow-v7.html` actually does, derived from its `<script>` block. Function and constant names refer to that script. Where the docs and the code disagree, the code wins here. Items marked **Surprise** are worth a deliberate port decision.

## Constants and state

- [ ] `HM=1.4` enemy budget multiplier, `SP=4` starter power Basics, `EC=2` enemy cost reduction, `TP=.5` chance that a Tide recruit is power-main, `GOALS=[48,64,80]`.
- [ ] `MODES`: `standard` = 24 turns, redraw every 3 turns, no long scaling. `long` = 42 turns, redraw every 3 turns, long scaling on.
- [ ] `RES={gold:1,power:1,hearts:1.5}` budget price per resource point.
- [ ] State `S`: `turn, max, goal, hearts, gold, power, disc` (recruit discount), `edisc` (enemy discount), `rg, rp` (reap counters), `mull` (redraws available), `types` (Set of types played this turn), `deck, hand, discard, exile, row`, `pending` (exile choice open), `over` (0 running, 1 win, 2 loss, 3 long run complete), plus counters `k` (kills), `b` (bought), `lost` (hearts lost to escapes), `x` (exiled), `pl` (plays), `wg, wp` (unspent gold/power summed at turn ends).
- [ ] Card fields: `kind` (`basic`, `recruit`, `enemy`), `type` (`plain`, `moss`, `ember`, `tide`, `foe`), `cost, gold, power, hearts, fx[]` (zero or one entry in practice), `m` (main resource), `km` (kin/army resource), `dn` (draw count), `bn` (bond amount), `ret` (Retain), `u` (played this turn, hand only).

## Game start (`newGame`)

- [ ] `GOALS[LV]` is the goal in `standard` (level 1 = 48). `long` has `goal=0` and no goal.
- [ ] Starter deck: 6 Basic with `+1 gold`, 4 Basic with `+1 power`. `kind='basic'`, `type='plain'`, `cost=0`. Shuffled (`shuf`).
- [ ] Row: five cards from `make(1)`, index 0 left, index 4 right edge.
- [ ] Hand: `draw(5)`. Starts with `mull=1`, `turn=1`, `hearts=0`.
- [ ] The script also calls `newGame()` once at load (standard, level 1). A harness must seed the PRNG before loading to be reproducible.

## Turn structure

- [ ] Within a turn the player may, in any order and any number of times: play unplayed hand cards (`play`), buy or defeat row cards (`take`), redraw (`mulligan`) while `mull>0`, undo (see below).
- [ ] Gold and power are turn-local. They reset to 0 in `endTurn`. `disc, edisc, rg, rp, types` also reset.
- [ ] A played card stays in the hand with `u=1` until end of turn. Played cards still count for `kin` and can be exiled.
- [ ] While `pending` (exile choice), `take`, `endTurn` and `mulligan` do nothing. `play(i)` exiles hand card `i` (played or unplayed). `skip` clears `pending`.
- [ ] `endTurn` order (this order matters):
  1. Pop the right-edge card `row[4]`. If it is an enemy: `hearts -= out.hearts`, `lost += out.hearts`.
  2. Unshift a new card `make(S.turn+1)` at index 0 (the next turn's difficulty, even on the last turn).
  3. Hand: cards with `ret` and not `u` stay. Every other hand card goes to `discard` (including played Retain cards). All `u` flags reset.
  4. Reap: `hearts += rg*floor(gold/3) + rp*floor(power/2)` using unspent gold and power.
  5. `wg += gold`, `wp += power`. Reset gold, power, `disc`, `edisc`, `rg`, `rp`, `types`.
  6. Standard only: if `hearts>=goal` then `over=1` (win) and stop. This is checked after escape and reap, and also on turn 24.
  7. If `turn>=max`: `over = (long ? 3 : hearts>=goal ? 1 : 2)` and stop.
  8. `turn++`. If `(turn-1) % 3 == 0` then `mull++` (new turn 4, 7, 10, ...). Standard grants 7 extra redraws over the run (8 total with the start redraw). Long grants 13 extra.
  9. `draw(5)` (always five, regardless of kept Retain cards, so hands can exceed five).
- [ ] **Surprise**: reaching the goal mid-turn does nothing except a log message (`check`). The win is decided in `endTurn`, after enemy escape and reap, so an edge enemy can still undo it.
- [ ] Hearts can go negative. There is no loss for negative hearts, only the turn limit in standard.
- [ ] Long mode never ends early and has no goal. Final `hearts` is the score.

## Drawing (`draw`)

- [ ] Draws from the end of `deck` (`pop`). If `deck` is empty, `shuf(discard)` becomes the deck and `discard` empties. If the deck is still empty, drawing stops silently.
- [ ] Reshuffle uses the discard at that moment only. Hand, exile and the row are not involved.
- [ ] `draw` always clears the undo snapshot, even for `draw(0)`.

## Row mechanics

- [ ] `take(i)` requires `can(c)`: recruit needs `gold >= cost(c)`, enemy needs `power >= cost(c)`. Otherwise nothing happens (log message only).
- [ ] Displayed and actual cost: `cost(c) = max(0, c.cost - disc)` for recruits and `max(0, c.cost - edisc)` for enemies. Enemies can therefore cost 0. The stored `c.cost` is the base cost and is never mutated. The row shows the discounted value; hand and pile views show the base cost.
- [ ] Buying: `gold -= cost(c)`, the card goes to `discard` (not the hand), `b++`. Defeating: `power -= cost(c)`, `k++`. The enemy is not kept anywhere.
- [ ] Refill: `row.splice(i,1)` then `row.unshift(make(S.turn))`. The new card always enters at index 0. Cards left of `i` shift right by one (so taking the edge card moves every other card right by one and the former index 3 card becomes the edge card). Cards right of `i` do not move.
- [ ] The refill card is generated before the enemy's defeat effects resolve, and uses the current turn's difficulty.
- [ ] Defeating an enemy: `hearts += c.hearts` immediately, then its effect resolves once via `apply(c,0,rowEnemies)`. `rowEnemies` is the enemy count in the row before the splice (includes the defeated enemy, excludes the newcomer). Enemy `gold` and `power` fields are always 0.
- [ ] Buying any card clears the undo snapshot.
- [ ] Edge/escape: only the card at index 4 leaves at end of turn. A recruit leaving costs nothing. An enemy leaving costs its `hearts`.
- [ ] Redraw (`mulligan`): needs `mull>=1` and no pending. `mull--`, replaces `row[0..3]` with four `make(S.turn)` cards (new cards at the current turn's difficulty), keeps `row[4]`. Nothing is discarded or refunded. No limit per turn other than the count. Stored redraws stack without cap.
- [ ] `autoplay` (UI "Play simple") plays every unplayed hand card with an empty `fx`, from the right end of the hand towards the left. Not used by bots.

## Effects (`FX`, `apply`)

`apply(c, fromPlay, rowEnemies)` first adds the card's `gold/power/hearts`. If `fromPlay`, it checks `had = types.has(c.type)` and then adds the type to `types` (type `plain` is never added; enemies are not played). Then it runs each effect in `c.fx`. Budget values are the `FX[k].v` generator prices. Effects can resolve from play (a recruit or Basic from hand) or from defeating an enemy (`fromPlay=0`).

- [ ] `draw` (v 1.5 per card): `draw(c.dn||1)`. `dn` is 1 to 4. Price scales as `1.5*dn`. Works on enemies.
- [ ] `coin` (v 2.5): `Math.random()<.5 ? 2 : 4` gold (50/50). Clears the undo snapshot.
- [ ] `exile` (v 1): if the hand is non-empty, `pending=1`. Played from hand the hand always contains the card itself, so it always opens. On an enemy it opens only if the hand has cards. The player picks any hand card (even played ones or the exile card itself) or skips. Exiled cards go to `exile` and `x++`. No refund, no discount.
- [ ] `cheap` (v 1.5): `disc++`. Recruits cost 1 less gold each stack this turn. Floor 0.
- [ ] `weak` (v 1.5): `edisc++`. Enemies cost 1 less power each stack this turn. Floor 0.
- [ ] `foes` (v 2): `power += number of enemies in the row`. From play: current row. From an enemy defeat: `rowEnemies` (defeated enemy included, newcomer excluded).
- [ ] `all3` (v 2): from play only, `+2 hearts` if `types.size>=3` after this card's own type is added. It is not retroactive and does not trigger on an enemy defeat (`NF` stops enemies from getting it). **Surprise**: a Basic (`plain`) does not count as a type, so all3 needs Moss, Ember and Tide played, with the all3 card itself counting as its own type.
- [ ] `vault` (v 2): `hearts += floor(exile.length/3)`. Works on enemies. Counts the exile pile at resolution time.
- [ ] `basics` (v 1.5): `gold += floor(N/4)` where N = number of `kind=='basic'` cards in deck + hand + discard (not exile). Works on enemies.
- [ ] `pile` (v 1.5): `power += floor(discard.length/3)`. From play the played card is still in the hand, so it is not counted. Works on enemies.
- [ ] `bond` (v .5 plus extra): from play only, if `had` (same type already played earlier this turn), then `S[c.m] += c.bn||1`. `bn` is 1 to 3 and costs extra budget `[0,.7,1.5][bn-1]`. `NF` stops enemies from getting it. Basics do not trigger it for others since `plain` never enters `types`.
- [ ] `kin` (v 1.5): from play only, `S[c.km||c.m] += count of hand cards with u=1, x!==c, x.type==c.type`. Counts only already-played cards still in hand (not exiled, not cycled). `km` is the main resource 50% of the time, else the other one.
- [ ] `army` (v 1.5): `S[c.km||c.m] += floor(count of cards with x.type==c.type in deck + hand + discard / 4)`. Includes the card itself when played from hand. Exile is not counted.
- [ ] `cycle` (v 1.5): `un` = hand cards that are not played, not the card itself, and not `ret`. Remove them from the hand, `draw(un.length)`, then push `un` onto `discard` AFTER the draw. **Surprise**: the discarded cards cannot be redrawn by this draw, but they are in the discard for any later reshuffle. Draw clears undo, even when `un` is empty.
- [ ] `purge` (v 1.25): the same as `cycle` but also discards unplayed `ret` cards. Discards after drawing.
- [ ] `swap` (v 1.5): swap current `gold` and `power`. Works on enemies and applies after the card's own gains.
- [ ] `reapG` (v 1.5): `rg++`. At end of turn gives `floor(unspent gold/3)` hearts for each reapG card played (stacks per card).
- [ ] `reapP` (v 1.5): `rp++`. At end of turn gives `floor(unspent power/2)` hearts per card.
- [ ] Retain (`ret`) is not an effect. It lets an unplayed card stay in hand at turn end and survive `cycle`. It is generated only on recruits whose effect is in `CF` (`foes, all3, vault, pile, kin, bond, army, swap`). It costs 0.5 budget.
- [ ] A card has at most one effect in `fx` (the generator pushes one).
- [ ] Enemy effects (on defeat) can be: `draw, coin, exile, cheap, foes, vault, basics, pile, weak, cycle, purge, swap, reapG, reapP`. Not `all3, bond, kin, army` (`NF`). Enemies never get Retain. `reapG/reapP` on an enemy defeat increment the counter for the rest of the turn only.

## Card generation (`make(turn, attempt)`)

- [ ] `difficulty(turn)`: `t = min(turn,24)/24`. `costBonus = 0` in standard; in long it is 0 for turns up to 24, 1 for 25 to 36, 2 for 37 and later. Enemy chance `foe`: standard .35; long .35 (turn<=24), .40 (<=36), .45 (later). Cheap-roll chance `cheap`: .15; long after turn 24 .08.
- [ ] Kind: `foe = rand < d.foe`. Recruit type uniform over Moss, Ember, Tide. Enemy type is `foe`.
- [ ] Base cost: `lo = 2 + round(t*3) + costBonus`, `hi = 4 + round(t*5) + costBonus`. `cost = lo + floor(rand*(hi-lo+1))`. With chance .1 `cost += 2`. With chance `d.cheap` `cost = 2 + floor(rand*3)` (this replaces the cost, so it can lower an earlier +2 bump). Enemies: `cost = max(1, cost - 2)`.
- [ ] Budget: enemy `b = cost*1.4`. Recruit `b = cost*.85 + .3`. `b0 = b`.
- [ ] Main resource `m`: Ember always power; Tide power with probability .5; otherwise gold.
- [ ] Effect chance: .75 for Tide, .45 for everyone else (enemies included).
- [ ] Effect pool: all `FX` keys with price `<= b` (draw priced at 1.5), minus `NF` for enemies. Lean weighting with `LEAN`: let `f` be the pool entries in the type's lean list and `w = max(1, round(.7*(pool.length - f.length) / (.3*max(1,f.length))))`; each lean entry appears `w` times in total. Moss and Ember recruits get exile one extra copy if present (`EXTRA`). Enemies have no lean list. Pick uniformly from the list.
- [ ] LEAN lists: Moss `coin, basics, kin, bond, army, reapG, swap`. Ember `foes, pile, weak, kin, army, reapP, swap`. Tide `draw, exile, cheap, all3, cycle, purge, army`.
- [ ] After picking: draw gets `dn = 1 + floor(rand*min(4, floor(b/1.5)))`. kin/army get `km` = main (50%) or the other resource. Subtract the effect price (draw: `1.5*dn`). Bond: `bn = 1 + floor(rand*3)`, reduced while `[0,.7,1.5][bn-1] > b`, then subtract that extra price. Retain: if recruit, effect in `CF`, `b>=.5`, and rand < .8, then `ret=1` and `b -= .5`.
- [ ] Resource fill: while `b>=1`: `hc` = .75 if the card already has hearts, else .165 for Tide and .075 for others. Roll `q`: `q<hc` hearts; `q<hc+.15` the other resource; else main. Enemies always roll hearts. If the pick costs more than `b` (hearts need 1.5) it falls back to main. For an enemy that fallback means the loop stops (enemy resource other than hearts is not allowed). Otherwise `c[res]++`, `b -= RES[res]`.
- [ ] Cost recompute (displayed cost): `sp = b0 - b` (budget spent), `cost = max(enemy?1:2, min(rolled cost, ceil(enemy ? sp/1.4 : (sp-.3)/.85 - 1e-9)))`. So unspent budget lowers the cost, and the cost can never exceed the rolled cost. Recruit minimum is 2, enemy minimum is 1.
- [ ] Fixups: an enemy with no hearts gets `hearts=1`. A recruit with no gold, power, hearts or effect gets `gold=1`.
- [ ] Long filler reroll: `MODE=='long' && turn>20 && recruit && cost<=4 && no effect && attempt<3 && rand<.8` rerolls with `make(turn, attempt+1)`. **Surprise**: it begins at turn 21, not 25. DESIGN.md describes it as late-run only.
- [ ] Generation uses `Math.random` for everything, including `coin` flips and `shuf`.

## Long mode scaling (summary)

| Turns | costBonus | enemy chance | cheap roll |
| --- | --- | --- | --- |
| 1 to 24 | 0 | .35 | .15 |
| 25 to 36 | +1 | .40 | .08 |
| 37 to 42 | +2 | .45 | .08 |

- [ ] Row refills at the end of turn 24 use `make(25)`, so the first long-scaled card arrives one turn before turn 25 starts. Likewise turns 36 and 37.
- [ ] Standard mode never scales: `costBonus` stays 0 and `t` is capped at 1 (turn 25 maker calls in standard behave like turn 24).
- [ ] Long grants a redraw every 3 turns like standard (see `endTurn` step 8).

## Undo (`snap`, `undo`)

- [ ] `play(i)` calls `snap()` before resolving (a deep `structuredClone` of `S`, with `snap` nulled first). Exiling a card via `play` during `pending` also snaps.
- [ ] The snapshot is cleared (set to null) by: `draw` (any call, including `draw(0)` from `cycle`/`purge`), `coin`, `take`, `mulligan`, `endTurn`. So undo works only for the last card play that did not draw, flip, or change the row.
- [ ] `undo` restores the full state (RNG is not restored: the host PRNG sequence advances, so replays differ). `skip` does not clear or take a snapshot, so Undo after a skipped exile reverts the exile card play. Undo after an exile choice returns to the open `pending` state.
- [ ] Only one level of undo.

## Other notes and ambiguities

- [ ] **Surprise**: DESIGN.md quotes about 87 hearts for the long Mixed bot and about 65 for Smart. The current v7 code and bot give about 67 and 55. The design text is stale or from an earlier bot. The captured `tests/baseline.json` reflects the code.
- [ ] The log and render code can be ignored for rules. `render` is stubbed in headless runs (so `shake`, `art`, tooltips are irrelevant).
- [ ] Draw order is shuffle-dependent: the shuffle is Fisher-Yates using `Math.random`, drawing from the array end.
- [ ] The row has no deck. A card is generated at the moment it enters, with that turn's parameters, and it keeps its stats while it travels right.
- [ ] Open design items in DESIGN.md (min enemy cost 1 after discount, bosses, six slots, etc.) are not implemented. Do not port them.

# Current bot benchmark

The one place for the latest greedy bot numbers. Compare a bot change against these tables instead of re-running the baseline. Replace the tables in the same change that keeps a bot or engine change, and list what moved in [`docs/history.md`](../../docs/history.md).

## How to read it

Every table comes from the same command shape, one process per bot, at most seven at a time: `npm run sim -- --games 400 --seeds 100 --seed 1000 --goal <1|2|3|4> --policies <bot>`. Add `--preset <id>` for a preset, and `--effects a,b,c` to replace the effects of a preset. Hit rates have a standard error of about 0.25 points at this size.

Goals: 1 is Standard goal 48 hearts, 2 is 64, 3 is 80 and 4 is 96. Presets are measured at goal 1 unless the heading says otherwise. Mean ♥, median, P10 and P90 are the hearts at the end of the run, so they do not depend on the goal. In the preset tables "Before" columns repeat the measurement without the effects named in the text above that table.

Version 0.4.0. Every table was re-measured for 0.4.0 except the side figures in the notes under the tables (leans moved, Bond, All3 and Foes priced differently, Pile added to Tide hearts and Pacifist, and one ramp for every goal with an enemy share of 20% in turns 1 to 6 and 35% after). The Standard starter is 7 ● and 3 ⚔. Presets without enemies went up. Moss economy, Tide hearts, Pacifist and Attack only were measured on the first ramp of 15%, 25% and 35% (presets without enemies, and Attack only with nothing but enemies, do not feel the share), so they were not repeated. Bots: flush and end turn count only takes the buying policies allow, `lab-human` exiles by deck average (10% drop), and `edgeFollowUp` is in `lab-human`, `mixed` and `build`. `lab-human` values Exile at 7, counts Cycle and Purge as one family when pricing effect copies, values Flush only while it holds fewer than two spare flushes, gives Shift a low value, counts every effect that pays hearts on its card (Vault, Reap, and Flip, Bond, Kin, Army, All3, Hoard, Basics or Pile when their rolled payout is hearts) as a heart card, values a Flip at the mean of its two outcomes for its rolled tier, and starts its heart phase at turn 8 instead of 16 (and its economy phase ends at 3 instead of 6) when the generator has no enemies. `retainAware` holds a Retain Weak card until an enemy is in the row, holds a Retain Shift until no enemy would fall off the Gate and 2 or more resources are left, and holds a plain Retain gain when it opens no new buy and a pricier one is about a turn of income away.

Engine in 0.3.0: Flush effect, Retain on plain recruits and the `keywords` knob, Cycle and Redraw drawing their shortfall from a reshuffle of the cards they just discarded, rolled amounts for Vault, Pile, Basics and All3, Shift in Ember, tiered prices for Draw, Flip, Bond, Exile, Weak and Cheap, a cost base per card type, and one payout currency roll for every effect that pays a resource. The Simple only preset starts with 5 ● and 3 ⚔, and Moss economy with 7 ●.

The bots do not know Reload, Push and Echo (and `smart` and `mixed` do not know Shift or Flush). They give those effects the default value, so a bigger pool lowers their hit rate without making the game harder for a player who uses them.

Only the rows worth reading were re-measured for 0.3.0: Standard Levels 1 to 3 for the four bots, the long run, and each preset for `lab-human` and the bot that suits it. Hit rates under 5% are within noise, so read Levels 2 and 3 for the mean ♥ only.

## Standard goal 48

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 36% | 40.1   | 42     | 25  | 51  | −11   | 69   |
| `mixed`     | 35% | 38.8   | 41     | 22  | 51  | −27   | 110  |
| `build`     | 31% | 37.8   | 40     | 21  | 51  | −28   | 79   |
| `smart`     | 13% | 31.4   | 32     | 14  | 48  | −32   | 78   |

## Standard goal 64

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 7%  | 42.2   | 42     | 25  | 60  | −11   | 81   |
| `mixed`     | 7%  | 40.9   | 41     | 22  | 60  | −27   | 110  |
| `build`     | 6%  | 39.6   | 40     | 21  | 59  | −28   | 87   |
| `smart`     | 1%  | 31.9   | 32     | 14  | 50  | −32   | 80   |

## Standard goal 80

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 1%  | 42.5   | 42     | 25  | 60  | −11   | 94   |
| `mixed`     | 1%  | 41.2   | 41     | 22  | 60  | −27   | 110  |
| `build`     | 1%  | 39.8   | 40     | 21  | 59  | −28   | 94   |
| `smart`     | 0%  | 31.9   | 32     | 14  | 50  | −32   | 90   |

## Standard Long Run

The goal `long`: 200 ♥ in 42 turns, played on to the last turn after the goal (the simulator takes the `continue` move for this goal). It uses 200 games and 10 seeds: `npm run sim -- --games 200 --seeds 10 --seed 1000 --goal long --policies <bot>`.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 |
| ----------- | --- | ------ | ------ | --- | --- |
| `lab-human` | 2%  | 103.8  | 102    | 54  | 155 |
| `mixed`     | 0%  | 87.1   | 87     | 38  | 139 |
| `build`     | 0%  | 67.6   | 67     | 21  | 117 |
| `smart`     | 0%  | 44.6   | 44     | 1   | 88  |

`build` and `smart` are from the first ramp (15%, 25%, 35%) with the old 6 ● / 4 ⚔ starter and were not re-measured. Playing on in Standard goal 48 with `--play-on` was measured only on that first ramp (`lab-human` 49.4 ♥ mean, `mixed` 44.9, medians the same as at turn 24).

## Moss economy preset

Custom generator `moss` from `src/core/custom.ts`, 24 turns, goal 48: `--preset moss --goal 1 --policies <bot>`. There are no enemies, so `mixed` and `build` play the same moves and give one result.

| Bot         | Hit | Mean ♥ | P10 | P90 |
| ----------- | --- | ------ | --- | --- |
| `lab-human` | 47% | 44.6   | 34  | 52  |
| `smart`     | 27% | 38.7   | 25  | 50  |
| `pacifist`  | 23% | 37.1   | 23  | 50  |
| `mixed` \*  | 13% | 33.3   | 19  | 48  |

\* The same result for `build`. `lab-human` leads because its hearts phase starts at turn 8 when there are no enemies. The preset starts with 7 Basics of 1 ●. With the usual 10 Basics `lab-human` scored 21%, `smart` 5%, `pacifist` 5% and `mixed` 2%. `lab-human` with 7 Basics also scored 14% at goal 64 and 3% at goal 80 (0.3.0 figures, not re-measured).

## Ember combat preset

Custom generator `ember`, 16 effects: draw, flip, exile, foes, pile, hoard, bulk, bond, kin, weak, army, swap, reapP, reload, push and shift. Hit is at goals 48, 64 and 80 (Levels 1 to 3). The mean ♥ is from the goal 80 run.

| Bot         | L1  | L2  | L3  | Mean ♥ | P10 | P90 |
| ----------- | --- | --- | --- | ------ | --- | --- |
| `lab-human` | 48% | 11% | 1%  | 46.6   | 29  | 64  |
| `mixed`     | 60% | 18% | 2%  | 50.3   | 32  | 69  |
| `smart`     | 27% | 4%  | 0%  | 38.9   | 21  | 56  |

## Tide hearts and Pacifist presets

Custom generators `tide` and `pacifist` (effect lists in `src/core/custom.ts`, each with Echo and Flush). Hit is at goal 48. `lab-human` has no enemies to fight here, so it starts its heart phase at turn 8; with the default phase it scored 13% (32.9 ♥) on Tide and 0% (19.7 ♥) on Pacifist (0.3.0 figures). Tide hearts has Draw, Cheap, Pile, Hoard, Bond, Cycle, Redraw, Echo and Flush, and Pacifist is the hearts-from-everything list (Moss, Ember and Tide recruits, gold and hearts, 10 Basic gold cards) since 0.4.0.

| Preset     | Bot         | Hit | Mean ♥ | P10 | P90 |
| ---------- | ----------- | --- | ------ | --- | --- |
| `tide`     | `lab-human` | 90% | 50.6   | 48  | 56  |
| `tide`     | `mixed`     | 63% | 46.6   | 35  | 54  |
| `tide`     | `smart`     | 64% | 46.6   | 37  | 53  |
| `pacifist` | `lab-human` | 45% | 43.6   | 31  | 53  |
| `pacifist` | `pacifist`  | 36% | 40.9   | 27  | 51  |
| `pacifist` | `smart`     | 25% | 38.8   | 26  | 50  |
| `pacifist` | `mixed`     | 19% | 35.7   | 21  | 49  |

Tide hearts at goal 64: `lab-human` 52% (61.0 ♥). Pacifist at goal 64: `lab-human` 12% (46.6 ♥), `pacifist` 7% (43.2 ♥).

The `pacifist` bot is the one built for the Pacifist preset. `lab-human` matches it there (38% against 39% is within noise).

## Attack only preset

Custom generator `attack` (flip, foes, bulk, weak, push, shift, flush). The river has only enemies, so `lab-human`, `mixed` and `build` play the same moves and give one result. Best hearts above 100 mean a Weak loop.

| Bot            | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| -------------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` \* | 28% | 45.4   | 33     | 13  | 108 | −26   | 334  |

\* The same result for `mixed` and `build`.

## Simple only preset

Custom generator `simple` (no effects), with its start of 5 ● and 3 ⚔ (8 Basics), `lab-human` only. Hit is at goals 48, 64 and 80 (Levels 1 to 3).

| Bot         | L1  | L2  | L3  | Mean ♥ (L3 run) | Median | P10 | P90 |
| ----------- | --- | --- | --- | --------------- | ------ | --- | --- |
| `lab-human` | 71% | 23% | 2%  | 53.6            | 54     | 37  | 70  |

For reference, `lab-human` at 0.2.0 with the usual 10 Basics scored 55%, 9% and 0% on Levels 1 to 3 (47.9 ♥), and 92%, 59% and 17% with 5 Basics. With the 0.3.0 generator and 5 Basics (a start of 3 ● and 2 ⚔) it scored 93%, 65% and 22% (67.4 ♥). Simple has no effects, so the likely cause of that rise is the cost base per card type (cards get slightly more stats per cost), but this was not isolated. The designer's hand runs with 5 Basics beat every bot at Levels 3 and 4.

## Not measured

`none`, `rush`, `lookahead`, `pacifist` outside its own preset and Moss economy, Standard Level 4, and `mixed`, `build` and `smart` on Tide, Pacifist, Attack and Simple. Older figures are in [`docs/history.md`](../../docs/history.md).

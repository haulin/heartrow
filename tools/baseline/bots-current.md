# Current bot benchmark

The one place for the latest greedy bot numbers. Compare a bot change against these tables instead of re-running the baseline. Replace the tables in the same change that keeps a bot or engine change, and list what moved in [`docs/history.md`](../../docs/history.md).

## How to read it

Every table comes from the same command shape, one process per bot, at most seven at a time: `npm run sim -- --games 400 --seeds 100 --seed 1000 --goal <1|2|3|4> --policies <bot>`. Add `--preset <id>` for a preset, and `--effects a,b,c` to replace the effects of a preset. Hit rates have a standard error of about 0.25 points at this size.

Goals: 1 is Standard goal 48 hearts, 2 is 64, 3 is 80 and 4 is 96. Presets are measured at goal 1 unless the heading says otherwise. Mean ♥, median, P10 and P90 are the hearts at the end of the run, so they do not depend on the goal. In the preset tables "Before" columns repeat the measurement without the effects named in the text above that table.

Version 0.3.0. Bots: flush and end turn count only takes the buying policies allow, `lab-human` exiles by deck average (10% drop), and `edgeFollowUp` is in `lab-human`, `mixed` and `build`. `lab-human` values Exile at 7, counts Cycle and Purge as one family when pricing effect copies, values Flush only while it holds fewer than two spare flushes, gives Shift a low value, counts every effect that pays hearts on its card (Vault, Reap, and Flip, Bond, Kin, Army, All3, Hoard, Basics or Pile when their rolled payout is hearts) as a heart card, values a Flip at the mean of its two outcomes for its rolled tier, and starts its heart phase at turn 8 instead of 16 (and its economy phase ends at 3 instead of 6) when the generator has no enemies. `retainAware` holds a Retain Weak card until an enemy is in the row, holds a Retain Shift until no enemy would fall off the Gate and 2 or more resources are left, and holds a plain Retain gain when it opens no new buy and a pricier one is about a turn of income away.

Engine in 0.3.0: Flush effect, Retain on plain recruits and the `keywords` knob, Cycle and Redraw drawing their shortfall from a reshuffle of the cards they just discarded, rolled amounts for Vault, Pile, Basics and All3, Shift in Ember, tiered prices for Draw, Flip, Bond, Exile, Weak and Cheap, a cost base per card type, and one payout currency roll for every effect that pays a resource. The Simple only preset starts with 5 ● and 3 ⚔, and Moss economy with 7 ●.

The bots do not know Reload, Push and Echo (and `smart` and `mixed` do not know Shift or Flush). They give those effects the default value, so a bigger pool lowers their hit rate without making the game harder for a player who uses them.

Only the rows worth reading were re-measured for 0.3.0: Standard Levels 1 to 3 for the four bots, the long run, and each preset for `lab-human` and the bot that suits it. Hit rates under 5% are within noise, so read Levels 2 and 3 for the mean ♥ only.

## Standard goal 48

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 41% | 41.2   | 44     | 26  | 51  | −15   | 69   |
| `mixed`     | 38% | 39.6   | 42     | 23  | 51  | −39   | 83   |
| `build`     | 33% | 38.2   | 41     | 21  | 51  | −33   | 83   |
| `smart`     | 16% | 32.6   | 33     | 16  | 49  | −26   | 61   |

## Standard goal 64

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 9%  | 43.9   | 44     | 26  | 62  | −15   | 81   |
| `mixed`     | 9%  | 42.1   | 42     | 23  | 62  | −39   | 91   |
| `build`     | 6%  | 40.2   | 40     | 21  | 59  | −33   | 83   |
| `smart`     | 1%  | 33.3   | 33     | 16  | 51  | −26   | 80   |

## Standard goal 80

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 1%  | 44.2   | 44     | 26  | 62  | −15   | 91   |
| `mixed`     | 1%  | 42.5   | 42     | 23  | 62  | −39   | 99   |
| `build`     | 1%  | 40.4   | 40     | 21  | 59  | −33   | 100  |
| `smart`     | 0%  | 33.4   | 33     | 16  | 51  | −26   | 85   |

## Standard Long Run

The goal `long`: 200 ♥ in 42 turns, played on to the last turn after the goal (the simulator takes the `continue` move for this goal). It uses 200 games and 10 seeds: `npm run sim -- --games 200 --seeds 10 --seed 1000 --goal long --policies <bot>`.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 |
| ----------- | --- | ------ | ------ | --- | --- |
| `lab-human` | 1%  | 97.3   | 97     | 45  | 149 |
| `mixed`     | 1%  | 83.9   | 82     | 32  | 137 |
| `build`     | 0%  | 79.7   | 79     | 31  | 131 |
| `smart`     | 0%  | 55.5   | 55     | 12  | 100 |

## Moss economy preset

Custom generator `moss` from `src/core/custom.ts`, 24 turns, goal 48: `--preset moss --goal 1 --policies <bot>`. There are no enemies, so `mixed` and `build` play the same moves and give one result.

| Bot         | Hit | Mean ♥ | P10 | P90 |
| ----------- | --- | ------ | --- | --- |
| `lab-human` | 50% | 44.7   | 34  | 52  |
| `smart`     | 17% | 35.2   | 22  | 49  |
| `pacifist`  | 14% | 33.2   | 19  | 49  |
| `mixed` \*  | 7%  | 29.2   | 16  | 45  |

\* The same result for `build`. `lab-human` leads because its hearts phase starts at turn 8 when there are no enemies. The preset starts with 7 Basics of 1 ●. With the usual 10 Basics `lab-human` scored 21%, `smart` 5%, `pacifist` 5% and `mixed` 2%. `lab-human` with 7 Basics also scores 14% at goal 64 and 3% at goal 80.

## Ember combat preset

Custom generator `ember`, 16 effects: draw, flip, exile, foes, pile, hoard, bulk, bond, kin, weak, army, swap, reapP, reload, push and shift. Hit is at goals 48, 64 and 80 (Levels 1 to 3). The mean ♥ is from the goal 80 run.

| Bot         | L1  | L2  | L3  | Mean ♥ | P10 | P90 |
| ----------- | --- | --- | --- | ------ | --- | --- |
| `lab-human` | 65% | 21% | 3%  | 52.3   | 35  | 70  |
| `mixed`     | 74% | 31% | 6%  | 56.1   | 37  | 75  |
| `smart`     | 42% | 8%  | 1%  | 44.5   | 27  | 62  |

## Tide hearts and Pacifist presets

Custom generators `tide` and `pacifist` (effect lists in `src/core/custom.ts`, each with Echo and Flush). Hit is at goal 48. `lab-human` has no enemies to fight here, so it starts its heart phase at turn 8; with the default phase it scored 13% (32.9 ♥) on Tide and 0% (19.7 ♥) on Pacifist.

| Preset     | Bot         | Hit | Mean ♥ | P10 | P90 |
| ---------- | ----------- | --- | ------ | --- | --- |
| `tide`     | `lab-human` | 77% | 48.5   | 41  | 54  |
| `tide`     | `smart`     | 46% | 43.5   | 32  | 51  |
| `pacifist` | `lab-human` | 38% | 42.7   | 32  | 52  |
| `pacifist` | `pacifist`  | 39% | 41.8   | 29  | 51  |

The `pacifist` bot is the one built for the Pacifist preset. `lab-human` matches it there (38% against 39% is within noise).

## Attack only preset

Custom generator `attack` (flip, foes, bulk, weak, push, shift, flush). The river has only enemies, so `lab-human`, `mixed` and `build` play the same moves and give one result. Best hearts above 100 mean a Weak loop.

| Bot            | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| -------------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` \* | 27% | 44.7   | 32     | 13  | 107 | −30   | 284  |

\* The same result for `mixed` and `build`.

## Simple only preset

Custom generator `simple` (no effects), with its start of 5 ● and 3 ⚔ (8 Basics), `lab-human` only. Hit is at goals 48, 64 and 80 (Levels 1 to 3).

| Bot         | L1  | L2  | L3  | Mean ♥ (L3 run) | Median | P10 | P90 |
| ----------- | --- | --- | --- | --------------- | ------ | --- | --- |
| `lab-human` | 77% | 31% | 4%  | 56.4            | 57     | 40  | 73  |

For reference, `lab-human` at 0.2.0 with the usual 10 Basics scored 55%, 9% and 0% on Levels 1 to 3 (47.9 ♥), and 92%, 59% and 17% with 5 Basics. With the 0.3.0 generator and 5 Basics (a start of 3 ● and 2 ⚔) it scored 93%, 65% and 22% (67.4 ♥). Simple has no effects, so the likely cause of that rise is the cost base per card type (cards get slightly more stats per cost), but this was not isolated. The designer's hand runs with 5 Basics beat every bot at Levels 3 and 4.

## Not measured

`none`, `rush`, `lookahead`, `pacifist` outside its own preset and Moss economy, Standard Level 4, and `mixed`, `build` and `smart` on Tide, Pacifist, Attack and Simple. Older figures are in [`docs/history.md`](../../docs/history.md).

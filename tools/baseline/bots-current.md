# Current bot benchmark

The one place for the latest greedy bot numbers. Compare a bot change against these tables instead of re-running the baseline. Replace the tables in the same change that keeps a bot or engine change, and list what moved in [`docs/history.md`](../../docs/history.md).

## How to read it

Every table comes from the same command shape, one process per bot, at most seven at a time: `npm run sim -- --games 400 --seeds 100 --seed 1000 --goal <1|2|3|4> --policies <bot>`. Add `--preset <id>` for a preset, and `--effects a,b,c` to replace the effects of a preset. Hit rates have a standard error of about 0.25 points at this size.

Goals: 1 is Standard goal 48 hearts, 2 is 64, 3 is 80 and 4 is 96. Presets are measured at goal 1 unless the heading says otherwise. Mean ♥, median, P10 and P90 are the hearts at the end of the run, so they do not depend on the goal. In the preset tables "Before" columns repeat the measurement without the effects named in the text above that table.

Version 0.2.0, with flush and end turn counting only takes the buying policies allow, `lab-human` exiling by deck average (10% drop), and `edgeFollowUp` in `lab-human`, `mixed` and `build`. `lab-human` values Exile at 7 and counts Cycle and Purge as one family when pricing effect copies. Weak and Cheap roll an amount of 1 or 2, and every recruit effect can roll Retain at 0.5 budget with its own chance. `retainAware` holds a Retain Weak card until an enemy is in the row.

The bots do not know Reload, Push, Shift and Echo. They give those effects the default value, so a bigger pool lowers their hit rate (about 10 points in Standard) without making the game harder for a player who uses them. The Standard and Long Run tables include the four effects and the difficulty scaling for long turns. The Moss table was measured before them.

## Standard goal 48

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 41% | 41.0   | 44     | 26  | 51  | −15   | 73   |
| `mixed`     | 34% | 38.6   | 41     | 22  | 51  | −26   | 75   |
| `build`     | 30% | 37.4   | 39     | 21  | 50  | −22   | 74   |
| `smart`     | 12% | 31.1   | 31     | 15  | 48  | −28   | 63   |

## Standard goal 64

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 9%  | 43.5   | 44     | 26  | 63  | −19   | 81   |
| `mixed`     | 7%  | 40.4   | 41     | 22  | 60  | −23   | 83   |
| `build`     | 5%  | 39.0   | 39     | 21  | 58  | −20   | 85   |
| `smart`     | 1%  | 31.2   | 31     | 14  | 48  | −26   | 74   |

## Standard goal 80

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 1%  | 43.9   | 44     | 26  | 63  | −19   | 98   |
| `mixed`     | 1%  | 40.7   | 41     | 22  | 60  | −23   | 96   |
| `build`     | 0%  | 39.1   | 39     | 21  | 58  | −20   | 93   |
| `smart`     | 0%  | 31.3   | 31     | 14  | 48  | −26   | 89   |

## Standard goal 96

Only `lab-human` is measured here.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 0%  | 43.9   | 44     | 26  | 63  | −19   | 108  |

## Standard Long Run

The goal `long`: 200 ♥ in 42 turns, played on to the last turn after the goal (the simulator takes the `continue` move for this goal). It uses 200 games and 10 seeds: `npm run sim -- --games 200 --seeds 10 --seed 1000 --goal long --policies <bot>`.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 |
| ----------- | --- | ------ | ------ | --- | --- |
| `lab-human` | 3%  | 100.9  | 99     | 43  | 159 |
| `mixed`     | 0%  | 79.6   | 80     | 30  | 131 |
| `build`     | 0%  | 75.4   | 75     | 25  | 127 |
| `smart`     | 0%  | 52.8   | 52     | 10  | 97  |

## Moss economy preset

Custom generator `moss` from `src/core/custom.ts`, 24 turns, only `smart` is measured: `--preset moss --goal 1 --policies smart`.

| Bot     | Hit  | Mean ♥ | P90 | Moves |
| ------- | ---- | ------ | --- | ----- |
| `smart` | 9.0% | 31.9   | 47  | 208   |

"Moves" is the moves per game. The preset has no Cheap since 0.2.0, so this is the "no Cheap" row below (it was 6.4% / 30.1 / 44 with it).

Variants with the effects replaced (`--effects`), `smart`, goal 1. The effects of the preset with Cheap were draw, flip, exile, cheap, basics, bond, kin and reapG.

| Variant        | Hit   | Mean ♥ | P90 |
| -------------- | ----- | ------ | --- |
| with Cheap     | 6.4%  | 30.0   | 44  |
| no Flip        | 5.4%  | 29.6   | 44  |
| no Cheap       | 9.0%  | 31.9   | 47  |
| no Flip, Cheap | 10.9% | 32.8   | 48  |
| win list       | 7%    | 31.0   | 45  |

"No Flip, Cheap" is draw, exile, basics, bond, kin and reapG. "Win list" is draw, exile, kin, cycle and reapG, the effects of the designer's win at 85 ♥ on turn 19.

## Ember combat preset

Custom generator `ember`, 15 effects: draw, flip, exile, foes, pile, hoard, bulk, bond, kin, weak, army, swap, reapP, reload and push. "Before" removes Reload and Push (`--effects draw,flip,exile,foes,pile,hoard,bulk,bond,kin,weak,army,swap,reapP`). Hit is at goal 48.

| Bot         | Hit | Mean ♥ | P10 | P90 | Before hit | Before ♥ |
| ----------- | --- | ------ | --- | --- | ---------- | -------- |
| `lab-human` | 71% | 46.8   | 37  | 52  | 73%        | 47.2     |
| `mixed`     | 84% | 48.6   | 44  | 53  | 87%        | 49.0     |
| `smart`     | 57% | 44.7   | 33  | 52  | 64%        | 45.8     |

Higher goals, measured with Reload and Push in the pool:

| Bot         | Goal 64 | Goal 80 |
| ----------- | ------- | ------- |
| `lab-human` | 27%     | 5%      |
| `mixed`     | 44%     | 11%     |

## Tide hearts and Pacifist presets

Custom generators `tide` (8 effects) and `pacifist` (12 effects), each with Echo added (the full-copy Echo, price 3). "Before" removes Echo (the effect lists are in `src/core/custom.ts`). Hit is at goal 48.

| Preset     | Bot         | Hit | Mean ♥ | P90 | Before hit | Before ♥ |
| ---------- | ----------- | --- | ------ | --- | ---------- | -------- |
| `tide`     | `lab-human` | 17% | 35.1   | 50  | 21%        | 36.2     |
| `tide`     | `mixed`     | 47% | 43.3   | 52  | 47%        | 43.2     |
| `tide`     | `smart`     | 49% | 43.5   | 52  | 52%        | 44.2     |
| `pacifist` | `lab-human` | 0%  | 20.3   | 30  | 0%         | 20.4     |
| `pacifist` | `mixed`     | 12% | 33.4   | 48  | 13%        | 33.7     |
| `pacifist` | `smart`     | 16% | 35.4   | 49  | 17%        | 35.7     |
| `pacifist` | `pacifist`  | 35% | 40.8   | 51  | 37%        | n/a      |

The `pacifist` bot is the one built for the Pacifist preset: it plays it better than every other bot (34%, against 15% for `smart`). Its "Before" hit is 37% and its mean ♥ before is not recorded.

## Attack only preset

Custom generator `attack` (flip, foes, bulk, weak, push, shift). The river has only enemies, so `lab-human`, `mixed` and `build` play the same moves and give one result (the first row). Best hearts above 100 mean a Weak loop.

| Bot            | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| -------------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` \* | 35% | 51.0   | 35     | 14  | 127 | −46   | 302  |
| `smart`        | 24% | 38.0   | 24     | 3   | 106 | −45   | 279  |

\* The same result for `mixed` and `build`.

## Not measured

`none`, `rush`, `lookahead`, and `pacifist` outside its own preset. Older figures are in [`docs/history.md`](../../docs/history.md) and are from before the generator and flush changes.

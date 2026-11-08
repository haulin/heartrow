# Current bot benchmark

The one place for the latest greedy bot numbers. Compare a bot change against these tables instead of re-running the baseline. Replace the tables in the same change that keeps a bot or engine change, and list what moved in [`docs/history.md`](../../docs/history.md).

Command, one process per bot, at most seven at a time: `npm run sim -- --games 400 --seeds 100 --seed 1000 --goal <1|2|3|4> --policies <bot>`. Goal 1 is Standard goal 48 and goal 2 is goal 64, goal 3 is goal 80, goal 4 is goal 96. Hit rates have a standard error of about 0.25 points at this size.

Version 0.1.0, with flush and end turn counting only takes the buying policies allow, `lab-human` exiling by deck average (10% drop), and `edgeFollowUp` in `lab-human`, `mixed` and `build`. `lab-human` values Exile at 7 and counts Cycle and Purge as one family when pricing effect copies. The Hoard and Bulk effects are in the pool, Weak and Cheap roll an amount of 1 or 2, and every recruit effect can roll Retain at 0.5 budget with its own chance. `retainAware` holds a Retain Weak card until an enemy is in the row; no bot values these effects specially.

## Standard goal 48

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 52% | 43.4   | 48     | 29  | 52  | −9    | 75   |
| `mixed`     | 42% | 41.0   | 44     | 25  | 51  | −12   | 70   |
| `build`     | 38% | 40.0   | 43     | 24  | 51  | −24   | 68   |
| `smart`     | 17% | 33.5   | 34     | 17  | 49  | −22   | 61   |

## Standard goal 64

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 15% | 47.2   | 48     | 29  | 65  | −9    | 84   |
| `mixed`     | 10% | 44.0   | 44     | 25  | 64  | −12   | 89   |
| `build`     | 8%  | 42.4   | 43     | 24  | 62  | −24   | 81   |
| `smart`     | 2%  | 34.3   | 34     | 17  | 52  | −22   | 74   |

## Standard goal 80

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 2%  | 48.0   | 48     | 29  | 67  | −9    | 97   |
| `mixed`     | 1%  | 44.4   | 44     | 25  | 64  | −12   | 98   |
| `build`     | 1%  | 42.7   | 43     | 24  | 62  | −24   | 94   |
| `smart`     | 0%  | 34.4   | 34     | 17  | 52  | −22   | 86   |

## Standard goal 96

Only `lab-human` is measured here.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 0%  | 48.1   | 48     | 29  | 67  | −9    | 112  |

## Moss economy preset

Custom generator `moss` from `src/core/custom.ts`, 24 turns, only `smart` is measured, with the standard size: `npm run sim -- --games 400 --seeds 100 --seed 1000 --preset moss --goal 1 --policies smart`. Mean ♥ and P90 do not depend on the goal, because the goal does not change the generator.

| Bot     | Goal 48 hit | Mean ♥ | P90 | Moves per game |
| ------- | ----------- | ------ | --- | -------------- |
| `smart` | 6.4%        | 30.1   | 44  | 208            |

Variants of the same preset with its effects replaced (`--effects`), `smart`, goal 48, the same size and seeds. Mean ♥ and P90 do not depend on the goal.

| Effects                                                                | Goal 48 hit | Mean ♥ | P90 |
| ---------------------------------------------------------------------- | ----------- | ------ | --- |
| `moss` as it is (draw, flip, exile, cheap, basics, bond, kin, reapG)   | 6.4%        | 30.0   | 44  |
| without Flip                                                           | 5.4%        | 29.6   | 44  |
| without Cheap                                                          | 9.0%        | 31.9   | 47  |
| without Flip and Cheap (draw, exile, basics, bond, kin, reapG)         | 10.9%       | 32.8   | 48  |
| draw, exile, kin, cycle, reapG (the designer's win at 85 ♥ on turn 19) | 7%          | 31.0   | 45  |

Not measured at this version: Long Run, `none`, `rush`, `pacifist`, `lookahead`. Older figures for them are in [`docs/history.md`](../../docs/history.md) and are from before the generator and flush changes.

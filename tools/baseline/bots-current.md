# Current bot benchmark

The one place for the latest greedy bot numbers. Compare a bot change against these tables instead of re-running the baseline. Replace the tables in the same change that keeps a bot or engine change, and list what moved in [`docs/history.md`](../../docs/history.md).

Command, one process per bot, at most seven at a time: `npm run sim -- --games 400 --seeds 100 --seed 1000 --goal <1|2|3> --selection greedy --policies <bot>`. Goal 1 is Standard goal 48 and goal 2 is goal 64, goal 3 is goal 80. Hit rates have a standard error of about 0.25 points at this size.

Version 0.0.9, with redraw and end turn counting only takes the buying policies allow, `lab-human` exiling by deck average (10% drop), and `edgeFollowUp` in `lab-human`, `mixed` and `build`.

## Standard goal 48

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 58% | 44.5   | 48     | 31  | 52  | −8    | 67   |
| `mixed`     | 48% | 42.1   | 46     | 27  | 51  | −13   | 75   |
| `build`     | 43% | 41.3   | 45     | 26  | 51  | −12   | 74   |
| `smart`     | 23% | 35.9   | 37     | 20  | 50  | −16   | 62   |

## Standard goal 64

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 20% | 49.4   | 50     | 31  | 66  | −8    | 88   |
| `mixed`     | 13% | 45.7   | 46     | 27  | 64  | −13   | 79   |
| `build`     | 10% | 44.2   | 45     | 26  | 63  | −12   | 90   |
| `smart`     | 3%  | 37.1   | 37     | 20  | 55  | −16   | 80   |

## Standard goal 80

Goal 3 in the command above.

| Bot         | Hit | Mean ♥ | Median | P10 | P90 | Worst | Best |
| ----------- | --- | ------ | ------ | --- | --- | ----- | ---- |
| `lab-human` | 4%  | 50.6   | 50     | 31  | 71  | −8    | 100  |
| `mixed`     | 2%  | 46.4   | 46     | 27  | 66  | −13   | 96   |
| `build`     | 1%  | 44.6   | 45     | 26  | 63  | −12   | 92   |
| `smart`     | 0%  | 37.2   | 37     | 20  | 55  | −16   | 87   |

Not measured at this version: Long Run, `none`, `rush`, `pacifist`, `lookahead`. Older figures for them are in [`docs/history.md`](../../docs/history.md) and are from before the generator and redraw changes.

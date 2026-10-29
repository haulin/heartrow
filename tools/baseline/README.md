# Baseline capture

These tools pin down how the v7 prototype behaves, so a port can be compared with it statistically. They use plain Node (v22 or later) ES modules and have no dependencies.

- `harness.mjs` loads the script of `prototypes/v7/heartrow-v7.html` into a `node:vm` context with a stubbed DOM and a seeded `Math.random` (mulberry32). It exports `createContext(seed)`, `startGame(env, mode)` and `playGame(seed, mode, policy)`.
- `policies.mjs` is a behaviour-identical copy of the bot policies in `prototypes/v7/bot.js` (`mixed`, `none`, `build`, `rush`, `pacifist`, `smart`).
- `capture.mjs` writes the baseline JSON.
- `RULES.md` lists the rules as the prototype implements them.

## Rerun

```bash
node tools/baseline/capture.mjs --out tests/baseline.json
```

Options: `--games 400` (games per seed, mode and policy), `--samples 100000` (generated cards per turn bucket per seed), `--seeds 5`, `--base-seed 1`, `--goal 48`, `--modes standard,long`, `--policies mixed,build,...`. A full run takes about 35 seconds. The same options give byte-identical output, except `meta.runtimeSeconds`.

## What is recorded

For each mode, the generated-card statistics by turn bucket (kind mix, type mix, mean costs, mean resources, effect share, per-effect frequency, Retain share) and the bot results per policy (goal hit rate in standard, mean, median and p10 final hearts, kills, hearts lost to escapes, turns, cards bought and exiled, deck size, and hearts at turn 24 in long mode).

## Tolerances

Each batch (one seed, one mode, one policy or bucket) gets its own seed derived from `kind|seed|mode|policy or bucket`. Every metric is computed once per seed. The file stores the mean over seeds, the sample standard deviation over seeds (n-1), and `tolerance = max(3 * stddev, 2% of mean)`, plus the per-seed values.

A port should use the same counts (`gamesPerSeed`, `generatedCardsPerBucketPerSeed`) when it compares a single run with the baseline. For other counts, scale the standard deviation by the square root of the count ratio. A metric with a mean of 0 and a standard deviation of 0 (for example kills for `pacifist`) has tolerance 0, so allow a small absolute margin there.

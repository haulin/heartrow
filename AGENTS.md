# Agent instructions

- The single-file prototypes live in `prototypes/v5` to `prototypes/v7`. Treat `v5` and `v6` as frozen references. `v7` is the latest experimental prototype.
- The real project is being built under `src/` (see `DESIGN.md` for the game rules and design decisions).
- Read [`DESIGN.md`](DESIGN.md) before changing the game.
- Keep durable design decisions in `DESIGN.md`.
- Add general workflow and tooling learnings to this file.
- Do not hard-wrap Markdown prose. Keep each paragraph on one line.
- Inspect scripts before running them.
- After substantive edits, run the relevant checks and review linter diagnostics.
- Do not commit anything from `local/`. It holds private planning notes and playtest logs and is excluded from git.

## Visible browser playtests

- Serve the build or prototype directory over local HTTP (for a prototype, serve its folder under `prototypes/`).
- Use the main Agent browser tools for a user-visible playtest. A browser sub-agent may not be able to access the main Agent's tab.
- Create a tab with `browser_tabs` action `new` and `position` `active`.
- Navigate with `browser_navigate` using `position` `active`.
- Lock the tab with `browser_lock` before agent interactions.
- Unlock the tab with `browser_lock` when handing control back to the user.
- Leave the active tab open on the final state when the user wants to inspect it.

## Tooling

- Toolchain: Vite+ (`vite-plus` 1.4.0, project-local `vp` CLI, installed with plain `npm`). It bundles Vite, Vitest, Oxlint, Oxfmt and tsdown, so tests import from `vite-plus/test` and `vite.config.ts` imports from `vite-plus`. It installed and ran cleanly on Node 22, so no fallback was needed. `package.json` overrides pin `vite` to `@voidzero-dev/vite-plus-core` and `vitest` to the bundled version, as the Vite+ manual install guide requires; keep them aligned when upgrading `vite-plus`.
- Other dependencies: `preact` (UI), `@preact/preset-vite` (JSX and HMR), `typescript` (for `tsc -b` only).
- Scripts, kept to five: `npm run dev` (Vite dev server for `src/platform/web`), `npm run build` (static relative-path build into `dist/`), `npm run verify` (`vp check`, then `vp test run`, then `vp build`; this is the one check to run before a commit), `npm run baseline` (slow baseline tests, see below), and `npm run sim` (bot simulator).
- Formatting and lint: Oxfmt and Oxlint through `vp check`; `vp check --fix` fixes formatting. Config is in `vite.config.ts` (4-space indent, no semicolons, single quotes, width 140; `.editorconfig` matches). `prototypes/`, `local/`, `dist/`, `tests/baseline.json` and Markdown are ignored.
- Core purity has two layers. First, `src/core` is typechecked with `lib: ES2022` and `types: []`, so DOM and Node globals do not compile (`vp check` runs this type check). Second, `scripts/check-portability.mjs` bans `Math.random`, `Date`, `document`, `window`, `localStorage`, `structuredClone`, `new Set`, `new Map`, `console.`, timers, `process.`, and imports from `platform`, `node:`, `fs` and `path`. A test runs it over the real `src/core`, so `verify` covers it. Its self-test is `tests/tools/check-portability.test.ts`.
- Import core only through `src/core/index.ts` (the front door), including `format`. Do not import from its subfolders in platform code.
- Bots live in `src/core/ai` (policies are `{ id, weight }`, composed by multiplication, `pickMove` uses the bot's own seeded rng). Profiles reproduce the v7 bots: `mixed`, `none`, `build`, `rush`, `pacifist`, `smart`. `lookahead` is an experimental rollout bot and is not part of the baseline comparison. It does not peek: each rollout reseeds the random streams and reshuffles the deck from a canonical (id-sorted) order, and a test checks that deck order does not change its weights. Policies may keep per-game memory, so build a fresh profile per game with `makeProfile(id)`.
- Simulator: `npm run sim -- --games 400 --mode long --policies mixed,build,smart,pacifist,lookahead --seed 1` prints one summary line per profile like v7 `bot.js`. `tools/sim.mjs` loads `tools/sim.ts` through Vite's SSR loader, because node cannot resolve the extensionless imports of `src/core`. `lookahead` takes about 3 s per long game.
- Baselines: `npm run baseline` runs the slow tests in `tests/baseline/` (generator statistics and all six bot profiles in both modes) against `tests/baseline.json`, which was captured from the v7 prototype by `tools/baseline/capture.mjs`. They are excluded from `verify`. Vitest hides stdout of passing tests, so use `npm run sim` to see numbers.

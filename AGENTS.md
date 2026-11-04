# Agent instructions

- The single-file prototypes live in `prototypes/v5` to `prototypes/v7`. Treat `v5` and `v6` as frozen references. `v7` is the latest experimental prototype.
- The real project is being built under `src/` (see `docs/design.md` for the game rules and design decisions).
- Read [`docs/design.md`](docs/design.md) before changing the game.
- Keep durable design decisions in `docs/design.md`. Keep ideas that are not done in `docs/ideas.md`. Keep finished work and playtest evidence in `docs/history.md` (write to it only for evidence a commit message cannot hold). Do not log bugfixes or small tweaks in any of them.
- Add general workflow and tooling learnings to this file.
- Do not hard-wrap Markdown prose. Keep each paragraph on one line.
- Log every idea the user mentions in chat, even in passing, as one undated line in `docs/ideas.md` in the same turn, under the matching heading. Do not add dates to ideas or notes; git records when. Update the idea's status when it changes. When an idea ships, delete its line, or move one line of evidence to `docs/history.md`.
- Before adding to an existing log, list or notes file, read its first lines for ordering or format rules, and put the new entry where the rules say. For example `local/PLAYTESTS.md` is newest first.
- Inspect scripts before running them.
- Project rules live in `.cursor/rules/`: `no-destructive-actions` and `reframe-before-fork` always apply; `seed-stability`, `minimum-viable` and `visual-convergence` apply to matching files. They are written to be reusable in other projects.
- Discuss design and process questions first. Do not commit, push or change config unless the user asked for it. When a message says "resolve these points", answer and propose, then wait for a go-ahead before committing.
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

- Toolchain: Vite+ (`vite-plus` 1.4.0, project-local `vp` CLI, installed with plain `npm`). It bundles Vite, Vitest, Oxlint, Oxfmt and tsdown, so tests import from `vite-plus/test` and `vite.config.ts` imports from `vite-plus`. It runs cleanly on Node 22. `package.json` overrides pin `vite` to `@voidzero-dev/vite-plus-core` and `vitest` to the bundled version, as the Vite+ manual install guide requires; keep them aligned when upgrading `vite-plus`.
- Dependencies are listed in `package.json`; do not duplicate that list here.
- Versioning: semver, kept only in `package.json`. The build injects it as `__APP_VERSION__` and the About dialog shows it. Do not write version names (v6, v7) into docs or UI. Bump the version in the same change whenever engine behaviour changes (rules, moves, the generator, effects, or anything else that would make a saved run replay differently), because saved runs are tied to the version and are dropped when it differs. Other bumps only when asked.
- Scripts, kept to four: `npm run dev` (Vite dev server for `src/platform/web`), `npm run build` (static relative-path build into `dist/`), `npm run verify` (`vp check`, then `vp test run`, then `vp build`; this is the one check to run before a commit), and `npm run sim` (bot simulator).
- Formatting and lint: Oxfmt and Oxlint through `vp check`; `vp check --fix` fixes formatting. Config is in `vite.config.ts` (4-space indent, no semicolons, single quotes, width 140; `.editorconfig` matches). `prototypes/`, `local/`, `dist/` and `tools/baseline/v7-final.json` are ignored. Markdown is formatted too (one line per paragraph is preserved).
- Core purity has two layers. First, `src/core` is typechecked with `lib: ES2022` and `types: []`, so DOM and Node globals do not compile (`vp check` runs this type check). Second, `scripts/check-portability.mjs` bans `Math.random`, `Date`, `document`, `window`, `localStorage`, `structuredClone`, `new Set`, `new Map`, `console.`, timers, `process.`, and imports from `platform`, `node:`, `fs` and `path`. A test runs it over the real `src/core`, so `verify` covers it. Its self-test is `tests/tools/check-portability.test.ts`.
- Import core only through `src/core/index.ts` (the front door), including `format`. Do not import from its subfolders in platform code.
- Bots live in `src/core/ai` (policies are `{ id, weight }`, composed by multiplication, and `pickMove` uses the bot's own seeded rng). Normal profiles use sampled policy products with ordinary weights; `random` is a uniform control, and the named personalities are `mixed`, `none`, `build`, `rush`, `pacifist`, and `smart`. `lookahead` is an experimental rollout bot. It does not peek: each rollout reseeds the random streams and reshuffles the deck from a canonical (id-sorted) order, and a test checks that deck order does not change its weights. Policies may keep per-game memory, so build a fresh profile per game with `makeProfile(id)`.
- Simulator: `npm run sim -- --games 400 --mode long --policies mixed,build,smart,pacifist,lookahead --seed 1` prints one summary line per profile. Other options include `--goal 1|2|3|4` (Standard target), `--seeds <count>` for consecutive base seeds, `--json`, and `--preset <id>` for a custom generator from `src/core/custom.ts` (for example `--preset pacifist`). In zsh an unquoted variable is not word-split, so put each option in the command itself. `tools/sim.mjs` loads `tools/sim.ts` through Vite's SSR loader, because node cannot resolve the extensionless imports of `src/core`. `lookahead` takes about 3 s per long game. `--replay <file>` replays a "Copy run" record (the log dialog's button) and prints the turn, hearts and deck stats, which is how to read a run a player sends in. `--worst <file>` scans the selected profiles and seeds and writes the lowest-heart bot run as a pasteable record; open the game header, choose "Paste replay", and use "Next move" to inspect it. `--explain <file> --move <n>` rebuilds the bot state before one move and prints every policy factor for every legal move. The reference run in `tests/fixtures/reference-run.json` is checked by `tests/web/reference-run.test.ts`: when engine behaviour changes on purpose, bump the version and update its inline snapshots.
- The simulator evaluates profiles sequentially in one Node process. For expensive comparisons, run one `npm run sim` process per profile in parallel with identical game, seed, goal and selection options, then `wait` for the background processes; keep the batch to at most seven concurrent simulator processes when sharing the machine with the IDE.
- v7 parity was a one-off check during the rewrite, not a regular test. The result is in `tools/baseline/V7_PARITY.md` and the v7 numbers are in `tools/baseline/v7-final.json`. The harness that ran the prototype headless and the slow comparison tests were removed; get them back from git history if a comparison is needed again.

## Environment hiccups

- The sandbox blocks some git writes (for example `git init` and hook directories). Run those commands with `all` permissions.
- A server started with `(cmd &)` inside a foreground command dies when the call ends. Start long-running servers as a background shell command (`block_until_ms` 0), and kill them by port when done.
- macOS: there is no `timeout` command, `sed -i` needs an empty backup argument (`sed -i '' ...`), and `rg` has no `-E` flag. Edit files with the edit tools (StrReplace, Write), not with `python3` or `sed`, because Cursor does not show the changes of a script. Use scripts only for generated output.
- The Read tool prefixes lines with line numbers. They are not part of the file.
- Before a destructive-looking experiment in `src/core` (for example a deliberately bad file to test a check), delete it in the same command and confirm it is gone.
- Vitest hides stdout of passing tests. Use `npm run sim` to see numbers.

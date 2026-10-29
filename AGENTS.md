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
- Scripts: `npm run dev` (Vite dev server for `src/platform/web`), `npm run build` (static relative-path build into `dist/`), `npm test` (Vitest, `tests/**/*.test.ts`), `npm run typecheck` (`tsc -b` over `tsconfig.core.json` and `tsconfig.web.json`), `npm run check:portability`, and `npm run verify` (typecheck, portability, test, build).
- Core purity: `src/core` is typechecked with `lib: ES2022` and `types: []`, so DOM and Node globals do not compile. `scripts/check-portability.mjs` also bans `Math.random`, `Date`, `document`, `window`, `localStorage`, `structuredClone`, `new Set`, `new Map`, `console.`, timers, `process.`, and imports from `platform`, `node:`, `fs` and `path`. Its self-test is `tests/tools/check-portability.test.ts`.
- `vp check` (format and lint) is not part of `verify`, because it would also reformat `prototypes/`. Run it on specific paths if wanted.

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

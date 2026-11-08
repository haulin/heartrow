# Heartrow

A small roguelike deckbuilder for the browser. Five cards drift across a recruit row from left to right. Buy recruits with gold, defeat enemies with power, and collect hearts. An enemy that falls off the right edge costs you hearts. Every card is generated as it enters the row, so no two runs are alike.

The game is an early work in progress. The rules and design decisions are in [`docs/design.md`](docs/design.md).

## Run it

You need Node 22 or later.

```bash
npm install
npm run dev
```

Other scripts:

- `npm run build` creates a static build in `dist/`.
- `npm run verify` runs format, lint, type checks, tests and a build. Run it before a commit.
- `npm run sim` plays bot games and prints balance numbers, for example `npm run sim -- --games 400 --goal long`.

A run can be shared and replayed with a seed: `?seed=123&mode=standard&goal=long` in the URL.

## How the project is organised

- `src/core` is the game: pure TypeScript with no platform dependencies, seeded randomness, and a small set of moves.
- `src/platform/web` is the Preact web front end.
- `prototypes/` holds the original single-file prototypes, kept as history.

Contributor and agent instructions are in [`AGENTS.md`](AGENTS.md).

## Licence

No licence yet. All rights reserved for now.

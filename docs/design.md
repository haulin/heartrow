# Heartrow design

## Purpose

Heartrow is a small, single-player roguelike deckbuilder. A run lasts a fixed number of turns. The player builds a deck of procedurally generated recruits, defeats enemies, and collects hearts.

The working instructions are in [`AGENTS.md`](../AGENTS.md). This document holds the durable design decisions. Ideas that are not done are in [`ideas.md`](ideas.md). Finished work and playtest evidence are in [`history.md`](history.md).

## Principles

- Core and platform stay apart. `src/core` is the game: plain TypeScript with no platform dependencies. `applyMove(state, move)` returns a new state and a list of events, and all randomness comes from seeded streams stored in the state. A platform only draws the state and sends moves.
- Modes, presets and generator limits are data, not code. A difference in numbers or names is a field. A difference in behaviour is a function-valued field on a small record. No inheritance and no `if (variant === 'x')` in shared code.
- Seed stability. A seed makes the same run. Generator limits only redirect results and never change the random draws, so a generator that allows everything makes the same cards as no generator. Undo replays random outcomes identically.
- Events carry presentation. `applyMove` returns `{ state, events }` with plain-data events. The web animation layer plays them as a queue, so the state is already final and animation is only presentation that can be skipped. The game log and statistics read the same events. Bots and the simulator ignore them.
- Core hands out neutral data (type, cost, effect text). Colours, glyphs, layout and settings (theme, animation speed) belong to the platform and never to the game state.
- Reasoning lives here, not in code comments. Do not implement an open question as if it were approved.
- Prefer small changes that improve decisions or remove confusion.

## Where things live

- `src/core` is the game. It owns the rules, the card generator and its limits, modes, presets, the effect registry and the bots. Other platforms use only `src/core/index.ts`.
- `src/platform/web` is the Preact front end. It owns links and the address bar, dialogs, animation, skins and styling. Reading and writing links (`mode.ts`, `custom.ts`) is web only; the data a link describes is core.
- `tools/` holds the simulator. It uses core only.
- `prototypes/` holds the original single-file prototypes. They are frozen references and history, not the specification. When the prototypes and the code disagree, the code and this document win.

## Player experience

The game should be playable without a tutorial. The player should understand the row, the two currencies, the edge penalty, and the current goal from the screen and the card text.

The central decision is positional:

- Five cards move from left to right.
- A new card enters on the left.
- Taking a card removes it and shifts the cards on its left toward the edge.
- The card on the right leaves at the end of the turn.
- An enemy that leaves the row removes its hearts from the player's score.

This makes buying a card beside an enemy a meaningful choice. Buying the edge card also moves its left neighbour to the edge.

## Rules

- Gold buys recruits. Power defeats enemies. Hearts are the score.
- Gold and power are turn-local. They do not carry over.
- Recruits enter the discard pile. Enemies never enter the deck.
- The starter deck has six Basic gold cards and four Basic power cards.
- The hand normally draws five cards.
- Retain cards stay in hand when unplayed.
- Flush replaces the four left cards and leaves the edge card in place.
- Reaching the goal wins only when the turn ends.
- “Play simple” plays cards without worded effects.
- Exile is optional. The player can skip it. It can target any hand card, or a recruit in river slots 1–4; enemies and the right-edge card are not valid targets. Exiling a river recruit refills the left edge.
- Undo is permissive: any move except ending the turn can be undone, back to the start of the turn. Random outcomes replay identically, so undo cannot fish for luck.

Cards are generated when they enter the row. Their type, resources, effects, and art come from the generator budget. There is no row deck.

The exact order of events in a turn is defined by `endTurn` in `src/core/moves.ts` and its tests.

### Modes

Modes are data (`ModeConfig` in `src/core/modes.ts`), not code.

- **Standard** lasts 24 turns. The goal is 48, 64, 80 or 96 hearts (`goal` 1 to 4). `goal` is apart from the mode id.
- **Custom** is Standard with a generator: which card types, resources and effects may appear, and how many Basic gold and power cards you start with. The settings are plain data (`CustomGenerator` in `src/core/custom.ts`) with a small library of presets (Standard, Simple only, Attack only, Pacifist, Moss economy, Tide hearts, Ember combat). The web layer puts them in the link, so a run can be shared (`?mode=custom&goal=2&types=…&res=…&sg=…&sp=…&fx=…&seed=N`).
- **Long Run** lasts 42 turns, postpones the win check, and reports final hearts as a high score. Turns 1–24 use the standard cost curve. Turns 25–36 add one cost step and use 40% enemy frequency. Turns 37–42 add a second cost step and use 45% enemy frequency. Late pure-resource filler is bounded and rerolled more often from turn 21 (`lateFillerFromTurn`), while utility cards stay eligible. The run grants one flush every three turns; a four-turn cadence left too little row control late in the run.

Links: `?seed=N&mode=standard&goal=2`, `?seed=N&mode=long`. Starting any new game rewrites the address, so a reload replays the same run.

### Screens

There are five screens, home, game, Standard, the challenge picker and the generator editor, and the address says which. An address with no `mode` or `seed` is the home screen; one with either starts that run directly; `?screen=custom` plus the generator settings is the editor, `?screen=standard` is the Standard picker (the four levels and Long Run as big buttons, each showing its best result), and `?screen=challenges` is the challenge picker, and none of them starts a run by itself. The challenge picker's address also names the card and goal (`&challenge=moss&goal=3`, or `goal=long`), kept up to date as the player moves, so a reload or a link opens the same place. The home screen lists Resume (only when a run is in memory), Standard, Challenges, Settings and About. The challenge picker is one screen high: a scroll-snapping row of cards (Standard, the generator presets of `src/core/custom.ts`, and Custom last), round icon dots that jump to a card, the goals of the current card in a list that scrolls (Level 1 to 4, and Long Run for Standard only), and Start pinned at the bottom. A card shows one star per goal. A finished run is credited to a challenge goal by its mode, or for a custom run by its generator matching a preset at any goal, and the best hearts and the win are kept in `localStorage` (`results`). Replays do not count, Custom keeps no results, and Long Run keeps the best hearts without a win. Every screen change adds a history entry, so Back returns to the screen you came from. An address that matches the run in memory resumes it, and any other game address starts that run.

The editor keeps its settings in the address as you change them, so a reload or a copied address gives the same editor. It opens from the home screen (with the settings of the last run, if there is one) and from the run dialog's "Open in the generator editor" button (with the settings of the run on screen; a Standard run opens with the defaults at its goal). Back from the editor returns to where you came from, for example the run; Start begins a new custom run and replaces the one in memory. The screen state is web only; core knows nothing about screens.

The game screen has only game actions in its button bar (End turn, Play simple, Flush, Undo, Skip exile). Home sits at the top left; New game, Settings and About are on the home screen. The header's other button shows the mode in its own look (see "Look of modes", for example Moss economy for a preset run, otherwise Standard, Custom or Long Run) with an info icon, and opens a dialog with the level, goal, turns, the generator summary of a custom run, and the seed with its copy buttons.

### Saved run

The web layer saves the current run in `localStorage` after every accepted move, undo and new game. The save is the run's address (mode, goal, seed, generator settings), the accepted moves and the app version. The core is pure and its random streams live in the state, so replaying the moves rebuilds the exact run, including the undo stack of the current turn. A reload (for example when the browser drops a background tab) resumes it: an address that names the saved run replays it however far it got, and a plain home address offers Resume. A finished run stays resumable until a new game replaces it. Any other game address starts that run and replaces the save. A save from another version, or one the rules refuse to replay, is dropped. For that reason the version in `package.json` is bumped whenever engine behaviour changes. The log dialog's "Copy run" button copies the same record, so a run can be replayed for a bug report (`npm run sim -- --replay <file>`). A real played run is kept as a reference (`tests/fixtures/reference-run.json`); a test replays it and checks the end state, so a change to engine behaviour cannot slip through unnoticed.

## Card generation

- Recruit cost is a converted budget, not a direct value sum: a recruit with base cost `C` starts with `C × .85 + .3` budget. The row may display a lower current price when a recruit discount is active.
- Direct gold and power each cost `1`, hearts cost `1.5`, and effects consume their listed budget. Integer resource gains can leave a fractional remainder below `1`; this is intentional. For example, a base-cost-12 card with `+2 ● +4 ⚔ +3 ♥` uses `10.5` budget exactly, while a base-cost-11 card with `+8 ● +1 ⚔` leaves `0.65`.
- Enemy budget is the cost times `1.4`. The displayed cost is recomputed from the budget actually spent.
- Direct gains are one unit at a time. Recruits keep their existing lean and resource distribution. Enemies have a 15% chance to spend part of their budget on Gold or Power instead of Hearts; the alternate gain is `max(1, floor(cost × .4))`, and its budget is reserved before effects and Hearts are generated.
- Draw is one scalable effect. It costs `1.5` budget per card, so a generated card can draw 1 to 4 cards when it has enough budget.
- Any recruit effect can roll Retain. Each effect sets its own `retain` terms (budget price and chance), taken from three tiers in `generator/budget.ts`. The price is always `0.5`. The chance follows how often waiting helps: 50% for `exile`, `cycle`, `cheap`, `weak`, `foes`, `all3`, `pile`, `reapG` and `reapP`; 30% for `swap`, `bond`, `kin`, `basics`, `flip` and `purge`; 10% for `army`, `hoard`, `vault` and `draw`. About a third of effect recruits carry Retain. Retain is free only for the next draw: kept cards still take room among the cards you draw, and Purge discards them. Enemies never roll Retain.
- Scaled conditional effects should use simple magnitude pricing of roughly `3` budget per level; test the exact values for discounts and per-enemy effects before resolving them.
- Direct `♥` resources are intentionally less common on Moss and Ember recruits than on Tide recruits; dedicated heart effects remain the stronger heart-building identity. Once a recruit gets a direct heart, generation favours another heart so multi-heart cards remain meaningful.
- The two discard effects are `cycle`, which keeps Retain cards and costs more, and `purge`, which discards Retain cards too and costs less. Both lean Tide.
- `swap` exchanges gold and power. It leans Moss and Ember and gives a gold engine an outlet for defeating enemies.
- `exile` gets one extra selection weight on Moss and Ember recruits while Tide stays its strongest type.
- Rolled output parameters live in `Card.fxParams`. Kin can produce Hearts on Tide when Hearts are enabled; Basics, Pile and Coin use the card's generated output currency. Parameterized output remains visible in card text and is priced before the remaining budget is spent.
- `weak` and `cheap` roll an amount of 1 or 2 (shared `discount.ts`). Price is `3 × amount − 1.5`: 1.5 for −1 and 4.5 for −2, so the second rung needs much more budget. `weak` reads "Enemies need −N ⚔ this turn", `cheap` "Recruits cost −N ● this turn", and `bulk` also says "Needs".
- `hoard` pays `+N` of the card's main currency per D cards in the deck (hand, draw pile and discard; not exile), with N 1 to 2 and D 4 to 6. Its price is `0.75 × N × 16 / D`: 16 is the reference deck size, and the factor allows for the smaller decks of early turns. It can also roll on enemies. `basics`, `pile`, `vault` and `hoard` share one count-gain helper.
- `bulk` is an enemy-only passive effect: the enemy costs 1 ⚔ less per 4 cards in your deck, down to 0. The generator rolls the enemy's normal cost and budget, then prints the cost of a 16-card deck on top, so a thinner deck pays more and a fatter one pays less. Its price is 0; the reward is that of the normal cost. It exists to punish thin decks, which every logged Level 4 win used.
- `foes` counts the enemies in the row before the defeated enemy is replaced, including the enemy being defeated and excluding the newcomer.

### Generator limits

`GeneratorConfig` (on `ModeConfig`) lists the allowed card types (Moss, Ember, Tide, enemies), resources (gold, power, hearts) and effects. `generatorLimits` in `src/core/generator/limits.ts` turns it into what can really be made.

- Plain gains, hearts and the Kin and Army currency are redirected to an allowed resource. Gold can be switched off too; the core falls back to gold only when no currency is allowed. Basics, Pile and Coin use an allowed output currency, and Kin may use Hearts for Tide.
- Enemies need power (to defeat) and hearts (to pay out), so they are off when either is.
- `EffectDef.needs` and `needsAny` list what an effect requires (resources, enemies, colours, the exile effect). The generator skips an effect whose need is off. A tripwire test lists every effect's needs, so a new or changed effect is noticed.
- The random draws are the same whatever the limits are. A test checks that "allow everything" equals no generator.

## Interface conventions

- The deck summary breaks effects down by what they give: gold, power, hearts, and other. Each effect counts once per card. Bond and same-type effects count as gold or power based on the card. Other covers draw, exile, discounts, swap, and discard effects.
- Reaping uses a small heart pill on the gold or power stat box. It shows one heart per reaping card in play, displays `♥x4` above three cards, and explains the current heart total in the tooltip.
- Retain uses a regular-weight `↺` line.
- Text selection is disabled in the game area and enabled inside popups so the log can be copied.
- Compact resource values use coloured `●` gold, `⚔` power, and `♥` hearts icons on cards and in the log. Explanatory labels and accessible names keep the resource words.
- The fifth row card shows a lock marker because flush replaces only the four cards to its left. The flush log states that the right-edge card cannot be flushed.
- The log uses one copied line per entry instead of paragraph spacing.
- Enemy defeat logs combine resolved direct heart payouts with the base enemy hearts and append any extra gold or power in the same compact resource line.
- The game shows the package version (semver from `package.json`) in the About dialog.

### Look of modes, icons and colour (any theme or skin keeps these)

- A mode has one look, an icon and an accent colour, and it shows the same everywhere: on its card in the challenge picker, on the game header's mode button (icon on the left, ring and tint in the accent), and on the dots, the selected goal and the pressed states of the picker. The looks are one table, `PRESET_LOOKS` in `src/platform/web/challenges.ts`, with one line per preset. A test fails when a preset has no look or its icon file is missing. Adding a mode is a preset in `src/core/custom.ts`, a line in that table, and an icon file.
- Icons are one-colour SVG files in `src/platform/web/glyphs/`, drawn in the text colour with a CSS mask by the `Glyph` component; a new file is picked up by name with no other edit. Multi-colour artwork (coin, swords, heart, retain, lock) lives in `icons/` and is drawn as a background image. Never use a character the font lacks (arrows, ⓘ, ✓, ×, ›): the browser takes it from another font and sizes it differently. Use a glyph, or a plain letter.
- Colours come from the theme variables (`--moss`, `--ember`, `--gold`, `--heart` and so on), never a fixed hex, so light and dark both work. Surfaces are flat: a tint is `color-mix` of the accent into the background, and a ring is a border or an inset shadow. No gradients, shines or drop shadows.
- A goal's result is a star and the hearts in the same gold when won, `best N ♥` when only played, and "not played" otherwise. The best hearts never go down and a win is never taken away. Stars are drawn shapes, not characters.
- Screens scale with the width of the play area (container units with a minimum and a maximum), so a wide desktop screen grows type, buttons and rows and does not just stretch them. Buttons in one header row are the same height.
- Scrolling rows use the browser's own scroll-snap, so touch, wheel and trackpad momentum are native. A mouse drag is a bonus on top, and dots jump to an item. The row reports its item when it stops, so a jump does not flicker through the items between. Custom scroll physics is not worth the browser differences.
- Where a screen is, and what it shows, is in the address (the picker's card and goal, the editor's settings), so a reload, a dropped background tab or a link opens the same place. Leaving a screen and coming back keeps its position.
- A warning that is not urgent sits quietly below the action it concerns, not at the top of the screen.
- A render error shows a dialog, and the next hot update (or closing it) reloads the page; the saved run survives. Preact cannot keep the old screen behind it.

## Design boundaries

- Keep the power colour red.
- Keep enemies violet with dashed borders and `Defeat:` effect text.
- Keep Moss, Ember, and Tide as the three gem types.
- Keep the edge-slot outline and the fixed five-card geometry.
- Keep the intentional hand overlap above five cards. Improve focus and semantic state instead of replacing the layout.
- Keep the verbose, copyable log.
- Keep pending actions and played-card state clear to assistive technology.
- Do not add new effects before outside players test the current effect set.

The next validation step is to let three to five people play without explanation. Fix problems that several players encounter. Avoid a long polish phase before that test.

## External signals and guardrails

Review research is evidence and inspiration, not a specification. These are things Heartrow should avoid becoming:

- A thin deck should not be the automatic best strategy.
- Mono-colour decks should remain viable without becoming an easy win; cross-colour choices should reward thought.
- Turns should not collapse into “draw a pile, make huge resources, then buy the most expensive cards”.
- A score target can remain the core of the short run, but some players will want modes or objectives with more texture than score attack alone.

Players have also praised the source game's art, polish, and music. Those are quality signals, not a reason to copy its theme, presentation, or card content.

## Rule decisions

Some quirks come from the original prototype. The core keeps them unless listed here as changed.

- **Goal undone by an escape (kept, undecided).** Win is checked when the turn ends, after enemies escape. An enemy that escapes on the last step can still undo a reached goal. See "Win check" in [`ideas.md`](ideas.md).
- **Late filler reroll (kept).** In long mode, from turn 21 onward, a generated card that is only pure gold or power filler is rerolled more often. The turn-21 start was a side effect of an earlier remark, not a tuned value. It is a mode-config field, so it can be moved.
- **Enemies can cost 0 (accepted).** After `weak` or discounts an enemy can cost 0 to defeat. Revisit a minimum cost if play data shows a problem (see "Free enemies" in the ideas).
- **Undo (settled).** Undo is a planning tool, not cheating. The current turn is a reversible workspace and End turn is the commitment boundary. The web session keeps a per-turn stack of snapshots: every accepted move except ending the turn can be undone back to the start of the turn. The RNG streams are part of the state, so a replayed move gives the same random result. Ending the turn clears the stack.
- **Defeat log shows the base cost (kept).** The log line for a defeat shows the printed cost, not the discounted cost paid. Seeing full prices feels good. Revisit if it confuses players.
- **Last-turn refill (kept).** The final `endTurn` still generates one row card before the game ends. It is harmless.

## Bots and balance

- Bots live in `src/core/ai`. A bot is a list of policies. Each policy returns a non-negative factor for every legal move; the factors are multiplied, `0` vetoes a move, and the profiles take the move with the highest product (ties go to the first legal move). The `random` profile has no policies and samples uniformly as a control. These bots give a relative balance signal, not a substitute for human play.
- Policies cover turn order and hand use (`playsFirst`, `retainAware`, `drawFirst`, `effectCardsFirst`, `exileChoices`), row priorities (`buyEnemies`, `buyBuild`, `buyValue`, `noRecruits`, `rush`, `pacifist`, `smartBuy`), flush control (`protectEdge`, `flushWhenStuck`, `smartFlush`), and turn completion (`endTurnWhenDone`). Flush weights belong to the flush policies (`flushWhenStuck`, `smartFlush`, `protectEdge`) and end turn to `endTurnWhenDone`; neither policy sets the other's weight. Both are given the profile's buying policies and count a legal take as something to buy only when none of them vetoes it. Most preference factors use the ordinary 1–10 range; zero remains a deliberate veto, and small factors keep flush and ending the turn as last-resort actions.
- The named profiles are `mixed` (balanced fighter), `none` (no recruits), `build` (early deck building), `rush` (early recruiting only), `pacifist` (no combat and engine cards), and `smart` (unified purchase and flush scoring). `lookahead` remains a separate, greedy rollout experiment.
- Bots select greedily by default. Sampled selection (`--selection sample`) remains available for randomness experiments, but it is a failed experiment and not a bot-balance benchmark.
- The current bot comparison is recorded in `tools/baseline/bots-current.md`. These figures are balance signals, not targets. Earlier measurements and the experiments behind the bots are in [`history.md`](history.md).
- The Long Run bot flushes before defeating an affordable right-edge enemy when another enemy sits to its left, so that left enemy does not become the new escape threat.
- The core was checked against the original prototype over 100 seeds. The generator matches. The bots are 2–4% stronger than the prototype and that was accepted. The report is in `tools/baseline/V7_PARITY.md`.
- Run the simulator with `npm run sim`.

## Making changes

1. Make one focused change.
2. Run `npm run verify`.
3. If generation or effects change, run `npm run sim` for crashes and large balance changes, in both modes.
4. Test the page in a browser at about 360 px and 760 px wide.
5. Check the row, seven-card hands, popups, flushes, Retain, exile, and undo.
6. Record a design decision here before changing the rules.

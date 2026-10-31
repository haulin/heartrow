# Heartrow design

## Purpose

Heartrow is a small, single-player roguelike deckbuilder. A run lasts a fixed number of turns. The player builds a deck of procedurally generated recruits, defeats enemies, and collects hearts.

The working instructions are in [`AGENTS.md`](AGENTS.md). Durable design decisions live in this document.

## Where things live

- `src/core` is the game. It is plain TypeScript with no platform dependencies: `applyMove(state, move)` returns a new state and a list of events, and all randomness comes from seeded streams stored in the state.
- `src/platform/web` is the Preact web front end. Other platforms (terminal, TIC-80, Capacitor) are planned and must use only the public surface of `src/core/index.ts`.
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
- Redraw replaces the four left cards and leaves the edge card in place.
- Reaching the goal wins only when the turn ends.
- “Play simple” plays cards without worded effects.
- Exile is optional. The player can skip it.
- Undo is permissive: any move except ending the turn can be undone, back to the start of the turn. Random outcomes replay identically, so undo cannot fish for luck (see [Rule decisions](#rule-decisions)).

Cards are generated when they enter the row. Their type, resources, effects, and art come from the generator budget. There is no row deck.

The exact order of events in a turn is defined by `endTurn` in `src/core/moves.ts` and its tests.

### Modes

Modes are data (`ModeConfig` in `src/core/modes.ts`), not code.

- **Standard** lasts 24 turns. The goal is 48, 64, or 80 hearts depending on the level.
- **Long Run** lasts 42 turns, postpones the win check, and reports final hearts as a high score. Turns 1–24 use the standard cost curve. Turns 25–36 add one cost step and use 40% enemy frequency. Turns 37–42 add a second cost step and use 45% enemy frequency. Late pure-resource filler is bounded and rerolled more often from turn 21 (`lateFillerFromTurn`), while utility cards stay eligible. The run grants one redraw every three turns; a four-turn cadence left too little row control late in the run without improving the score meaningfully.

## Card generation

- Recruit cost is a converted budget, not a direct value sum: a recruit with base cost `C` starts with `C × .85 + .3` budget. The row may display a lower current price when a recruit discount is active.
- Direct gold and power each cost `1`, hearts cost `1.5`, and effects consume their listed budget. Integer resource gains can leave a fractional remainder below `1`; this is intentional. For example, a base-cost-12 card with `+2 ● +4 ⚔ +3 ♥` uses `10.5` budget exactly, while a base-cost-11 card with `+8 ● +1 ⚔` leaves `0.65`.
- Enemy budget is the cost times `1.4`. The displayed cost is recomputed from the budget actually spent.
- Draw is one scalable effect rather than separate effects per size. It costs `1.5` budget per card, so a generated card can draw 1 to 4 cards when it has enough budget.
- Retain costs `0.5` budget.
- Scaled conditional effects should use simple magnitude pricing of roughly `3` budget per level; test the exact values for discounts and per-enemy effects before resolving them.
- Direct `♥` resources are intentionally less common on Moss and Ember recruits than on Tide recruits; dedicated heart effects remain the stronger heart-building identity. Once a recruit gets a direct heart, generation favours another heart so multi-heart cards remain meaningful.
- The two discard effects are `cycle`, which keeps Retain cards and costs more, and `purge`, which discards Retain cards too and costs less. Both lean Tide.
- `swap` exchanges gold and power. It leans Moss and Ember and gives a gold engine an outlet for defeating enemies.
- `exile` gets one extra selection weight on Moss and Ember recruits while Tide stays its strongest type.
- `foes` counts the enemies in the row before the defeated enemy is replaced, including the enemy being defeated and excluding the newcomer.

## Interface conventions

- The deck summary breaks effects down by what they give: gold, power, hearts, and other. Each effect counts once per card. Bond and same-type effects count as gold or power based on the card. Other covers draw, exile, discounts, swap, and discard effects.
- Reaping uses a small heart pill on the gold or power stat box. It shows one heart per reaping card in play, displays `♥×4` above three cards, and explains the current heart total in the tooltip.
- Retain uses a regular-weight `↺` line.
- Text selection is disabled in the game area and enabled inside popups so the log can be copied.
- Compact resource values use coloured `●` gold, `⚔` power, and `♥` hearts icons on cards and in the log. Explanatory labels and accessible names keep the resource words.
- The fifth row card shows a lock marker because redraw replaces only the four cards to its left. The redraw log states that the right-edge card cannot be redrawn.
- The log uses one copied line per entry instead of paragraph spacing.
- Enemy defeat logs combine resolved direct heart payouts with the base enemy hearts and append any extra gold or power in the same compact resource line, including power from row enemies or the discard pile and gold from Basics.
- The game shows the package version (semver from `package.json`) in the About dialog.

## Design boundaries

- Keep the power colour red.
- Keep enemies violet with dashed borders and `Defeat:` effect text.
- Keep Moss, Ember, and Tide as the three gem types.
- Keep the edge-slot outline and the fixed five-card geometry.
- Keep the intentional hand overlap above five cards. Improve focus and semantic state instead of replacing the layout.
- Keep the verbose, copyable log.
- Keep pending actions and played-card state clear to assistive technology.
- Do not add new effects before outside players test the current effect set.
- Prefer small changes that improve decisions or remove confusion.
- Exile stays optional; forced exile was rejected.

The next validation step is to let three to five people play without explanation. Fix problems that several players encounter. Avoid a long polish phase before that test.

## External signals and guardrails

Review research is evidence and inspiration, not a specification. These are things Heartrow should avoid becoming:

- A thin deck should not be the automatic best strategy.
- Mono-colour decks should remain viable without becoming an easy win; cross-colour choices should reward thought.
- Turns should not collapse into “draw a pile, make huge resources, then buy the most expensive cards”.
- A score target can remain the core of the short run, but some players will want modes or objectives with more texture than score attack alone.

Players have also praised the source game's art, polish, and music. Those are useful quality signals, but they do not justify copying its theme, presentation, or card content.

## Terms from the review research

- `Gauntlet` in Gemblades unlocks after Invasion V and combines the five invasions into a harder mode with starting-deck customization and its own leaderboard. Calling Invasions I–V a “tutorial” is a reviewer's interpretation of their low skill floor and score-attack structure, not the formal name of the mode.
- `Hoard` is not identified as a Gemblades mode in the current Steam store or update material I checked. It may refer to another game or a different source; keep this unresolved until the original review or announcement is identified.
- `Familiars` are summoned companion units in Gemblades, a separate layer from ordinary recruited cards. The current rules make them unique, cap them at twelve, remove the oldest when a thirteenth is summoned, and let newly summoned familiars act immediately.
- `Fanservice` describes an aesthetic choice, usually attractive or sexualized anime character presentation made partly for audience appeal. It is not a gameplay system.

## Rule decisions

Some quirks come from the original prototype. The core keeps them unless listed here as changed.

- **Goal undone by an escape (kept).** Win is checked when the turn ends, after enemies escape. An enemy that escapes on the last step can still undo a reached goal. This will likely change; see "Stop early or carry on" in the parked ideas.
- **Late filler reroll (kept).** In long mode, from turn 21 onward, a generated card that is only pure gold or power filler is rerolled more often. The turn-21 start was a side effect of an earlier remark, not a tuned value. It is a mode-config field, so it can be moved.
- **Enemies can cost 0 (accepted).** After `weak` or discounts an enemy can cost 0 to defeat. Revisit a minimum cost if play data shows a problem.
- **Cycle and purge discard order (to judge in the UI).** These effects discard after drawing. Check how it looks once animations exist.
- **Undo (changed).** The prototype blocked undo after a draw, coin flip, cycle, take or redraw to prevent cheating. The payoff of cheating is small, and being unable to undo a misplay is worse. The web session keeps a per-turn stack of snapshots: every accepted move except ending the turn can be undone. The RNG streams are part of the state, so a replayed move gives the same random result. Ending the turn clears the stack.
- **Defeat log shows the base cost (kept).** The log line for a defeat shows the printed cost, not the discounted cost paid. Seeing full prices feels good. Revisit if it confuses players.
- **Last-turn refill (kept).** The final `endTurn` still generates one row card before the game ends. It is harmless.

## Bots and balance

- Bots live in `src/core/ai`. A bot is a list of policies. Each policy scores every legal move, the scores are multiplied, and the bot picks a move. They give a relative balance signal, not a substitute for human play.
- Current figures for the Long Run (400 games): Mixed about 67–70 hearts, Smart about 55, and the experimental `lookahead` about 82. These are starting balance signals, not targets.
- The Long Run bot redraws before defeating an affordable right-edge enemy when another enemy sits to its left, so that left enemy does not become the new escape threat.
- The core was checked against the original prototype over 100 seeds. The generator matches. The bots are 2–4% stronger than the prototype and that was accepted. The report is in `tools/baseline/V7_PARITY.md`.
- Run the simulator with `npm run sim`.

## Making changes

1. Make one focused change.
2. Run `npm run verify`.
3. If generation or effects change, run `npm run sim` for crashes and large balance changes, in both modes.
4. Test the page in a browser at about 360 px and 760 px wide.
5. Check the row, seven-card hands, popups, redraws, Retain, exile, and undo.
6. Record a design decision here before changing the rules. Do not implement an open question as if it were approved.

## Build hypotheses to validate

These are candidate archetypes, not approved balance targets. Test constrained generators first to determine whether each concept works when its enablers are available; test starter decks separately to determine whether beginning with the synergy is fun and fair.

- Tide heart engine: draw, discard, Retain, exile, and direct heart effects. A Tide-heavy heart engine has produced a successful human run.
- Exile vault: deliberately exile cards, especially Basics, and use `+1 ♥ per 3 cards in exile`. This appeared in a successful run but depends heavily on exile availability.
- Ember combat: power generation, `foes`, `weak`, discard-pile power, and enemy rewards. Pure Ember remains unproven.
- Moss economy: `coin`, Basic-count gold, gold Reaping, and expensive recruit purchases, probably with Swap as an outlet for surplus gold. Pure Moss remains unproven.
- Swap converter: intentionally generate one resource and exchange it for the other. This may be a bridge between economy and combat rather than a complete archetype.
- Discard-pile engine: use cycle or purge to grow the discard pile, then exploit `+1 ⚔ per 3 cards in discard`. This is a natural Ember/Tide hybrid.
- Wide tribal deck: keep many cards and exploit `army`, `kin`, or Bond. This is the main counterexample to the assumption that thin decks should always be best.
- Basic/starter engine: preserve Basic cards to power Basic-count effects instead of exiling them. This would create a deliberately wide starting-deck route.
- Basic foundation: test whether Basics can become a positive strategic choice through Basic-count effects, duplication, and Hoarder payoffs rather than an automatic early-exile target.
- Rainbow combo: play all three types and use Bond, Kin, and `all3`. A Tide-only generator should remove impossible effects such as `all3` or replace them with effects that can function within that pool.
- Rainbow all3 build: deliberately collect `all3` cards from Moss, Ember, and Tide and test whether multiple copies across colours create a satisfying payoff rather than a generic best strategy.
- Reaping or greed: generate excess gold or power, spend only what is necessary, and convert the remainder into hearts at end of turn. This is more likely a finishing engine than a complete deck.
- Micro-deck: reduce the deck to four or five highly efficient cards, such as two strong gold cards and two strong power cards. Test whether consistency compensates for the loss of effects and flexibility.
- Draw engine: assemble enough Draw, cycle, purge, and Retain to produce reliable gold and power every turn. This may be an engine shared by several colour identities rather than a standalone archetype.
- Hoarder engine: reward a wide deck with roughly `+1` resource per 6 cards in the deck. Decide which resource is gained, whether the count includes hand/discard/exile, and whether the effect scales per card or per threshold.

## Parked ideas

Keep proposed ideas in this document instead of implementation comments. Mark an idea as open, parked, rejected, or resolved when its status changes. Do not add dates.

### Cards and generation

- Basic row recruits: allow Basic cards to appear in the generated row as deliberate low-complexity purchases, using a more generous budget than coloured recruits, such as no `.85` conversion and possibly a small fixed budget bonus. Decide whether their cost and effect ceiling need separate limits.
- Multi-colour recruits: allow two-colour and rare rainbow cards whose played colours all count toward colour conditions. Candidate budget conversion is `C × .85^n + .3`, where `n` is the number of colours, so dual-colour cards use `.85²` and rainbow cards use `.85³`. This makes them intentionally weaker, but they still need a turn or minimum-cost gate if they should appear only later. Decide how they display, which colour affinities apply, whether a rainbow card alone satisfies `all3`, and whether `all3` should require three cards rather than three colour tokens.
- Add a row-discard effect that removes cards matching a category. Candidate categories are all cheap cards, enemies the player cannot currently defeat, all Ember cards, or the fifth card. Redraw already replaces the first four cards, so the fifth card is the missing position. Decide whether it removes one card or every matching card, how the row refills, and how each category is defined. The main risk is that category targeting adds complexity and dilutes the effect pool.
- Add an effect that draws a temporary sixth card into the recruit row. Proposed behaviour: after a card leaves, refill only until five cards; decide where the extra card enters and how redraw treats it.
- Add a row-targeting effect to reduce dead late offers; decide whether it discards one selected card, a category, or an enemy without granting its defeat reward.
- Refund part of a recruit's cost when it is exiled.
- Exile bonus (open): a thin deck leaves cards like a lone Draw 1 with no reason to ever exile them. Either a card gives a bonus when it is exiled (a refund, a heart, a draw), or an exile effect carries a modifier that pays for any card exiled. The refund idea above is the same family; decide the three together. Needs an "on exile" hook next to the existing exile move.
- Add a type-conversion effect that turns one or more Basic cards in hand or deck into a chosen gem type, such as Ember. Decide whether it changes the card permanently, preserves its resources, and competes with exile as the main way to improve deck quality.
- Add growing cards whose payout increases after each play, such as a resource gain that increments on every use. Define whether growth belongs to the card instance or its definition, whether it persists through discard and reshuffle, and how duplication interacts with it.
- Redraw counter as an effect input, for example a card whose gains grow with each redraw. Do not store "was stuck" in `GameState`: a human's reason for redrawing is not knowable.
- Give drafted Basic cards an opening-turn trigger when no coloured type has been played yet, such as a small resource, Draw, or setup effect. Starter-deck Basics would not carry this effect, avoiding repeated triggers from an all-Basic opening hand. Decide whether the trigger checks before the Basic is played and whether multiple drafted Basics can each benefit.
- Add three enemy effect variants that, when defeated, double the effect-selection weight of non-lean effects for future Moss, Ember, or Tide recruits for the rest of the run. Define this as 2× selection weight rather than “+200% chance”; keep the overall chance of receiving an effect unchanged and apply the modifier only to cards generated afterward.
- Keep enemy cost at a minimum of one after discounts.
- Reprice `weak`.
- Add a `redraw` effect, probably only on enemies; decide whether it grants one redraw or redraws immediately.
- Add an effect that duplicates the rightmost unused card; define `unused` and when the copy enters play.
- Add a `haste` effect that makes a recruit's effect resolve immediately when recruited; decide whether it plays the card, resolves only its effect, or needs a different name.
- Count recruiting as playing a type.
- Let draw-only cards count as simple cards.
- Cap stacked Retain cards.
- Reward rare runs of identical recruit cards as an achievement or bonus event, such as a small gold prize for two and a larger prize for three; define the counting window and prevent redraw farming.
- If Basics are removed, test starter compositions such as 3 Moss / 3 Ember / 3 Tide, 3 Ember / 3 Tide / 4 Moss, or 4 of each colour. Compare early resource balance, access to discard cycling, and whether the larger starter makes thinning less necessary.

### Enemies

- Boss enemies every tenth turn that cost two resources, or bosses that create pressure while they remain in the row. Unresolved: whether their ongoing board effects expire or persist until removal, and how the player removes them.
- Bosses can require two resource tracks with persistent partial payments, such as 10 ● and 10 ⚔: pay 3 ● and 4 ⚔ one turn, 4 ● and 6 ⚔ the next, then 3 ● on the third.
- Bosses should not be affected by the normal redraw; a special effect could reroll any bosses and the fifth river card.
- Add more enemy variety.
- Increase enemy frequency at higher levels.
- Anti-thin-deck enemy effect (open): for example +5 ⚔ minus 1 ⚔ for every 4 cards in your deck, so very thin decks gain little from it. It is the opposite of the existing pile-size effects (`pile` pays for the discard size, Moss rewards a larger deck). Motivated by a 10-card deck that won with 89 ♥ on turn 22.

### Starters, builds and modes

- Add starter builds: begin with a small synergistic deck or an approximately turn-10 setup so runs reach meaningful decisions sooner. Decide whether the player chooses an archetype or receives one at random, and how much setup each build grants.
- Consider two experimental formats: constrained generators that provide a themed card pool while still requiring the player to build the deck, and curated starter decks that begin with a small synergistic package. The former tests whether a build is viable; the latter tests whether starting with the build creates better early decisions.
- Let starter builds or thematic/challenge generators shape the early row; a challenge could constrain generation, such as a run with no Ember, without requiring a permanent starter deck.
- Add a custom deck builder (a Build Lab): give the player a budget and let them assemble cards using the same type, resource, effect, Retain, and cost limitations as the generator. Define whether the budget covers cards only or also starting resources, and keep it separate from normal random-run scores.
- Paid starter builds: let stronger starter packages spend starting hearts, with `1.5` card budget costing one heart, so the run begins in debt. A raw package price is the sum of resource, effect, and Retain budgets converted to hearts, but guaranteed colour purity and synergy may need a consistency premium. The tested 12-card Moss package costs `27.5` raw budget, or about `−19 ♥`; its experimental `−40 ♥` charge tests a roughly 2× premium. Decide rounding, whether the charge is per card or per package, and whether starter debt is shown as a separate value.
- Candidate Moss starter: 2× `+3 ●`, 2× Coin with `+1 ●`, 2× Kin with `+1 ●`, 1× Army gold, 2× retained ReapG, and 3× retained Swap. This is a 12-card package costing `29.5` raw budget, or about `−20 ♥` before a consistency premium; a comparable 2× premium would be about `−40 ♥`. It keeps the original deck size while replacing small gold with stronger gold and an extra Swap.
- Add level-specific goal variants.
- Offer distinct modes with distinct objectives and separate high-score tables.
- Add objective-based modes, possibly as a campaign: replace or supplement “collect N hearts” with goals such as defeat M enemies, reap 15 hearts, exile every Basic, or hold 12 cards at once.
- Let players choose curated card pools or expansion sets instead of always drawing from one diluted random pool.
- Constrained “simple only” generator (built, to playtest): `?mode=simple` is a Level 1 run where the generator makes only cards with direct resource gains and no worded effects. It comes from the generator constraints (`generator.allowedTypes` and `generator.allowedEffects` on `ModeConfig`), which also let a mode ban card types. The goal (Level 1) is a guess; tune it after playtests. First playtest: the card pool feels very small (four identical 2 ● + 2 ⚔ Ember cards in a row), a few turns had nothing affordable, and with no exile or draw the deck cannot be thinned, so a few good cards (+5 ●, +4 ⚔) carried the run. Heart-only cards looked like clutter but may help. Level 1 was reached on turn 23. Bots (400 games, seed 1, goal 48): `mixed` hit 34% in Simple Only against 22% in standard Level 1, `smart` 35% against 16%, so for bots the plain-only pool is easier, not harder; exiles are 0 by construction. The bots' mean hearts at turn 24 is about 5 higher in Simple Only (`mixed` 42.6 against 36.7 at goal 64, `smart` 43.6 against 34.0), and at goals 64 and 80 neither mode is reachable for them (0 to 4%), so the difference shows in the average, not the hit rate. `npm run sim` takes `--mode simple` and `--goal N`. Keep the mode as a reference. Open: allow exile and draw in the pool, a different starter, or different budgets for plain cards.
- Add an endless continuation after the normal run; define how goals, costs, escapes, and scoreboards work.
- Stop early or carry on: when the goal is reached, let the player stop or continue to the full turn limit.
- Save and resume an unfinished run.

### Screens, modes and sharing

- Add a home screen with buttons for Classic, Challenge, Settings, and About; keep mode names open to revision.
- Make Classic the current random-generator game, with Basics at the start, all cards and effects available, the current Standard levels, and Long Run as a Classic choice.
- Make Challenge a mode where the player chooses a generator and tries to make it work, rather than starting from a fixed starter deck.
- Let custom challenges choose or ban card types and effects, save several challenge slots, and edit or duplicate them later.
- Start Challenge goals with the existing Level 1–3 heart goals; add custom goals only after the constrained-generator loop is playable.
- Leave starter decks out of the first multi-screen iteration.
- Put Settings and About on the main menu, with a route back to the menu and a way to resume an in-memory game in the web tab.
- Keep browser back and forward useful, and preserve links that start a particular mode with a particular seed.
- Share custom generator definitions through links so another player can open and play the same challenge.
- Show the mode, difficulty, goal, seed, and challenge description before a menu-launched game starts and in an overview popup during the game.
- Let a shared challenge link start the game directly while opening the overview once, so the player knows what the run contains without a separate preview screen.
- Let Classic setup use an editable seed field so players can replay or share a specific run.
- Compose the Challenge run brief from structured generator selections and the goal instead of using unrestricted free-form text; an optional player note should be short and length restricted.
- Add effect search or filtering if the Challenge editor becomes unwieldy as the effect list grows; it is not required for the first editor.
- Keep the game screen mostly unchanged, adding only a route back to the menu and access to the Challenge overview or run brief.
- Keep the current result screen direction unless the visual mockups reveal a specific problem.
- Use visual mockups to settle Heartrow's blue, white, pink, highlight, button, field, chip, and modal treatment before implementing the new screens; the mockups themselves do not need interaction.
- Title screen styles (open): a first static concept (dusk sky, glossy extruded logo with a heart, drifting cards, chunky pink and blue buttons) was liked but judged too cute and kid-friendly, and its cards did not match the in-game cards. Keep it as one selectable style and explore others. Notes: use one typography for Classic and Challenge with consistent alignment and sizing, make Settings and About less timid, give Resume the same button style as the others, and use cards that look like the real ones. Ambient animation is optional. The heart as a letter in the logo is liked even if it does not read as an "a".
- Title screen, second concept (liked): dark blue with gold accents, a simple gradient background, a gold letter-spaced tagline with gradient rules on both sides, and a heart as the crossbar of the capital A in the logo. The logo font is a detail to replace by hand. The menu buttons should sit at the bottom of the screen on phones so they are reachable with one hand. Open: the buttons are a little wild with a left tab, an icon and a right arrow; a pink Classic button hides the heart; the design is perhaps too minimal and could take a few background elements, corner ornaments, or more elaborate borders and lines. Resume should stay in the same style family but distinct and set apart.
- Title screen, third iteration (liked with reservations): the dark blue and gold look may be a cliche but is new to this project; the gold-bordered Classic button does not fit the theme; the gradient line as a button's top border and the abstract background shapes are liked. The card row scrolls horizontally on phones and clips on small screens. A little fidget functionality on the home screen (for example scrolling or nudging the cards) is welcome. The in-game card theme is now the odd one out, so the next card theme could take its cue from this style.
- Title screen, fourth concept (risograph poster, strong candidate): coherent and works in both light and dark themes; the logo is strong, with the heart wanted a bit bigger; the menu feels familiar from games. Its flat, minimal cards are another style to consider, but they flicker when the pointer sits on a card's lower edge (the hover lift moves the card out from under the pointer; the game already solved this) and they cannot hold multi-line effect text while keeping art visible.
- Title screen direction (chosen for now): the risograph concept is the best candidate, kept flat (no gradient button borders) with both themes. A URL switch should let it show either its flat cards or the in-game card style, to see how the real cards look in it. Use `text-wrap: balance` for button subtitles, a slightly bigger logo heart that keeps the A readable, and no hover flicker on cards. Next test: design a second screen in the same style, either the custom generator editor or the game screen.
- Light mode (open): decide whether to keep a light theme. The designer prefers dark but light is more legible in sunlight and some players like it. A mockup of a light variant would settle it.
- Fanned or arced card layout for the game screen (open): the title screen shows tilted, gently floating cards in a slight arc, as most card games do. Consider it for the hand and the river, knowing it would disturb the current geometric CSS layout.
- Use the View Transitions API for screen changes, with the screen sliding over an unmoving background; respect reduced-motion settings.
- Add bots for challenge balancing after challenge definitions and playable presets exist.

### Interface and presentation

- Resources fly (built, to playtest): when a card is played or an enemy defeated, its gains are copied, fly to their stat boxes, and the boxes pulse on arrival. Same family as the recruit-to-pile flight and the defeat inflate.
- "Skip exile" is the primary button while the exile prompt is active (built).
- Resource flights (built, to playtest) are purely visual and never hold the view back. A flight shows the move's total (for example "+3 ●" from a bonus effect, not only the printed "+1 ●"), lifts away from the card, drifts slowly so it can be read, then speeds to its stat box. Its box pulses on arrival. Every change to a box pulses it once: spent gold or power, a lost heart, a swap, a gained or spent redraw, pile changes. Exiled cards fly to the piles box like recruits. Drawn cards deal in from the right and river cards enter from the left. On end turn the last river card leaves to the right and the hand (except retained cards) flies to the discard pile one card after another before the new hand is drawn. The animation setting has an "Extra slow" step for inspecting. Open: the piles number could change colour on a pulse (gold for recruit, red for exile), and the new hand could start dealing while the old one is still flying away (overlap).
- Animation round two (built, to playtest): a stat box keeps its old number while a resource flight carries the change (`hold` and `release` in the store; the presenter releases and pulses the box on arrival). Spending pulses the box on the click, not after the card's flight. Flights from one card fan out sideways and start one after another. Redraw shrinks and fades the four old cards in a stagger. Cards that move because the hand or row changed (a hand making room for drawn cards, a row shifting) slide from their old place (`flip` in the animation module) instead of jumping.
- Animation round three (built, to playtest): cards that leave the hand are found by comparing the old and new state, so exile, cycle, purge and the end of turn all fly them to the piles. The presenter now plans the next frame only after the view has drawn the previous one. Before, a frame planned against a page one frame behind, so cards just drawn had no flight and vanished abruptly on end turn.
- Animation nitpicks, all optional: recruiting and refilling the river (and exiling and the hand closing up) could overlap instead of running one after the other. The status line text changes mid-animation instead of on the click. A spent resource could show a "−2 ●" that flies out of the box on the click; that would make the delayed number change after a recruit less odd. Today a recruit pulses the box on the click and changes the number when the card's flight ends.
- Undo of the end turn: the per-turn undo stack is cleared when a turn ends. Keeping it across the turn boundary would be easy technically (the RNG streams are in the state, so a replay gives the same result), but undoing an end turn reveals the next hand and row, which is the same free peek as undo of a redraw. Useful as a playtest and bug-reproduction tool; decide together with blocking the redraw undo.
- Fixed: end-turn cards that "stayed, then vanished". With a small deck, the cards discarded at the end of the turn are reshuffled and some are drawn straight back into the new hand with the same card id. The animation treated "in the new hand" as "kept", so those cards got no flight, sat still, and then dealt in again from the right. A card now counts as kept only if it was not drawn in the same move (`departingIds`), so it flies to the discard pile and deals back in. Found by the user hitting End turn repeatedly (every second turn with a ten-card deck). A test covers it.
- A cap on the total stagger was tried and removed: the last cards leaving together looked worse than a longer wave. The presenter also writes "heartrow animation: hand out of step" to the console if the page's hand or the flying cards ever differ from the state.
- Animation round four (built, to playtest): the turn and discount boxes pulse, a held stat number counts up one flight at a time (two 1 ● flights show 1 then 2, not 0 then 2), and a redraw shrinks and enters the row with the rightmost card first.
- Shuffle animation idea: when the draw pile runs out and the discard is reshuffled, count the piles box up and down (0 / 9 becomes 1 / 8, 2 / 7, and so on to 9 / 0). It may be too small to notice and would slow the turn, so only an idea for now.
- Piles overview colours (built, to playtest): the deck summary colours gold figures yellow, power figures orange and heart figures pink, and each type count in its type colour (Moss green, Ember red, Tide blue), so the one number you look for is easy to find. The summary is four lines (deck size, plain gains, effects, types). The two gain rows share a label width so the figures line up without padding characters, and the type counts read number first, like the others, without commas. A "types" label makes it a grid (gold over Moss, power over Ember, hearts over Tide). Below 450 px of screen width the column widths are dropped and the rows flow inline, because four columns no longer fit.
- Hover glow (built, to playtest): the hovered or keyboard-focused card gets a soft glow in its own colour next to the lift. Not on cards that cannot be used.
- Resource flights ignore the rush now. The first move of a quick Play simple was planned before the others were queued, so it flew at full length and the later ones at half, and a later flight could land first.
- Browser trick used for inspection: pause every running animation with `document.getAnimations().forEach((a) => a.pause())` (resume with `play()`), then screenshot the frozen frame.
- A recruit card that only draws one card (a 2 ● Draw 1 with no other effect) appeared again. An earlier rule said this should not happen. It may be acceptable because a free Tide card still counts for some decks, but otherwise buying it only cycles the deck. Decide later, not during the animation work.
- The "Extra slow" entry was missing from the animation dropdown after a hot reload. Probably a one-off from hot module replacement. Check again after a full reload.
- The exile prompt has an idle attention animation (built, to playtest): slowly moving diagonal tide-coloured stripes in the message box. It stops under reduced motion and with the animation setting off.
- Colour review after the icon change: the light theme looks weak overall; Enemy purple and Tide blue are too similar; and recruit-row cards look faded next to the Basic cards in hand. The fade is intended (`.no` dims unaffordable recruits to 55% opacity, and at turn start with 0 gold every row card is dimmed), but it may be too strong, or the Basic cards may be too dark. Decide together, in one pass over both themes.

- Show calculated values for conditional effects without making card text unstable or crowded.
- Use one visual language for resource gains, either words or resource symbols, while keeping accessible labels.
- Call the recruit row a `river` in player-facing language, provided the term remains clear to new players and assistive technology.
- Mark cards that need a decision so `Play simple` is less necessary.
- Try six recruit slots if the phone layout remains usable.
- Find a clearer fixed-edge marker if the lock icon reads as a purchase restriction.
- Improve access to cards deep in a heavily overlapped hand.
- Make card art respond more directly to card properties, such as a rectangle for power or a ring for draw, so effects are recognizable at a glance.
- Explore a Lovecraftian visual direction as an optional thematic distance from Gemblades: Moss and Tide can support organic/eldritch motifs, Ember can become arcane, enemies can become horrors, and hearts can become sanity. Treat this as a visual and naming direction, not a rules change.
- Make the tutorial optional, with an explicit way to replay it or get the same information later.
- Add transitions, sound, or Android packaging.
- Undo of a redraw lets the player peek at the next row for free. It works for now and is useful as a playtesting tool; plan to block it soon.
- Presentation lag (built, to playtest): `GameStore` keeps the latest session (rules, clicks) and a shown session (what the view draws). Each move is a frame with `before` and `after` sessions. `createPresenter` plays the "before" effects on the current page, commits the frame, then plays the "after" effects (shake, pulses, row entry). A frame with nothing to play commits at once. Undo and new game bump an epoch and drop the queue. Clicks resolve by card id against the latest state. Play simple now goes left to right, and queued frames play faster ("rush"). Not yet visually playtested: flight timing and look, the idle animation for the exile prompt (still open above).
- Cards are drawn at a fixed design size (118 x 175) and scaled to the slot with a CSS `scale`, so small cards no longer inflate under a browser minimum font size of 12 or less (tested in Brave and Firefox). A higher minimum still inflates the text. Later idea: draw cards even larger and shrink them more. Also test large system text on a phone.
- Carry on after the goal: today "End your turn to win, or keep going" only means keep playing the current turn, because ending the turn wins. A real choice could be a mode option where ending the turn does not win and a separate move claims the win, with the run scored by final hearts. After the goal the primary button becomes "Claim win" and "End turn" becomes secondary.
- Defeated tally: count defeated enemies as a visible tally. The core already tracks defeats, so effects could key off it. Not needed for the animation (a defeated enemy can inflate and fade in place), so add it when the first effect uses it.
- Animation decisions so far: input is queued and the logic stays immediate; a click resolves the card by its id (the card under the pointer), not by its position, so a card that shifts during an animation is never clicked by mistake, and a click on a card that is already gone is ignored. Undo, new game and reduced motion skip the queue. Recruit flies to the discard pile and its number flashes; a defeated enemy inflates and fades; a played card flashes and dims in place; the play simple stagger is about 60 ms and a flight about 250 ms, both scaled by the speed setting.
- Icons are built in the web platform (`src/platform/web/icons/`): a gold coin with shine and an embossed inner disc, reddish-orange swords (Material Symbols shape, Apache 2.0; steel was tried and dropped because the red numbers no longer matched, and the power number colour is now `--pow`, separate from the Ember card colour), the favicon heart, an indigo clock for Retain, and a steel padlock for fixed-edge cards. The core keeps the unicode symbols as text. `Rich` wraps each symbol in a span whose text is transparent and whose background is the icon, so copied text stays unicode, and other platforms (such as ASCII-only TIC-80) map the tokens their own way. The selection highlight is hidden on icons because the hidden text is narrower than the icon. Open: recheck every card for the 1 px shift, and the pin was dropped because it did not read well.
- Fixed, not yet playtested: the played-card flash now ends at the dimmed resting look (it used to fade to full brightness and then snap), and the shake adds to the resting translate (it used to drop a lifted card while shaking). The web build also gained the prototype's `line-height: normal` on cards and top-aligned stat buttons.
- The Swap text was almost exactly as wide as a card (117.98 of 118 px), so tiny font differences could wrap the ⚔ alone onto a new line. It is now "Swap ● and ⚔".
- Reward spending exactly all gold and power in a turn, for example a bonus heart or a free draw. It felt good in playtests (two turns in a row).
- The piles overview shows card text larger than normal cards and wraps differently. Check the font scaling of the small card view.
- Resume after a mobile tab discard (open, found on a phone in Brave): switching to another app and back reloads the page, and the run is lost. This is the browser discarding the background tab to free memory, so an offline mode or service worker would not prevent it. The fix is to persist the run in the web platform (localStorage or sessionStorage) and resume on load. Cheapest shape: store the config, seed and move list, and replay it through the pure core, which also gives undo for free. This is the same web-only resume already planned for the home screen's "Resume game".
- Alternative phone skin (open, idea): bigger card text without effect descriptions, with keyword meanings in a help section or on long press. Styling is swappable on the web, unlike bitmap art, so this can be a skin rather than a rule change.
- Large hands on phones (open, unproven): a hand of 12 or more cards makes tapping one card hard. Try a horizontally scrolling hand like the riso mockup. Playtest a long run on a phone first.
- Riso game screen mockup edits (open, for later): on desktop, bundle all the stats into one bordered panel with Redraws and Piles as separate buttons outside it; remove the border around "your hand" and maybe give it a quiet shape behind the cards like the river has. Too many borders overall. On phones the cards are squeezed and the transparency on real-style cards looks bad.
- Stats bar restyle (open, the one piece taken from the second riso attempt): coloured stat chips with an icon, a big number and a small label, with Redraws and Piles styled like the other buttons. Draw it in the style of today's cards (rounded corners, the card's header strip and pill badges, no riso hard shadows), not in the riso language. Keep the current fluid mobile-like layout that scales up to iPad portrait. Do not build a separate desktop layout today; the desktop riso layout (`game-1`) stays a candidate for a later redesign.
- Mockup lessons (open, for any later mockup): keep the real card aspect ratio (118 x 175) instead of stretching cards, round the inner border corners, and never let descriptions overlap the border. Brief mockup agents with the real card CSS, not with a style name. Skip exile needs a place on narrow screens when the bottom action bar is crowded; the current layout lets it flow from the top. The scrolling hand is only a candidate, since long hands on phones are unproven.
- Win check (open, from a playtest): a win earned by hearts during a turn was undone because ending the turn moved the river and an enemy escaped (−hearts), so the final total fell under the goal. Consider checking the goal after the end-turn effects that cannot lower hearts, or before the river moves, so reaching the goal during a turn counts. Decide whether that changes how escapes should feel near the goal.
- Riso restyle, second attempt (open): keep the current cards as they are and take their look (flat fills, coloured header strips, pill badges, geometric patterns) as the source for the other UI elements. Give each stat its own icon and colour instead of a monotone row. A modest, less bold design that works with the current cards. The riso concepts stay saved in `local/mockups/` for later.

### Statistics and progression

- Add contribution statistics that attribute gold, power, and hearts to the card or enemy effect that generated them. Decide whether repeated generated cards are grouped by definition or tracked by instance, and make sure end-of-turn Reap and enemy payouts have clear owners.
- Add achievements, run statistics, cloud support, global leaderboards, unlockable effects, and longer-term progression after the core run is stable.

### Bots

- Replace the huge and tiny policy magnitudes (1e12, 1e-9) with human-sized numbers (roughly 1 to 100) and accept a different move about 1 time in 100. Measure the bots first, change the weights, compare, then judge.
- Bot priority tiers (tier plus weight within the tier) as a cleaner alternative to magnitude layering, if small weights are not enough.
- Make the bot redraw memory pure without a "stuck" flag in `GameState`: a redraw counter in state, or the bot driver passing memory in.

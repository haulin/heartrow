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
- Add more enemy variety.
- Increase enemy frequency at higher levels.

### Starters, builds and modes

- Add starter builds: begin with a small synergistic deck or an approximately turn-10 setup so runs reach meaningful decisions sooner. Decide whether the player chooses an archetype or receives one at random, and how much setup each build grants.
- Consider two experimental formats: constrained generators that provide a themed card pool while still requiring the player to build the deck, and curated starter decks that begin with a small synergistic package. The former tests whether a build is viable; the latter tests whether starting with the build creates better early decisions.
- Let starter builds or thematic/challenge generators shape the early row; a challenge could constrain generation, such as a run with no Ember, without requiring a permanent starter deck.
- Add a custom deck builder (a Build Lab): give the player a budget and let them assemble cards using the same type, resource, effect, Retain, and cost limitations as the generator. Define whether the budget covers cards only or also starting resources, and keep it separate from normal random-run scores.
- Paid starter builds: let stronger starter packages spend starting hearts, with `1.5` card budget costing one heart, so the run begins in debt. A raw package price is the sum of resource, effect, and Retain budgets converted to hearts, but guaranteed colour purity and synergy may need a consistency premium. The tested 12-card Moss package costs `27.5` raw budget, or about `−19 ♥`; its experimental `−40 ♥` charge tests a roughly 2× premium. Decide rounding, whether the charge is per card or per package, and whether starter debt is shown as a separate value.
- Candidate Moss starter: 2× `+3 ●`, 2× Coin with `+1 ●`, 2× Kin with `+1 ●`, 1× Army gold, 2× retained ReapG, and 3× retained Swap. This is a 12-card package costing `29.5` raw budget, or about `−20 ♥` before a consistency premium; a comparable 2× premium would be about `−40 ♥`. It keeps the original deck size while replacing small gold with stronger gold and an extra Swap.
- Add level-specific goal variants.
- Offer distinct modes with distinct objectives and separate high-score tables.
- Let players choose curated card pools or expansion sets instead of always drawing from one diluted random pool.
- Add an endless continuation after the normal run; define how goals, costs, escapes, and scoreboards work.
- Stop early or carry on: when the goal is reached, let the player stop or continue to the full turn limit.
- Save and resume an unfinished run.

### Interface and presentation

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
- Defeating an enemy and recruiting a card have no animation yet, while playing a hand card has a flash that feels slightly long. Ideas: a recruited card animates toward the discard pile and that pile's number flashes; a defeated enemy leaves without a pile flash, or counts toward a defeated tally. Decide on one visual language for play, recruit and defeat.
- Presentation lag: the game state is already final while the view still shows the previous step until the animation ends. The web store would keep a list of immutable snapshots (every `applyMove` already returns one), and the view shows a "displayed" snapshot that advances as animations finish. Open points: clicks must resolve by card id against the latest state, and undo, a new game and "animations off" must skip the queue.
- "Play simple" should play cards left to right with a short stagger, once the presentation lag above exists.
- Cards are drawn at a fixed design size (118 x 175) and scaled to the slot with a CSS `scale`, so small cards no longer inflate under a browser minimum font size of 12 or less (tested in Brave and Firefox). A higher minimum still inflates the text. Later idea: draw cards even larger and shrink them more. Also test large system text on a phone.
- Carry on after the goal: today "End your turn to win, or keep going" only means keep playing the current turn, because ending the turn wins. A real choice could be a mode option where ending the turn does not win and a separate move claims the win, with the run scored by final hearts. After the goal the primary button becomes "Claim win" and "End turn" becomes secondary.
- Defeated tally: count defeated enemies as a visible tally. The core already tracks defeats, so effects could key off it. Not needed for the animation (a defeated enemy can inflate and fade in place), so add it when the first effect uses it.
- Animation decisions so far: input is queued and the logic stays immediate; a click resolves the card by its id (the card under the pointer), not by its position, so a card that shifts during an animation is never clicked by mistake, and a click on a card that is already gone is ignored. Undo, new game and reduced motion skip the queue. Recruit flies to the discard pile and its number flashes; a defeated enemy inflates and fades; a played card flashes and dims in place; the play simple stagger is about 60 ms and a flight about 250 ms, both scaled by the speed setting.
- Icons are built in the web platform (`src/platform/web/icons/`): a gold coin with shine and an embossed inner disc, reddish-orange swords (Material Symbols shape, Apache 2.0; steel was tried and dropped because the red numbers no longer matched, and the power number colour is now `--pow`, separate from the Ember card colour), the favicon heart, an indigo clock for Retain, and a steel padlock for fixed-edge cards. The core keeps the unicode symbols as text. `Rich` wraps each symbol in a span whose text is transparent and whose background is the icon, so copied text stays unicode, and other platforms (such as ASCII-only TIC-80) map the tokens their own way. The selection highlight is hidden on icons because the hidden text is narrower than the icon. Open: recheck every card for the 1 px shift, and the pin was dropped because it did not read well.
- Fixed, not yet playtested: the played-card flash now ends at the dimmed resting look (it used to fade to full brightness and then snap), and the shake adds to the resting translate (it used to drop a lifted card while shaking). The web build also gained the prototype's `line-height: normal` on cards and top-aligned stat buttons.
- The Swap text was almost exactly as wide as a card (117.98 of 118 px), so tiny font differences could wrap the ⚔ alone onto a new line. It is now "Swap ● and ⚔".
- Plan the animation work as one change: fix the flash, add snapshots with a displayed state so the disabled look waits for the animation, play simple left to right with a stagger, then the recruit-to-pile flash.
- Reward spending exactly all gold and power in a turn, for example a bonus heart or a free draw. It felt good in playtests (two turns in a row).
- The piles overview shows card text larger than normal cards and wraps differently. Check the font scaling of the small card view.

### Statistics and progression

- Add contribution statistics that attribute gold, power, and hearts to the card or enemy effect that generated them. Decide whether repeated generated cards are grouped by definition or tracked by instance, and make sure end-of-turn Reap and enemy payouts have clear owners.
- Add achievements, run statistics, cloud support, global leaderboards, unlockable effects, and longer-term progression after the core run is stable.

### Bots

- Replace the huge and tiny policy magnitudes (1e12, 1e-9) with human-sized numbers (roughly 1 to 100) and accept a different move about 1 time in 100. Measure the bots first, change the weights, compare, then judge.
- Bot priority tiers (tier plus weight within the tier) as a cleaner alternative to magnitude layering, if small weights are not enough.
- Make the bot redraw memory pure without a "stuck" flag in `GameState`: a redraw counter in state, or the bot driver passing memory in.

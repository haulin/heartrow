# Heartrow v6

## Purpose

Heartrow is a small, single-player roguelike deckbuilder. A run lasts 24 turns. The player builds a deck of procedurally generated recruits, defeats enemies, and reaches a hearts goal before time runs out.

The v6 baseline is a copy of v5. The frozen v5 source and historical handover are in [`prototypes/v5/`](prototypes/v5/). Do not change v5 while working on v6.

The working instructions are in [`AGENTS.md`](AGENTS.md).
The implementation is [`prototypes/v6/heartrow-v6.html`](prototypes/v6/heartrow-v6.html). It is a single-file browser prototype with no build step and no package dependencies. The balance tools are [`prototypes/v6/bot.js`](prototypes/v6/bot.js), [`prototypes/v6/cardcount.js`](prototypes/v6/cardcount.js), and [`prototypes/v6/effectreport.js`](prototypes/v6/effectreport.js).

## Player experience

The game should be playable without a tutorial. The player should understand the row, the two currencies, the edge penalty, and the current goal from the screen and the card text.

The central decision is positional:

- Five cards move from left to right.
- A new card enters on the left.
- Taking a card removes it and shifts the cards on its left toward the edge.
- The card on the right leaves at the end of the turn.
- An enemy that leaves the row removes its hearts from the player's score.

This makes buying a card beside an enemy a meaningful choice. Buying the edge card also moves its left neighbour to the edge.

## Rules inherited from v5

Unless this document records a deliberate v6 change, the v5 rules remain the specification. The full rule reference is [`prototypes/v5/HANDOVER.md`](prototypes/v5/HANDOVER.md).

The important baseline rules are:

- Levels require 48, 64, or 80 hearts in 24 turns.
- Gold buys recruits. Power defeats enemies. Hearts are the score.
- Recruits enter the discard pile. Enemies never enter the deck.
- The starter deck has six Basic gold cards and four Basic power cards.
- The hand normally draws five cards.
- Retain cards stay in hand when unplayed.
- Redraw replaces the four left cards and leaves the edge card in place.
- Reaching the goal wins only when the turn ends.
- “Play simple” plays cards without worded effects.
- Exile is optional. The player can skip it.
- Undo works only before a random or row-changing action.

Cards are generated when they enter the row. Their type, resources, effects, and art come from the generator budget. There is no row deck.

## Current v6 features

The deck summary breaks effects down by what they give: gold, power, hearts, and other. Each effect counts once per card. Bond and same-type effects count as gold or power based on the card. Other covers draw, exile, discounts, swap, and discard effects.

Reaping uses a small heart pill on the gold or power stat box. It shows one heart per reaping card in play, displays `♥×4` above three cards, and explains the current heart total in the tooltip.

Retain uses a regular-weight `↺` line. Text selection is disabled in the game area and remains enabled inside popups so the log can be copied.

Compact resource values use coloured `●` gold, `⚔` power, and `♥` hearts icons on cards and in the log; explanatory labels and accessible names retain the resource words.

The game has two discard effects: `cycle` keeps Retain cards and costs more, while `purge` discards Retain cards too and costs less. Both effects lean Tide.

Direct `♥` resources are intentionally less common on Moss and Ember recruits than on Tide recruits; dedicated heart effects remain the stronger heart-building identity. Once a recruit gets a direct heart, generation favours another heart so multi-heart cards remain meaningful.

`swap` exchanges gold and power. It leans Moss and Ember and gives a gold engine an outlet for defeating enemies.

The fifth row card shows a lock marker because redraw replaces only the four cards to its left. The redraw log states that the right-edge card cannot be redrawn.

## Design boundaries

These decisions are part of the v6 starting point:

- Keep the power colour red.
- Keep enemies violet with dashed borders and `Defeat:` effect text.
- Keep Moss, Ember, and Tide as the three gem types.
- Keep the edge-slot outline and the fixed five-card geometry.
- Keep the intentional hand overlap above five cards. Improve focus and semantic state instead of replacing the layout.
- Keep currency turn-local. Gold and power do not carry over.
- Keep the verbose, copyable log.
- Keep pending actions and played-card state clear to assistive technology.
- Give `exile` one extra selection weight on Moss and Ember recruits while keeping Tide as its strongest type.
- Do not add new effects before outside players test the current effect set.
- Prefer small changes that improve decisions or remove confusion.

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

## Open questions

These ideas are not decisions:

### Build hypotheses to validate

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
- Basic row recruits: allow Basic cards to appear in the generated river as deliberate low-complexity purchases, using a more generous budget than coloured recruits, such as no `.85` conversion and possibly a small fixed budget bonus. Decide whether their cost and effect ceiling need separate limits.
- Multi-colour recruits: allow two-colour and rare rainbow cards whose played colours all count toward colour conditions. Candidate budget conversion is `C × .85^n + .3`, where `n` is the number of colours, so dual-colour cards use `.85²` and rainbow cards use `.85³`. This makes them intentionally weaker, but they still need a turn or minimum-cost gate if they should appear only later. Decide how they display, which colour affinities apply, whether a rainbow card alone satisfies `all3`, and whether `all3` should require three cards rather than three colour tokens.

- Consider two experimental formats: constrained generators that provide a themed card pool while still requiring the player to build the deck, and curated starter decks that begin with a small synergistic package. The former tests whether a build is viable; the latter tests whether starting with the build creates better early decisions.
- Add a custom deck builder or Build Lab: give the player a budget and let them assemble cards using the same type, resource, effect, Retain, and cost limitations as the generator. Define whether the budget covers cards only or also starting resources, and keep it separate from normal random-run scores.
- Paid starter builds: let stronger starter packages spend starting hearts, with `1.5` card budget costing one heart, so the run begins in debt. A raw package price is the sum of resource, effect, and Retain budgets converted to hearts, but guaranteed colour purity and synergy may need a consistency premium. The tested 12-card Moss package costs `27.5` raw budget, or about `−19 ♥`; its experimental `−40 ♥` charge tests a roughly 2× premium. Decide rounding, whether the charge is per card or per package, and whether starter debt is shown as a separate value.
- Candidate Moss starter v2: 2× `+3 ●`, 2× Coin with `+1 ●`, 2× Kin with `+1 ●`, 1× Army gold, 2× retained ReapG, and 3× retained Swap. This is a 12-card package costing `29.5` raw budget, or about `−20 ♥` before a consistency premium; a comparable 2× premium would be about `−40 ♥`. It keeps the original deck size while replacing small gold with stronger gold and an extra Swap.

- Add a row-discard effect that removes cards matching a category. Candidate categories are all cheap cards, enemies the player cannot currently defeat, all Ember cards, or the fifth card. Redraw already replaces the first four cards, so the fifth card is the missing position.
- Add an effect that draws a temporary sixth card into the recruit row. Proposed behavior: after a card leaves, refill only until five cards; decide where the extra card enters and how redraw treats it.
- Add a river-discard or river-targeting effect to reduce dead late offers; decide whether it discards one selected card, a category, or an enemy without granting its defeat reward.
- Refund part of a recruit's cost when it is exiled.
- Add a type-conversion effect that turns one or more Basic cards in hand or deck into a chosen gem type, such as Ember. Decide whether it changes the card permanently, preserves its resources, and competes with exile as the main way to improve deck quality.
- Add growing cards whose payout increases after each tap/play, such as a resource gain that increments on every use. Define whether growth belongs to the card instance or its definition, whether it persists through discard and reshuffle, and how duplication interacts with it.
- Give drafted Basic cards an opening-turn trigger when no coloured type has been played yet, such as a small resource, Draw, or setup effect. Starter-deck Basics would not carry this effect, avoiding repeated triggers from an all-Basic opening hand. Decide whether the trigger checks before the Basic is played and whether multiple drafted Basics can each benefit.
- Add three enemy effect variants that, when defeated, double the effect-selection weight of non-lean effects for future Moss, Ember, or Tide recruits for the rest of the run. Define this as 2× selection weight rather than “+200% chance”; keep the overall chance of receiving an effect unchanged and apply the modifier only to cards generated afterward.
- Keep enemy cost at a minimum of one after discounts.
- Increase enemy frequency at higher levels.
- Reprice `weak`.
- Add bosses that create pressure while they remain in the row; decide how their effects expire or how the player removes them. Also consider more enemy variety, an optional tutorial, sound, or Android packaging.
- Add a `redraw` effect, probably only on enemies; decide whether it grants one redraw or redraws immediately.
- Add an effect that duplicates the rightmost unused card; define `unused` and when the copy enters play.
- Show calculated values for conditional effects without making card text unstable or crowded.
- Add contribution statistics that attribute gold, power, and hearts to the card or enemy effect that generated them. Decide whether repeated generated cards are grouped by definition or tracked by instance, and make sure end-of-turn Reap and enemy payouts have clear owners.
- Use one visual language for resource gains, either words or resource symbols, while keeping accessible labels.
- Call the recruit row a `river` in player-facing language, provided the term remains clear to new players and assistive technology.
- Make the tutorial optional, with an explicit way to replay it or get the same information later.
- Let starter builds or thematic/challenge generators shape the early river; a challenge could constrain generation, such as a run with no Ember, without requiring a permanent starter deck.
- Offer distinct modes with distinct objectives and separate high-score tables.
- Let players choose curated card pools or expansion sets instead of always drawing from one diluted random pool.
- Add an endless continuation after the normal run; define how goals, costs, escapes, and scoreboards work.
- Save and resume an unfinished run.
- Add a `haste` effect that makes a recruit's effect resolve immediately when recruited; decide whether it plays the card, resolves only its effect, or needs a different name.
- If Basics are removed, test starter compositions such as 3 Moss / 3 Ember / 3 Tide, 3 Ember / 3 Tide / 4 Moss, or 4 of each colour. Compare early resource balance, access to discard cycling, and whether the larger starter makes thinning less necessary.

The row-discard idea needs decisions about whether it removes one card or every matching card, how the row refills, and how each category is defined. Its main risk is that category targeting adds complexity and dilutes the effect pool.

Do not implement an open question as if it were approved. Record the decision here before changing the rules.

## Resolved decisions

- Exile remains optional; forced exile was rejected.
- Enemies stay violet; the alternative enemy colour was rejected.
- The log uses one copied line per entry instead of paragraph spacing.
- `foes` counts the enemies in the row before the defeated enemy is replaced, including the enemy being defeated and excluding the newcomer.
- Enemy defeat logs combine resolved direct heart payouts with the base enemy hearts and append any extra gold or power in the same compact resource line, including power from row enemies or the discard pile and gold from Basics.

## v7 Long Run prototype

- v7 is a separate experimental copy; v6 remains the 24-turn reference.
- Long Run lasts 42 turns, postpones the win check, and reports final hearts as a high score.
- Turns 1–24 preserve the v6 cost curve. Turns 25–36 add one cost step and use 40% enemy frequency; turns 37–42 add a second cost step and use 45% enemy frequency. Occasional low-cost cards remain possible, but late pure-resource filler is now bounded and rerolled more often while utility cards remain eligible.
- Long Run grants one redraw every three turns. A four-turn experiment left too little row control late in the run without improving the score meaningfully.
- The Long Run bot redraws before defeating an affordable right-edge enemy when another enemy sits to its left, preventing that left enemy from becoming the new escape threat.
- The first 400-game bot pass with the edge-aware heuristic averaged about 87 hearts for Mixed and 65 for Smart, with roughly 53–56 hearts lost to escapes. This is a starting balance signal, not a final target.
- Recruit cost is a converted budget, not a direct value sum: a recruit with base cost `C` starts with `C × .85 + .3` budget; the row may display a lower current price when a recruit discount is active. Direct gold and power each cost `1`, hearts cost `1.5`, and effects consume their listed `FX` budget. Integer resource gains can leave a fractional remainder below `1`; this is intentional. For example, a base-cost-12 card with `+2 ● +4 ⚔ +3 ♥` uses `10.5` budget exactly, while a base-cost-11 card with `+8 ● +1 ⚔` leaves `0.65`.
- Draw is one scalable effect rather than separate `draw1` and `draw2` effects. It costs `1.5` budget per card, allowing Draw 1, Draw 2, Draw 3, or Draw 4 when the generated card has enough budget.
- Scaled conditional effects should use simple magnitude pricing of roughly `3` budget per level; test the exact values for discounts and per-enemy effects before resolving them.

## Parked ideas

Keep proposed ideas in this document instead of implementation comments. Mark each idea as open, parked, rejected, or resolved when its status changes.

- Boss enemies every tenth turn that cost two resources; unresolved whether their ongoing board effects expire or persist until removal.
- Count recruiting as playing a type.
- Let draw-only cards count as simple cards.
- Add more enemy variety.
- Try six recruit slots if the phone layout remains usable.
- Cap stacked Retain cards.
- Mark cards that need a decision so `Play simple` is less necessary.
- Add level-specific goal variants.
- Add starter builds: begin with a small synergistic deck or an approximately turn-10 setup so runs reach meaningful decisions sooner. Decide whether the player chooses an archetype or receives one at random, and how much setup each build grants.
- Add transitions, sound, an optional tutorial, or Android packaging.
- Add achievements, run statistics, cloud support, global leaderboards, unlockable effects, and longer-term progression after the core run is stable.
- Make card art respond more directly to card properties, such as a rectangle for power or a ring for draw, so effects are recognizable at a glance.
- Explore a Lovecraftian visual direction as an optional thematic distance from Gemblades: Moss and Tide can support organic/eldritch motifs, Ember can become arcane, enemies can become horrors, and hearts can become sanity. Treat this as a visual and naming direction, not a rules change.
- Reward rare runs of identical recruit cards as an achievement or bonus event, such as a small gold prize for two and a larger prize for three; define the counting window and prevent redraw farming.
- Find a clearer fixed-edge marker if the lock icon reads as a purchase restriction.
- Improve access to cards deep in a heavily overlapped hand.

## Safe change process

1. Read the relevant code in [`prototypes/v6/heartrow-v6.html`](prototypes/v6/heartrow-v6.html).
2. Make one focused change.
3. Update the version label when behaviour or UI changes materially.
4. If generation or effects change, run [`prototypes/v6/cardcount.js`](prototypes/v6/cardcount.js), [`prototypes/v6/effectreport.js`](prototypes/v6/effectreport.js), [`prototypes/v6/resourcereport.js`](prototypes/v6/resourcereport.js), and update the About text.
5. Run [`prototypes/v6/bot.js`](prototypes/v6/bot.js) to check for crashes and large balance changes.
6. Test the page in a browser at about 360 px and 760 px wide.
7. Check the row, seven-card hands, popups, redraws, Retain, exile, and undo.

Run the tools from the `v6` directory:

```bash
node bot.js --games 400 --goal 48 --policies mixed,none,build,rush,pacifist,smart
node cardcount.js 700000
node effectreport.js --samples 100000
node resourcereport.js --samples 100000
```

The bot is a relative balance signal. It is not a substitute for human play or browser testing.

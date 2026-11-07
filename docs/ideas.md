# Heartrow ideas

Everything here is not done yet. Log each idea as one undated line, and mark its status (open, parked, rejected) when it changes. When an idea ships, delete its line, or move one line of evidence to [`history.md`](history.md). Settled design lives in [`design.md`](design.md).

## Open bugs and questions

- Card body overflow safety net (parked): the card body sits at the bottom of a fixed-size card, so a body taller than the card clips its last line. The shortened Cycle and Purge text fixed the known case (Cycle with Retain and three gains); letting an overlong body grow upward over the art would cover the rest.
- Rename the effects (todo for the next version): the effect ids and names `cycle` and `purge` do not match the card text any more (Purge reads "Redraw"), and "purge" often means permanent removal in other games, which is what Exile does. "Redraw" is the verb on the Purge card and "Flush" is now the river button, so the two effects could take those verbs as names.
- Win check (open): the river shifts as part of End turn, so ending the turn exactly on the goal can lose hearts to an escape and undo the win. It is rare (about every tenth enemy escape, not measured), and the player can avoid it by picking kills or rerolling. Options: keep it and warn near the goal, or check the goal after the reap and before the escape. Measure the bots before changing it. Undecided.
- Carry on after the goal: today "End your turn to win, or keep going" only means keep playing the current turn. A real choice could be a mode option where ending the turn does not win and a separate "Claim win" move does, with the run scored by final hearts.
- Stop early or carry on: when the goal is reached, let the player stop or continue to the full turn limit.
- Level 4 harder since 0.0.9 (open): the designer lost two Standard Level 4 runs (63 and 81 of 96) after clearing it regularly. Suspect the wider effect variety from parameterized effects or the enemy Gold/Power gains; the bot did not see it (`lab-human` is about 1 ♥ better on 0.0.9 at every goal), so it needs more human runs before a balance change.
- Level 4 needs exile and draw (open): every logged Level 4 win exiled 15 to 18 cards and had draw support, and the designer and the bots rarely buy Hearts cards. Try a Tide-heavy and a reaping run to see whether Hearts-first builds can win; the planned effects (Basic conversion, exile bonus, Basic engine) should widen the ways to get rid of Basics or make them worth keeping.
- Undo peeking at random outcomes (open): free undo supports resource planning, but undo after flush, draw, cycle, purge or take can reveal an alternate random branch without spending the resource. Prefer to keep undo free for solo play; if competitive modes arrive, consider a no-undo or undo-flagged mode instead of making undo a resource.
- Free enemies (open): stacked `weak` makes the discount larger than any enemy cost, so enemies cost 0 and the run can become infinite. `cardCost` floors enemy cost at 0. Options: a floor of 1, a cap on stacking, or keep it as a degenerate case in the preset library. Same question for `cheap` on recruits.
- Cheap enemy alternate rewards (open): a cost-1 enemy can show its minimum 1 ♥ plus an alternate resource even though that exceeds its 1.4 budget. It may be rare enough to keep as a special reward; decide whether to reserve the minimum Heart and suppress the alternate gain.
- A recruit that only draws one card (a 2 ● Draw 1 with nothing else) appears again. An earlier rule said it should not. Decide later.
- The saved run has one slot only; several slots could come with saved generators.
- Copy run on a phone over an insecure LAN address shows “Not copied” because the modern Clipboard API is unavailable and the legacy fallback cannot be confirmed. Try HTTPS or a more useful “Copy attempted” state.
- Bond pricing (parked, feels a little off): Bond costs `0.5` plus `0, 0.7, 1.5` for +1, +2, +3, so +3 costs `2.0` budget, two thirds of a plain +3. A playtest card (4 ●, 1 ⚔, Bond +3 ⚔, Retain) felt cheap, since a Retained Bond card can wait until its type has been played, and a generator with few types makes that likelier. Counter-view: a buyer who plans on several cards of one colour will often miss, and the card's price works out about right against a guaranteed 4 (Bond +3 at 2.0 is 1 + 2 + 0.5 = 3.5 budget for the bonus part, against 3.7 for a cost-4 card). Making it miss would need about 0.9 per level, which may be too harsh. Leave it until more play data; changing it is an engine change, so bump the version then.
- Colour review after the icon change: the light theme looks weak, Enemy purple and Tide blue are too close, and unaffordable recruit cards (dimmed to 55%) look faded next to Basics. Decide in one pass over both themes.
- Open question for `draw`, `cycle` and `purge`: do they need anything in `EffectDef.needs`? They touch no resource.

## Cards and generation

- Basic row recruits: let Basic cards appear in the row as low-complexity purchases with a more generous budget (no `.85` conversion, maybe a small bonus). Decide whether their cost and effect ceiling need separate limits.
- Multi-colour recruits: two-colour and rare rainbow cards whose played colours all count. Candidate budget `C × .85^n + .3`. Decide display, affinities, whether a rainbow card alone satisfies `all3`, and whether `all3` should need three cards instead of three colour tokens.
- Row-discard effect that removes cards matching a category (all cheap cards, enemies you cannot beat, all Ember, the fifth card). Risk: category targeting adds complexity and dilutes the pool. Also a row-targeting effect to reduce dead late offers.
- Effect that draws a temporary sixth card into the row (refill only up to five afterwards).
- Refund part of a recruit's cost when it is exiled.
- Exile bonus: a thin deck leaves cards like a lone Draw 1 with no reason to exile them. Either a card gives a bonus when exiled (refund, heart, draw) or an exile effect pays for any card exiled. Decide this together with the refund idea. Needs an "on exile" hook.
- Exile from the recruit row: weak (rarely more than one per turn) but saves wasted exiles. Does the card go to your exile pile (Vault counts it) or leave the game?
- Type-conversion effect that turns Basic cards into a chosen gem type. Decide whether it is permanent and how it competes with exile.
- Parametrized Basics (open): roll the amount and the card count of `basics` the way `hoard` does, so a Basic-heavy deck can pay more than `+1` per 4. Not done with Hoard; Basics are still fixed at `+1` per 4 basic cards.
- Swap river cards (open): let the player swap the 4th and 5th river card, for a flush or through a card effect (probably with Retain, since it is only useful at the right moment). Motivated by a wanted card that could not be bought with the resources at hand.
- Retain on Cycle (open): neither Draw nor Cycle can roll Retain today. Retain on Draw is pointless, since a Draw card is always played, but a retained Cycle could wait in hand for a bad draw.
- Strip-colour effect (open): the opposite of conversion, it turns a coloured card into a Basic, working like exile. It only helps the Basics effect, so it needs more than that to be worth a card.
- Basic as a generator type (open, daring): let Basic recruits roll in the row (see "Basic row recruits"). It dilutes the pool, but a diluted Standard pool is the aim: players adapt to what they are dealt, and presets and challenges serve those who commit to a style before the game.
- Growing cards whose payout increases after each play. Decide whether growth belongs to the card instance or its definition and how duplication interacts.
- Flush counter as an effect input (gains grow with each flush). Do not store "was stuck" in `GameState`: a human's reason for flushing is not knowable.
- Opening-turn trigger for drafted Basics when no coloured type has been played yet (starter Basics would not carry it).
- Three enemy effect variants that, when defeated, double the selection weight of non-lean effects for future Moss, Ember or Tide recruits for the rest of the run (2× weight, not "+200%").
- Enemy cost minimum of one after discounts (see free enemies).
- Reprice `weak`. Add a `flush` effect (probably enemies only), a duplicate-rightmost-unused-card effect, and a `haste` effect that resolves a recruit's effect when recruited.
- Untap effect (open): replay a selected played card to give Ember a way to reuse scarce gold without Swap, but suppress the selected card's Untap effect during the replay so Untap cards cannot recurse.
- Count recruiting as playing a type. Let draw-only cards count as simple. Cap stacked Retain cards.
- Reward rare runs of identical recruit cards as an achievement; prevent flush farming.
- If Basics are removed, test starter compositions such as 3 Moss / 3 Ember / 3 Tide.
- Parametrised effects (open question): `foes`, `pile`, `all3` and `vault` are fixed text today (`hoard`, `weak` and `cheap` are the model). Possible parameters: the currency, the divisor and the amount. `basics`, `pile` and `vault` could roll amount and divisor through the shared count-gain helper. Each would need a price per step. Generator settings must not change rolled parameters except through the allowed resources and types.
- Smarter Retain for bots (open): `retainChanges` says playing `exile`, `cheap`, `weak`, `flip` and the reaps always changes something, so bots never hold them and Retain on those cards is a pure budget cost for them. Exile could wait until a hand has a card worth exiling, Weak until an enemy is in the row, Cheap until a recruit is buyable, Draw while the deck is small. Retain usefulness by effect, from the designer's play: useful to wait on are Exile, Cycle, Cheap, Weak, Foes, All3, Pile and the reaps (wait for a double or triple), situational are Swap, Bond, Kin, Basics and Coin, and rarely useful are Army, Hoard, Vault, Draw and Purge (it often breaks Retain plans). Possible shape: one chance per effect by usefulness, flat price 0.5, Exile at 1.
- Retain terms (open): any effect can roll Retain now, with a per-effect price and chance (see design). The bots lost 4 to 6 hit points at goal 48 from the extra budget spent on Retain they rarely use, so the first tuning questions are whether the strong tier should cost 1 or 0.5, and whether bots should buy or hold Retain on Draw and Exile. Original v5 rule, for the record: Retain only on effects with a condition that can fail or wait (foes, all3, vault, pile, kin, bond, army, swap), not on unconditional ones (draw, exile, cheap, weak, coin, basics, reaping, plain gains, enemies); its author agreed it was too narrow for cycle, purge, exile and draw.
- Unified resource leans (open): after the current parametrization work, consider unifying the existing 70/30 effect lean with direct resource selection without changing recruit balance accidentally.
- Coin payout variants (open): compare 50/50 flips such as 1/3 or 3/5 with the current 2/4 payout, including the budget price and how much risk the lower result creates.
- Show calculated values for conditional effects without crowding the card. Mark cards that need a decision so Play simple is less necessary.
- Generator editor warning: recruits are bought with gold, so a generator with recruit types but no gold (no Basic gold and no gold resource) leaves every recruit unbuyable, and the run is only enemies. Warn in the editor, or say so in the summary.
- Generator editor: the Effects fieldset could get search or filtering if the list grows.

## Enemies

- Boss enemies every tenth turn that cost two resources, or bosses that create pressure while they remain in the row. Open: whether board effects expire or persist, and how the player removes them.
- Bosses with two resource tracks and persistent partial payments (pay 3 ● and 4 ⚔ one turn, 4 ● and 6 ⚔ the next). Bosses should not be affected by the normal flush; a special effect could reroll them and the fifth card.
- More enemy variety, and more enemies at higher levels.
- Easier early rounds (open, from a playtest): the first river was 4●, 3⚔, 3●, 2●, 4● ("not even that good"), and the early turns can make or break a run. Bulk enemies now offset the cheap 1 ⚔ for 1 ♥ enemies, so an early Bulk no longer feels guaranteed. Candidates: a lower early cost range, more cheap cards in the first rows, or cheaper early enemies. Measure with the bots before changing anything.
- Bulk tuning (open): at 12 cards a Bulk enemy costs only 1 ⚔ more than normal, which the designer finds barely noticeable, and it is rolled mostly on cheap early enemies because it costs no budget. Check the premium (reference deck size 16, 4 cards per step) and its frequency after playtests.

## Starters, builds and modes

- Starter builds: begin with a small synergistic deck or a turn-10 setup. Decide whether the player chooses or gets one at random. Also two experimental formats: constrained generators (tests viability) and curated starter decks (tests whether starting with the build is fun).
- Let challenges shape the early row, for example a run with no Ember, without a permanent starter deck.
- Build Lab: give the player a budget and let them assemble cards under the generator's limits. Keep it separate from normal scores.
- Paid starter builds: stronger packages spend starting hearts (`1.5` budget per heart), so the run begins in debt. The tested 12-card Moss package costs `27.5` raw budget (about −19 ♥); a −40 ♥ charge tests a 2× premium. A candidate Moss starter: 2× `+3 ●`, 2× Coin, 2× Kin, 1× Army, 2× retained ReapG, 3× retained Swap (`29.5` raw, about −20 ♥).
- Starter shape in the generator: starting with no Basics at all, or a tiny starter (a couple of 1 ● cards) for a harder Pacifist.
- Level-specific goal variants. Distinct modes with separate high-score tables. Objective modes (defeat M enemies, reap 15 hearts, exile every Basic, hold 12 cards), possibly as a campaign.
- Curated card pools or expansion sets instead of one diluted random pool.
- Endless continuation after the normal run (goals, costs, escapes, scoreboards).
- Long Run could take a goal of its own, so `goal` would apply to every mode.
- Saving generators: named slots in localStorage, with a Save button next to the preset list, only for Custom settings so built-in presets cannot be overwritten. Names stay in the browser and show as plain text, so no swearword filter is needed. If names ever travel in links or a public list, cap their length and show them as text only.
- Starter ratio benchmark (open): compare the default 6G / 4X starter with a gold-heavier 7G / 3X starter using the same bot seeds, goals, purchases, escapes and final hearts before changing Standard.
- Moss economy as the beginner preset (open): one human run won Level 3 with it and found few decisions per turn. Repeat it a few times before promoting it, and decide where a beginner would find it (a "Start here" entry, or the first preset in the editor list).
- Real preset descriptions (today they are generated). Pacifist note: with 10 Basic gold cards you are guaranteed 5 ● every turn, so the run feels easy.
- Bots for challenge balancing once challenge definitions and playable presets exist.

## Build hypotheses to validate

Candidate archetypes, not approved balance targets. Test constrained generators first to see whether each concept works when its enablers are available; test starter decks separately.

- Tide heart engine: draw, discard, Retain, exile and direct hearts (a Tide-heavy run has won).
- Exile vault: exile Basics and use `+1 ♥ per 3 cards in exile`. Depends on exile availability.
- Ember combat: power, `foes`, `weak`, discard-pile power and enemy rewards. Pure Ember has one Level 4 win; repeat it before treating it as reliable.
- Moss economy: `flip`, Basic-count gold, gold Reaping, expensive recruits, Swap as an outlet. Pure Moss is unproven.
- Swap converter: generate one resource and exchange it. Probably a bridge, not an archetype.
- Discard-pile engine: cycle or purge to grow the discard, then `+1 ⚔ per 3 cards in discard`. An Ember/Tide hybrid.
- Wide tribal deck: many cards with `army`, `kin` or Bond. The counterexample to "thin is always best".
- Basic engine: keep Basics to power Basic-count effects, through duplication and Hoarder payoffs, so Basics are a positive choice and not an early-exile target.
- Rainbow combo and `all3` build: play all three types with Bond, Kin and `all3`, and collect `all3` cards across colours without making a generic best strategy.
- Reaping or greed: make excess resources and convert the rest to hearts at end of turn. Probably a finishing engine.
- Micro-deck: four or five efficient cards. Does consistency make up for lost flexibility?
- Draw engine: enough Draw, cycle, purge and Retain for reliable resources. Possibly shared by several colours.
- Bot policy ladder (open): build benchmark bots from random by adding policies one at a time, compare greedy and sampled selection, and keep strategic rules such as early resources or exile targets as explicit profile hypotheses.
- Bot outlier analysis (open): report the best run's seed and replayable context, then compare its sampled decisions with the greedy run on the same game to learn when randomness finds a stronger line.
- Late flush (open): remove the generic final-two-turn flush veto because late costs are scaled up; compare named greedy bots and restore the veto only if the extra flushes reduce hearts.
- Human-style bot (open): value early gold, power above the deck's best power card, up to three diminishing exiles, varied effects, late hearts, right-side enemy kills except when Foes benefits from leaving enemies, and a short Swap plan that targets an affordable river card.
- Human bot readiness rules (open): estimate current-hand gold with Coin worth 3 expected gold, deprioritise early Reaping but reconsider ReapG and ReapP as late Heart candidates, require setup for Bond, Army, Kin, all3, Pile and Vault, and use one effect-value policy instead of one permanent policy per effect.
- Human bot play order (open): play plain resource gains first, make Cycle/Purge the main effect exception, and ignore unsupported conditional effects such as all3, Kin, Army and Bond unless a dedicated build bot can evaluate them.
- Flush edge lookahead (open): when the affordable right-edge enemy would leave the next enemy to its left unaffordable, consider flushing instead of taking the edge enemy.
- Bot flush resource gate (open): do not flush when all remaining resources are below the expected current card cost, even when an affordable row card is later vetoed by the buying policy.
- Average-gain buying (open): combine phase priorities with a soft bonus for how much a purchase raises the relevant deck average, so a 3 Power card can beat a 2 Gold card when Power is the needed resource without vetoing useful low-gain cards; compare this with `phaseBuy`.
- Average-relative exile (open): choose exile targets by their value against the current resource average, with a roughly 15% retention threshold and Weak/Foes worth about 1 Power, so early Gold is protected and later Power can be thinned.

## Screens, modes and sharing

- Home screen: a plain first version is built (see the design doc). Still open: its look (the title screen concepts below), the look of the level picker, and a Challenge entry.
- Challenge entry (later): "Custom generator…" is a scary label and screen for a casual player (30 checkboxes, two dropdowns, two number fields). A Challenge screen should list presets with a level pick, and the editor should be one option on it, not the front door.
- Simple preset with Exile (open): allow Exile in the beginner card pool as a deliberate exception to “Simple only,” then consider renaming it to “Simple start” or “Plain cards.”
- Sequential Standard unlocks (open): keep Level 1 available, unlock each later level after the player wins the previous one, and show locked buttons such as “Win Level 1 to unlock.”
- Level names (open): "Easy, Medium, Hard" for Levels 1 to 3 wait for evidence, since the designer struggled with Level 1 early on yet has won Level 3 twice. Revisit with feedback from new players.
- Long Run starts a new run at once from home and replaces the run in progress without a warning. Decide whether it needs a confirm or the same note as the level picker and editor.
- Challenge: the player chooses a generator and tries to make it work. Custom challenges choose or ban types and effects, with several slots to save, edit and duplicate. Start with the Level 1–3 goals. Leave starter decks out of the first iteration.
- Challenge objectives (open): finish a run with no escapes, or with fewer than 10 wasted Gold and fewer than 10 wasted Power; recognize that passing on a card can be correct when it leads to no useful river action.
- Show the mode, difficulty, goal, seed and run brief before a menu-launched game and in an overview popup. A shared link starts the game directly and opens the overview once. Compose the brief from structured selections, with only a short length-limited player note.
- Standard setup with an editable seed field.
- Keep the game screen mostly unchanged: a route back to the menu and access to the overview.
- Compendium (open): add a mobile-friendly reference that lists every effect, resource and card type with plain-language descriptions, and links the generator instead of pretending the procedural pool is a fixed card set.
- Use the View Transitions API for screen changes, with the screen sliding over an unmoving background; respect reduced motion.
- Visual mockups first (blue, white, pink, buttons, fields, chips, modals); they need no interaction. Sketch code is on `feat/game_screens_sketch`, mockups in `local/mockups/`.
- Title screen: the risograph concept is the best candidate for now, flat (no gradient button borders), in both themes. A URL switch could show flat cards or in-game cards. Use `text-wrap: balance` for button subtitles, a slightly bigger heart that keeps the A readable, no hover flicker, a bit of fidget on the home screen, and menu buttons at the bottom on phones. Next test: a second screen in the same style (the generator editor or the game screen).
- Light mode: decide whether to keep a light theme; a mockup would settle it.
- Fanned or arced layout for the hand and river, knowing it would disturb the geometric CSS.
- Keep the current result screen unless mockups show a problem.

## Interface and presentation

- Better replay controls (open): "Next move" is one click per move, so reaching move 112 takes 112 clicks. Add a jump to a move number or turn, or a run-to-end-of-turn button.
- Stats bar restyle: coloured chips with an icon, a big number and a small label, with Flushs and Piles styled like the other buttons. Draw it in the style of today's cards (rounded corners, header strips, pill badges), without riso hard shadows. Keep the fluid mobile-like layout up to iPad portrait; no separate desktop layout today.
- Riso game screen edits (for later): on desktop, bundle all stats into one bordered panel with Flushs and Piles outside it; drop the border around the hand; too many borders overall. On phones the cards are squeezed and the transparency on real-style cards looks bad.
- Mockup lessons: keep the real card ratio (118 × 175), round the inner border corners, never let descriptions overlap the border, brief mockup agents with the real card CSS and not a style name. Skip exile needs a place on narrow screens.
- Alternative phone skin: bigger card text without effect descriptions, with keyword meanings in a help section or on long press. Styling is swappable on the web, so it can be a skin.
- Large hands on phones (confirmed awkward): an 11-card hand required clicking off the hand and aiming precisely at a card. From 10 cards, try offsetting every other card down by about half a card height; this should overlap only every second card and avoid overlap through nine cards. Prove the idea on a phone before keeping it.
- Whole-hand resource preview (open): show the calculated totals for unplayed cards after the "Your hand" label, including effects such as Vault. Recalculate after each play because the board state can change.
- Draw cards even larger and shrink them more, and test large system text on a phone.
- Animation ideas, all optional: overlap recruiting, refilling the river, exile and the hand closing up; a shuffle animation counting the piles box (0 / 9 to 9 / 0); the piles number changing colour on a pulse; a new hand dealing while the old one flies away; a "−2 ●" flying out of the box on a spend; the status line changing on the click and not mid-animation.
- Defeated tally as a visible count (add it when the first effect uses it).
- Call the recruit row a `river` in player-facing text, if it stays clear. Try six recruit slots if the phone layout holds. Find a clearer fixed-edge marker than the lock. Make card art respond to card properties (a rectangle for power, a ring for draw).
- Lovecraftian visual direction as an optional theme (organic Moss and Tide, arcane Ember, horrors, hearts as sanity). A visual and naming direction, not a rules change.
- Optional tutorial with a way to replay it. Sound, transitions and Android packaging.

## Platforms and architecture

- Dev reload after core changes (open): after the Flip fix, the dev page kept the old engine until a manual refresh, and nothing said so. A dev-only Vite plugin could force a full reload whenever a file in `src/core` changes (or show a "reload needed" banner), because the open session probably still holds events computed by the old engine (not confirmed).
- Terminal platform: an ASCII renderer and a CLI with `--seed`, `--moves` and `--moves-file`, so agents can playtest and replay a game headless. It would print events as log lines.
- Capacitor (an Android wrapper around the static web build) is far away, but honour it now: a static relative-path build with no server, the font bundled locally (done), touch-first UI with safe-area insets and no hover-only affordances, no essential keyboard shortcuts, and persistence behind a small `Storage` interface (`get`, `set`, `list`, `remove`) so game logic never calls `localStorage`. Android back, pause and resume are platform concerns; core state is serialisable, so the web layer can autosave on pause. Defer app id, icons, splash, signing and the store listing until a one-afternoon spike.
- TIC-80 (maybe never): core stays small, plain data and free of ambient APIs, which `check-portability` already enforces. It would need a `platform/tic80` adapter, a bundle script (`vp pack` with `target: es2020`) and a size check. Platforms would declare capabilities (`saveDecks`, `deckBuilder`, `animations`, `themes`) and the menus would hide what a platform lacks.
- A meta layer in core: a second reducer (`core/app`) for the current screen, mode selection, saved decks and history, plus pure view-model selectors per screen (`runView(state)`, `deckBuilderView(app)`), so the terminal platform can reuse the navigation. The builder's rules (budget, heart debt, validation) would be core and tested; its drag and drop is web only.
- Decks as data: a versioned JSON document (`{ v, name, cards, startHearts }`) validated against the paid-starter rule, with import and export as a pasteable text blob. A second packed bit format would fit a few decks in TIC-80's 1024 bytes and double as a short share code.
- Themes versus card skins (web only): a theme is colour tokens switched with `data-theme` (light, dark, later Lovecraft); a skin is card markup and CSS fed by the same view-model. Settings (theme, skin, reduced motion, animation speed) belong to the web platform's persisted settings, not to the game state.
- Daily seeded runs need only a seed source.
- Stronger bots beyond hand-written policies: tune policy weights by self-play (random search or hill climbing on weight multipliers), starting from the existing one-ply and rollout `lookahead`. Pick by weight (varied, good for statistics) versus the maximum with some noise (better for strength comparisons); maybe both as options on `pickMove`.

## Naming

- River theme (open, leaning keep): the designer is not sold on "river", but it is shorter than "top row" and clearer than "recruit row", and "Flush the river" reads well. Keep it unless a better term turns up.
  The working title stays Heartrow until something clearly better turns up. The repo name and the game name do not have to match.

- Heartrow is unique and easy to search on itch.io, but Google autocorrects it to Heathrow, and it keeps the word "row", which the owner dislikes. "Ascension" and "heart row" each match over 1000 itch.io projects.
- A coined name can become a genre label (Balatro), but invented words like Ebbrow are disliked. The owner likes Mossfall, but it ties the brand to Moss, which may not survive a Lovecraft reskin.
- Not checked for any candidate: Google Play, trademark registers (EUIPO, USPTO, card-game classes 9 and 28), and a manual itch.io search for names other than Heartrow.
- Heartwrack is the best alternative (wrack means seaweed and wreckage, so it covers Tide and Moss and suits Lovecraft; no "row"; the web autocorrects it to Heartwork and Heartworm). Hollow Hearts fits the sanity reskin but is generic. Edgefall survives a reskin but is taken by a geometry-style game. Headwater, Millrace and Weir are river images without "row", unchecked; Weir is hard to search for.
- Rejected: Ebbrow (reads as invented), Undertow (an existing tide-based roguelite deckbuilder), Tollrow (keeps "row"), Heartfall, Hearthfall and Heartdeep (crowded).
- Open: does the Lovecraftian reskin rename the project? The river image fits the flow and the Tide colour but is hard to make work visually with cards.
- Genre vocabulary: Ascension's shared line is the centre row (six cards) and Star Realms calls it the Trade Row (five). "River" is a poker term and not the standard deckbuilder word. Ascension has no browser version.
- Repo decisions still open: a licence (the owner's other repos use MIT) and whether the repo stays private until the game is presentable.

## Statistics and progression

- Contribution statistics that attribute gold, power and hearts to the card or enemy that produced them. Decide grouping by definition or instance, and owners for Reap and enemy payouts.
- Between-run progression loop (open): add collectible out-of-run resources, such as gems, from completed runs and let players buy and equip limited lucky charms that alter the generator, for example making Draw twice as likely; decide whether rewards come from wins, final hearts, kills, or a capped combination, and protect core balance with slots and trade-offs.
- Achievements, run statistics, cloud support, leaderboards, unlockable effects and progression after the core run is stable.

## Bots

- Human bot cycle readiness (open): refine the expected-resource comparison with effect budgets as a small value prior; direct gains from the Cycle/Purge card now count, and the estimate still needs to cover the draw pile and discard reshuffle.
- Deck-relative buying value (open): compare a recruit's expected gain with the post-purchase average of the non-exiled deck, require roughly 10% average uplift, and use a diminishing smooth score so 2, 3, 4, 5 and 6 gains are ranked fluidly rather than by fixed bands; Coin counts as 3 expected Gold.
- Gold and power balance (open): a recruit's main currency follows its colour (Ember always power, Moss always gold, Tide half and half), so a deck heavy in one colour can be short of the other and wastes what it has. Look at whether Standard needs a gold-or-power correction, using bot data over many seeds.
- Better bot (open): combine `mixed` buying with `smartFlush` as a new profile (not a change to `mixed`, which is the v7 baseline). Evidence is in the history file.
- Tutorial mode (open): a predefined seed with a status bar that explains more, as the way in for new players, since Standard is where they will go first and the Moss economy and Ember combat presets have fewer or more decisions than it does.
- Bot tuning (a thread of its own): the bots are very deterministic, with policy weights in the millions. Look at softer weights or sampling, and at teaching them goals above 48, where they hit 0 to 4%.
- Replace the huge and tiny magnitudes (1e12, 1e-9) with human-sized numbers (about 1 to 100) and accept a different move about 1 time in 100. Measure first, change, compare, then judge. Priority tiers (a tier plus a weight within it) are a cleaner alternative.
- Make the bot flush memory pure without a "stuck" flag in `GameState`: a flush counter in state, or the driver passing memory in.

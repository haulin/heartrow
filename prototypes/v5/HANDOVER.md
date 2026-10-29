# Heartrow: handover for the next agent

You have no prior context. This document plus `heartrow-v5.html` is everything. Read sections 1, 2 and 9 before touching anything.

## 1. What this is

Heartrow is a single-file HTML prototype of a single-player roguelike deckbuilder, built in one long chat session with a game designer who iterates by playing full runs and reporting what felt wrong. It is a prototype that has reached "playable and fun". The next stage is validation with other players, not more features (see section 10).

Lineage and honesty about inspiration: the core loop (a moving row of cards, gold buys recruits, power defeats enemies, enemies don't enter your deck) comes from Ascension and Star Realms, and the user's direct inspiration is the Steam game **Gemblades**. The user does not want to copy Gemblades' art, names, theme or card list, and does not. What is original here: all cards are procedurally generated from a budget (no hand-made art or names), enemies that reach the edge cost hearts, the Retain keyword, position-in-row strategy, type "leans", and the effect set. Footer text in the About popup credits Dominion, Ascension, Gemblades and Star Realms.

Name: "Heartrow" (placeholder). Current label: v5. Score is "hearts" ♥ (the original gem name was confusing).

## 2. Files

- `heartrow-v5.html`: the whole game (about 24 KB, about 200 lines but very dense; the user has joked that a readable version would be much longer). No build step, no dependencies except Google Fonts (Bricolage Grotesque, with a system fallback).
- `bot.js`: headless balance bot. It loads the game's own `<script>` into a Node `vm` with a stubbed DOM and plays thousands of games.
- `cardcount.js`: estimates how many distinct cards the generator can produce.
- Run: `node bot.js heartrow-v5.html --games 400 --goal 48 --policies mixed,none,build,rush` and `node cardcount.js heartrow-v5.html 700000`.

The game was hosted as a Claude artifact. That link is gone with the project, so the HTML is the source of truth.

## 3. Rules as implemented

- 24 turns (`TURNS`). Levels set only the hearts goal: **48 / 64 / 80** (`GOALS`). The New game button opens a level chooser. Game starts at level 1 (`LV=0`).
- Win: hearts >= goal when you **end your turn** (after escape penalties and end-of-turn reaping). Reaching the goal mid-turn only logs "Goal reached!", and you may keep playing for a margin. Lose: out of turns below the goal.
- Starter deck of 10 "Basic" cards: 6 give +1 gold, 4 give +1 power (`SP=4`). Hand size 5. Deck reshuffles from the discard pile when empty. Cards with **Retain** that weren't played stay in your hand at end of turn, and you still draw 5 (so hands can exceed 5).
- **Recruit row**: 5 cards, index 0 is the left (newest), index 4 is the right edge. Taking a card (recruit or defeat) removes it, the cards to its left shift right by one, and a new card is generated at index 0. Consequence the designer loves: buying the card to the left of an enemy buys the enemy time, and buying the edge card pulls its left neighbour onto the edge.
- End turn: the edge card leaves the row. **If it is an enemy you lose its heart reward** (hearts can go negative). A recruit leaving costs nothing. A new card enters on the left, played cards and the hand go to discard (except Retain), and you draw 5.
- **Recruits** cost gold. They go to your discard and their gains and effects happen when you play them from your hand.
- **Enemies** cost power. They are never added to your deck. Defeating one gives its hearts and any effect once, immediately. Defeat effects are shown with a "Defeat:" prefix in violet.
- **Redraw**: replaces the four left cards (the edge card stays). Start with 1, gain +1 at the start of turns 4, 7, 10, ... and they stack.
- Costs in the row scale with the current turn (see 4). Discount effects last one turn.
- "Play simple" (and Space) plays every unplayed card with no worded effect. Cards with any effect are skipped on purpose, because they may need a decision.
- Exile (an effect): pick any card in your hand, played or not, or press "Skip exile". Forced exile was explicitly rejected.
- Undo: restores the state before your last card play or exile, but only if nothing random happened since (any draw, coin flip, buy, redraw or end turn clears it).

## 4. Card generation (`make(turn)`)

Cards are generated **on demand when they enter the row**. There is no row deck. The user's own deck is the 10 starters plus what they recruited. Rough pipeline:

1. Enemy with probability `FOE=.35` (type `foe`); otherwise recruit with a random type from moss, ember, tide.
2. Cost range grows with `t=min(turn,24)/24`: `lo=2+round(3t)`, `hi=4+round(5t)`, uniform in between. 10% chance of +2. 15% chance of a cheap card (2 to 4) regardless of turn. Enemies get `-EC` (EC=2, minimum 1).
3. Value budget: recruit `b=cost*.85+.3`, enemy `b=cost*HM` (HM=1.4). Resource values: gold 1, power 1, hearts 1.5.
4. Maybe one effect: probability .45 (tide .75), picked among effects whose value fits the budget. About 70% of picks come from the card type's **lean** list (`LEAN`), otherwise any effect. Draw effects need 1 extra budget so the card still has a resource. Enemies can't get effects that depend on the card's own type (`NF`: all3, bond, kin, army).
5. Bond picks +1, +2 or +3 (extra cost 0, .7, 1.5 on top of its base .5).
6. Retain: for cards with a conditional effect (`CF`), 80% chance, costs .5 budget.
7. Fill the remaining budget with resources. Recruit main resource: ember = power, tide = power 50% of the time (`TP`), moss = gold. 70% main, otherwise hearts or the other resource. Enemies only give hearts.
8. **Final cost is recomputed from what was actually spent**, so unspent budget lowers the price (identical cards cost the same). Recruits: `max(2, min(cost, ceil((spent-.3)/.85)))`. Enemies: `max(1, min(cost, ceil(spent/HM)))`.

Art is a seeded SVG derived from the card's stats (type, cost, gold, power, hearts, effects), so identical cards look identical. Number of shapes grows with cost (7 to 18). Shapes by type: moss circles, ember rotated rectangles, tide rings, enemy triangles, basics diagonal lines (power ones slant the other way).

Distinct cards (estimated with `cardcount.js`): about 6,500 to 8,000 recruits and about 125 enemies. The About popup has these numbers hard-coded ("about 8,000 possible recruits and 126 enemies"). **Re-run `cardcount.js` and update that sentence whenever you change `make()` or the effect table.**

## 5. Effects (`FX` table: key, base value, text)

Gains: `coin` 2.5 (flip: +2 or +4 gold), `basics` 1.5 (+1 gold per 4 Basic cards in your deck), `foes` 2 (+1 power per enemy in the recruit row; counts the enemy being defeated), `pile` 1.5 (+1 power per 3 cards in discard), `vault` 2 (+1 ♥ per 3 exiled cards, repeatable every play, the designer's favourite engine), `all3` 2 (+2 ♥ if Moss, Ember and Tide were all played this turn, the card counts itself).
Same-type: `bond` .5+ (+1..3 of the card's main resource if the same type was played earlier this turn), `kin` 1.5 (+1 per other same-type card played this turn), `army` 1.5 (+1 per 4 same-type cards in your deck). Kin and army can give gold or power (`km`).
Utility: `draw1` 1, `draw2` 3, `exile` 1, `cheap` 1.5 (recruits cost 1 less this turn), `weak` 1.5 (enemies cost 1 less power this turn, probably underpriced), `cycle` 1.5 (discard unplayed cards except Retain, draw as many), `purge` 1.25 (same but including Retain), `swap` 1.5 (swap gold and power).
End of turn: `reapG` 1.5 (+1 ♥ per 3 unspent gold), `reapP` 1.5 (+1 ♥ per 2 unspent power). Each reaping card in play stacks. The gold/power stat boxes show ♥/♥♥/♥♥♥ pills for the number of reaping cards in play.

Type leans (`LEAN`): Moss = gold and growth (coin, basics, kin, bond, army, reapG, swap). Ember = power and enemies (foes, pile, weak, kin, army, reapP, swap). Tide = draw and exile (draw1, draw2, exile, cheap, all3, cycle, purge, army).

## 6. Code map (inside `<script>`)

Constants line near the top: `GOAL, TURNS=24, FOE, HM, SP, EC, TP, GOALS` are the balance knobs.
State is one global object `S` (turn, hearts, gold, power, disc, edisc, mull, types, deck, hand, discard, exile, row, pending, over, k/b/x/pl/lost/wg/wp counters, rg/rp reap counters, hist log, snap undo snapshot). `LV` is the current level.
Functions: `make`, `basic`, `newGame(lv)`, `say(m)` (sets status and pushes to the log), `snap/undo`, `draw`, `apply(card, fromPlay)` (all effect logic), `play`, `skip`, `cost/can`, `take` (buy or defeat), `autoplay`, `mulligan`, `endTurn`, `check`, `art`, `card(c,i,ctx)` (HTML), `render`, `deckSummary`, `askNew`, `showAbout`, `fit`.
`apply` is called with `fromPlay=1` for played cards and `0` for defeated enemies. Enemy effects run through the same function, which is why bond/all3/kin/army are blocked for enemies.

## 7. UI architecture and gotchas

- Layout top to bottom: title and goal, stat boxes, "Recruit row" label and row, **status bar** (click for the full copy-pasteable log), "Your hand" label and hand, button row (End turn, Play simple, Redraw, Skip exile when pending, Undo, New game, About).
- Cards are designed at a fixed **118×175 px** and scaled uniformly with CSS `zoom: var(--z)`, where `--z = ((main.clientWidth-48)/5)/118` is set in `fit()` on load and resize. It scales up on wide screens and down on phones so five always fit. **Never change card width independently of height** (an earlier attempt stretched cards and broke the layout).
- Each row and hand card sits in a fixed-size `.slot` wrapper. Hover lifts the card inside the slot, which prevents the hover/flicker loop at the bottom edge. The hand overlaps cards evenly when it has more than 5 cards (`--k`). Played cards stay in place, dimmed with `filter`, never moved.
- **Class-name collision bug already fixed:** the grey outline for the edge slot is `.card.rim`. It used to be `.card.slot`, which accidentally matched the wrapper rules and scaled that card twice. Don't reuse `slot` on cards.
- The shake animation uses the `translate` property so it doesn't fight the hover `transform`. Hover lift has no transition (the whole DOM re-renders on every action, so a transition would replay).
- Whole-DOM re-render on every action (`render`). Hand cards jump when cards are drawn; transitions were discussed and deferred.
- Card text chips: `.bd` has no padding or gap; each child has `padding:1px 3px 2px 6px; margin:0 -2px; background: card colour 78%`. Art is a full-card SVG under the header and text.
- `font:` shorthand with `inherit` as the family was invalid and silently ignored earlier. Use separate properties.
- `user-select:none` on `main` (taps selected text), but popups allow selection so the log can be copied.
- Uses `color-mix`, `zoom`, `structuredClone`, `<dialog>`. Fine in current browsers.
- Colours: light and dark variants via `:root` variables and `prefers-color-scheme`.

## 8. Balance state and evidence

- Human (the designer) beats the bot by a wide margin. He regularly wins Level 1 and 2 well before turn 24, finishing around 57 to 70 hearts, beat the earlier Level 3 (64), and on the current Level 3 (80) has finished 78/80 and 45/80. The goals were set from his results, not the bot's.
- Bot (`bot.js`, greedy): at goal 48 it wins roughly 20 to 35% depending on the effect pool, median hearts about 36 to 44. It loses about 9 to 10 hearts per game to escapes and wastes about 29 gold and 33 power. The "never recruit" policy wins 0%, so recruiting matters.
- Bot limits: it does not use swap, reap or Retain deliberately, plays cycle effects last, and exiles basics after turn 3. Use it for relative comparisons after a change, not for absolute win rates.
- Waste (unspent gold or power) of about 10 to 15% of income is structural. Reap effects and swap are the intended outlets.
- Row has no enemies at the start of about 21% of turns.
- Row costs follow the turn while income follows the deck, so strong gold engines outscale the price curve (the designer reported 11 to 16 gold a turn by turn 10).

## 9. Decisions already made (do not reverse without asking)

- Power colour stays red (`--ember`). An orange variant was rejected (too close to the pink heart).
- Disabled (unaffordable) cards: just `opacity .55` and the shake on click. No dotted borders or grayscale.
- No crossed-out original cost on discounted cards. The "discount" stat shows gold discount in yellow and enemy discount in red, no icons, nothing when zero.
- Enemies: own type "Enemy", violet, 2px dashed border, "Defeat:" prefix on effects. They never join the deck.
- Gemtypes are named Moss, Ember, Tide (green circle, red rectangle, blue ring in the "types played" stat, all the same size).
- Skip exile stays. Forced exile was rejected.
- Retain cards stack on top of the 5 drawn cards (intended, priced at .5).
- Redraw replaces 4 cards, not 5 (the edge slot is special).
- Currency does not carry between turns (rejected: it makes a different game).
- Keep the log verbose and copy-pasteable (the designer pastes turns into chat).
- The designer prefers looks over accessibility but is mildly protanopic.
- Labels like "discount" and "redraws" are short on purpose to save width.

## 10. Backlog and open questions

Proposed but undecided: exile refund (half the recruit's cost in gold); floor of 1 on enemy cost after discounts so enemies can't be free (turn 6 once killed 8 enemies); higher levels could also raise enemy frequency, not only the goal; `weak` is probably underpriced.
Ideas parked: boss enemies every 10th turn costing two resources; recruiting counts as playing a type; draw-only cards count as "simple"; six recruit slots (concern: phone width, and slower row pace); a cap on stacked Retain cards; marking cards that need a decision so Play simple isn't needed; more enemy variety (only about 125 distinct enemies); level-up goal variants; transitions and sound; tutorial; Android packaging (Capacitor or TWA).
Strategy advice already given: stop adding effects. Next: let 3 to 5 people play without explanation, fix only what several hit, and write a release bar first. The designer's goal is to ship many small games quickly and see which gets traction, so avoid a 2-month polish spiral.

## 11. Working with this designer

- He plays a full run, then sends detailed notes with log excerpts. Treat every note as feedback to act on or answer, in order.
- He wants decisions made for him ("you are a smart cookie") but also wants honest answers when asked WDYT. Say when something is a guess.
- He values small UI details ("part of the feel"). He catches inconsistencies fast. Keep tone casual and concise.
- Verify with the bot after any change that touches generation or rules, and re-check that the page's script runs in the vm.
- Edits were applied with small Python scripts that assert every old string occurs exactly once. This avoided silent mismatches in the dense single-file code. Reuse that pattern.

## 12. Checklist when changing things

1. Change `make()` or `FX`: run `cardcount.js`, update the About sentence, run `bot.js` for crashes and big win-rate swings.
2. Change levels or goals: edit `GOALS`, keep the New game popup (it reads `GOALS`).
3. Change layout: test narrow (about 360 px) and wide (760 px). Check the 5th row card against the other four, hand overlap with 7+ cards, and the popups.
4. Bump the version label (title and h1) when behaviour or UI changes materially.

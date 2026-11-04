# Heartrow history

Finished work and evidence, kept for lookup. Do not read it before a change. Current rules are in [`design.md`](design.md) and open work is in [`ideas.md`](ideas.md). Add a line only when it holds evidence a commit message cannot (numbers from a playtest, a reason that was hard to find).

## Undo and generation

- Undo-peek simulation: `npm run sim -- --analysis undo --games 1000 --seed 1 --mode standard --goal 1` sampled 23,000 turn states with no row purchases. The first preview card became the next row card 87.2% of the time; preview cards 2–4 matched the next-turn redraw cards 1–3 78.8% of the time; all four future positions matched 73.7% of the time. Generation thresholds made some turns much less predictable, especially T11, where all four matched 0.1% of the time.

## Bot policies

- Bot baseline: 100 base seeds × 400 games per profile, using the same seeds before and after. The old greedy `mixed` profile averaged 36.2 ♥ at goal 48, 37.4 ♥ at goal 64, and 69.1 ♥ in Long Run; normalized sampled `mixed` averaged 30.2 ♥, 30.6 ♥, and 51.3 ♥. The new `random` control averaged −9.3 ♥, −9.3 ♥, and −41.1 ♥.
- At goal 48, `smart` moved from 19.1% to 9.5% hits; at goal 64 it moved from 2.4% to 0.5%. It stayed slightly ahead of `mixed` in Standard mean hearts after normalization, while Long Run `mixed` remained slightly ahead. All normal profiles stayed well above random.
- `lookahead` was measured separately because it is expensive: 100 games for each Standard goal and 20 Long Run games. The normalized version averaged 35.2 ♥ at goal 48, 37.7 ♥ at goal 64, and 78.5 ♥ in Long Run. Full metrics are in [`tools/baseline/bots-2026-11.json`](../tools/baseline/bots-2026-11.json).

## Undo and generation

- Undo-peek simulation: `npm run sim -- --analysis undo --games 1000 --seed 1 --mode standard --goal 1` sampled 23,000 turn states with no row purchases. The first preview card became the next row card 87.2% of the time; preview cards 2–4 matched the next-turn redraw cards 1–3 78.8% of the time; all four future positions matched 73.7% of the time. Generation thresholds made some turns much less predictable, especially T11, where all four matched 0.1% of the time.

## Generator and presets

- Constrained "simple only" run (first playtest): the pool felt very small (four identical 2 ● + 2 ⚔ Ember cards in a row), a few turns had nothing affordable, and with no exile or draw a few good cards carried the run. Level 1 was reached on turn 23. Bots (400 games, seed 1, goal 48): `mixed` hit 34% against 22% in Standard, `smart` 35% against 16%, so for bots the plain pool is easier. The bots' mean hearts at turn 24 was about 5 higher. At goals 64 and 80 neither mode was reachable for them (0 to 4%). It later became the Simple only preset.
- Resource switches came from a pacifist run (`types=moss,tide`) that wasted 48 ⚔ and ended on 43 of 48 ♥ with 0 defeated, because Basics still gave power. Plain gains, hearts and the Kin and Army currency are redirected to an allowed resource.
- Effect requirements (`EffectDef.needs`): `foes`, `weak` need enemies and power; `pile` needs power; `reapP` needs power and hearts; `coin`, `basics`, `cheap` need gold; `reapG` needs gold and hearts; `swap` needs gold and power; `all3` needs all three colours and hearts; `vault` needs exile and hearts.
- Presets: Standard, Simple only, Attack only, Pacifist. Pacifist is the playtested variant (Moss and Tide, gold and hearts, ten gold Basics). Attack only is `types=foe&res=power,hearts&sg=0&sp=5` with Foes and Weak. Its bot run gives 98% hits and about 92 hearts in 5 turns, because stacked Weak makes enemies free. Pacifist playtest: 80 ● wasted in a win on turn 22 with 54 ♥, exiled 10, recruited 19.
- Moss economy preset: a human won Level 3 with it (86 ♥ on turn 23), while the bots reach goal 48 only 9 to 12% of the time. Tide hearts (54 to 57%) and Ember combat (32 to 33%) are the other two. Bot numbers: 200 games, seed 1, goal 48.
- First bot numbers for goal 1 (200 games, seed 1, `mixed`): Standard 21%, Simple only 33%, Pacifist 22%, Attack only 98%.
- The original bot driver ended the turn by weighted chance, so an endless turn did not hang it; the sampled bot driver keeps the 80-move turn cap and 4000-move game cap as safety nets.
- Decided: the game is called Standard, not Classic. There is no separate Simple mode; the modes are Standard, Custom and Long Run, and `goal` (1 to 3) is apart from the mode. Old ids (`standard1` to `standard3`, `level2`, a bare `2`) still parse when there is no `goal`.
- Presets, the custom generator type and the step to a `ModeConfig` live in `src/core/custom.ts`; link reading and writing is in `src/platform/web/custom.ts`. Starting any new game rewrites the address, so a reload replays the same run. Pasting a link starts that run; the dialog (New game, Custom generator…) is for changing a generator.
- `drawFirst` plays a Pile card before a draw that would reshuffle. Standard bot numbers did not change (mixed 22%, smart 16%).
- Bots end the turn by weighted chance, so an endless turn does not hang them; the 80-move turn cap and the 4000-move game cap are safety nets.
- Old title-screen concepts and the home screen sketch were not reused; the code started again for the custom generator.

## Bots

- Ember combat preset: the first version had no gold effects, and its recruits (which pay out in power) could not be bought, so the bots bought nothing (32% at goal 48). Adding Exile, Coin and Swap gave 54 to 58%, and a 7 ● / 3 ⚔ start (against 5/5, 3/7 and 8/2) gave 60 to 67%; 3/7 was worse than 5/5 (20 to 32%) and 8/2 was easier (68 to 72%). Seeds 2 and 3, 400 games: 56 to 70% at goal 48 and 19 to 25% at goal 64. A human run on the earlier version wasted 44 ● and 29 ⚔ in a 54 of 80 ♥ finish.
- `smart` against `mixed` (ablation, 400 games, goal 48, seeds 1 and 2, throwaway script): `smartRedraw` is the strong part and `smartBuy` the weak part. `mixed` with `smartRedraw` hits 73 to 74% on Ember combat (against 62 to 64% for `mixed`) and 28% in Standard (against 22%). `mixed` with `smartBuy` is worse than `mixed` in both (52 to 53% and 14%). `smart` itself beats `mixed` on Ember combat (65 to 70%) but loses in Standard (16%), because the redraw gain is the larger effect on Ember and the buying loss is the larger one in Standard. `smartBuy` prefers cheap cards; `mixed`'s `buyValue` prefers dear ones.
- Human redraw ablation (Standard goal 48, greedy selection, 100 seeds × 400 games): the current average-cost rule averaged 42.4 ♥ with 47% goal hits; adding `protectEdge` was unchanged; adding `smartRedraw` alongside the current rules fell to 40.7 ♥ and 38%; replacing the current redraw rules with `smartRedraw` fell to 39.2 ♥ and 31%. `smartRedraw` vetoes redraws when its own condition is false, so it suppresses the average-cost rule.
- Cycle/Purge direct-gain experiment (Standard goal 48, greedy selection, 100 seeds × 400 games): including the Cycle/Purge card's own direct resources in the readiness comparison improved `lab-human` from 42.4 ♥ and 47% goal hits to 42.9 ♥ and 50%. The goal-64 worst replay after the change was −9 ♥ on seed 5000017.
- Redraw reserve allowance (Standard goal 48, greedy selection, 100 seeds × 400 games): lowering the average-cost threshold by `(redraws − 1) / 5` when more than one redraw remains moved `lab-human` from 42.9 ♥ to 43.0 ♥ on average, with the same 50% goal-hit rate.

## Animation and interface

- Resources fly to their stat boxes, and the boxes pulse on arrival. Flights are purely visual and never hold the view back. A flight shows the move's total, lifts, drifts, then speeds to its box. Every change to a box pulses it once. Exiled cards fly to the piles box like recruits. The "Extra slow" speed step is for inspecting.
- A stat box keeps its old number while a flight carries the change (`hold` and `release` in the store). Spending pulses on the click. Flights from one card fan out. A redraw shrinks the four old cards in a stagger and the rightmost goes first. Cards that move because the hand or row changed slide from their old place (`flip`).
- Cards that leave the hand are found by comparing the old and new state (`departingIds`), so exile, cycle, purge and end of turn all fly them to the piles. A card counts as kept only if it was not drawn in the same move. This fixed end-turn cards that stayed still and then vanished with a small deck. A test covers it.
- The presenter plans the next frame only after the view has drawn the previous one. A cap on the total stagger was tried and removed; the last cards leaving together looked worse than a longer wave.
- Input is queued while the logic stays immediate. A click resolves the card by its id, so a card that shifts during an animation is never clicked by mistake. Undo, new game and reduced motion skip the queue. Resource flights ignore the rush.
- Presentation lag: `GameStore` keeps the latest session and a shown session, and each move is a frame with `before` and `after` sessions.
- The turn and discount boxes pulse; a held number counts up one flight at a time. Drawing pulses the piles box. The exile prompt has an idle striped animation that stops under reduced motion.
- Piles overview colours: gold figures yellow, power orange, hearts pink, and each type count in its type colour. Four lines: deck size, plain gains, effects, types. Below 450 px the columns drop and rows flow inline.
- The hovered or focused card gets a glow in its own colour. Cards are drawn at a fixed 118 × 175 and scaled with a CSS `scale`, so small cards do not inflate under a browser minimum font size.
- Icons are web only (`src/platform/web/icons/`). The core keeps the unicode symbols as text, and `Rich` wraps each symbol in a span with a transparent text colour and the icon as background, so copied text stays unicode.
- "Swap ● and ⚔" is the Swap text because the older text was 117.98 px of a 118 px card.
- Browser trick for inspection: `document.getAnimations().forEach((a) => a.pause())` freezes every running animation (resume with `play()`).
- Reward for spending exactly all gold and power in a turn (a bonus heart or a free draw) felt good in two playtests in a row.

## Research terms

- `Gauntlet` in Gemblades unlocks after Invasion V and combines the five invasions into a harder mode with starting-deck customisation and its own leaderboard.
- `Hoard` is not identified as a Gemblades mode in the store or update material I checked. Unresolved until the original review is found.
- `Familiars` are summoned companions in Gemblades, a separate layer from recruited cards: unique, capped at twelve, the oldest is removed on a thirteenth, and they act immediately.

# Progress

Append one entry per iteration. Newest at the bottom. Keep each entry short: what you did, what verify showed, what's next. Decisions you made without asking go here too.

## Decisions

- (none yet)

## Iterations

### 0 · kickoff
- Repo seeded with CLAUDE.md, SPEC.md, CHECKS.md, reference/waypoint.html.
- Next: scaffold (CHECKS.md § Scaffold).

### 1 · scaffold
- Created Vite + vanilla TS project. All three npm scripts work: dev, build, verify.
- Installed Playwright with chromium. Smoke test passes at all 4 viewports (desktop/phone × light/dark).
- Ported seed data verbatim from reference: 13 cards, 12 sources, 6 analogues into `data/*.json`.
- Source structure per SPEC §9: `src/` with stubs for state, render, bar, log, runner/.
- Screenshots reviewed: brand visible, dark theme correct, no horizontal scroll at 400px.
- All 4 scaffold checks ticked.
- Next: Stack and cards — five levels top to bottom, card component, collapsed levels.

## UX log

(begins once CHECKS.md is green)

### 2 · stack and cards
- Ported `render()`, `renderCard()`, `renderDetail()`, `renderSnaps()` from the reference into `src/render.ts`. State store, LEVELS, seed/sources/analogues loaded from `data/*.json` in `src/state.ts`. Shell (top bar, job header, read-only banner, stack, log) built in `src/main.ts`. Full reference stylesheet ported to `src/style.css` with every colour as a token (added `--shadow`).
- Card click toggles detail in place; "expand" link on compact levels works. Not yet verified by Playwright (next iteration, check 17).
- Verify: 32 passed at 4 viewports. Screenshots in `verify/shots/stack/`. Looked at all four: levels in order, Product/Code compact, chips tinted correctly, dark theme legible, phone single column with no horizontal scroll.
- Defects fixed with assertions: world "axes" value was truncated at desktop (now wraps); phone top bar orphaned "Save snapshot" on its own row (buttons grouped).
- Ticked: five levels, Product/Code collapsed, card component. Left 400px check unticked because the bar does not exist yet.
- Decision: kept the empty `.status` row's 16px min-height on idle cards (reference does the same) so cards do not jump when the spinner appears during a run. Revisit in UX phase.
- Next: Assumptions ⚠ gap check, chip enums, card expand in place (checks 15–17), then themes and 400px once the bar exists.

### 3 · assumptions: evidence/belief bars and ⚠
- Render code already drew two separate dot bars and the ⚠ at |ev − us| ≥ 2 (ported in iteration 2). Work this iteration was proving it: new `verify/assumptions.spec.ts`, 12 tests across 4 viewports, 44 passing in total.
- Decision: added a test hook `window.__waypoint = { store, render }` in `src/main.ts`. The seed has no gap ≥ 2 on first load, so tests set `a2.ev` and re-render to reach the flagged state. Later checks (runner states, compare, snapshots) can use the same hook instead of relying on timing.
- Verify: looked at `verify/shots/assumptions/02-gap-3.*` at all four viewports. ⚠ sits beside the belief bar on a2 only, ochre, not clipped, no layout shift. Report in `verify/REPORT.md`.
- Design review defects carried: ⚠ glyph easy to miss at desktop (matches reference, UX phase); assumptions grid 3 + 1 with a lonely fourth card; truncated rests-on/trigger values; 16px reserved status row.
- Ticked check 15.
- Next: check 16 (chips only from SPEC §3 enums), then 17 (card expands in place, stack does not shift).

### 4 · chips: enums only
- Added `CHIPS` (per-level enum map) and `chipFor(card, state)` to `src/state.ts`; `renderCard` now has one chip path instead of three. Anything outside the enum renders no chip. Card types tightened (`WorldChip | InitiativeChip`, `AssumptionKind`).
- Decision: product cards now show `changed` / `unchanged` as the SPEC §3 table says. The reference has no product chip; spec wins over reference. `.chip.changed` shares the signal tint with live/robust.
- Verify: 64 passed. New `verify/chips.spec.ts` (5 tests × 4 viewports) checks every chip against its enum, one chip per card, product/code with all levels open, the `unplaced` chip, out-of-enum words dropped, and chip typography. Looked at `verify/shots/chips/02-all-expanded.*` and `03-product-changed.*`: chips correct and legible at all four, nothing clipped. Report in `verify/REPORT.md`.
- Design review: a changed product card says "changed" twice (chip + status row). Carried to UX phase. Older open items unchanged (3+1 assumptions grid, truncated rests-on/trigger, 16px status row).
- Ticked check 16.
- Next: check 17 (card expands in place with evidence links, resting-on, analogue, history; stack does not shift), then 18 (themes) and 19 (400px once the bar exists).

### 5 · card expands in place
- Detail render was already ported in iteration 2; this iteration proved it. New `verify/expand.spec.ts`, 6 tests × 4 viewports, 88 passing in total.
- Fixed from the screenshots: cards in the same row as an open card stretched to its height (two tall empty boxes). `.cards:has(.detail) { align-items: start }` so only the open card grows; first-load rows still stretch flush. Detail "rests on" dots now mono.
- Decision: "the rest of the stack doesn't move" is asserted as: no card or header changes x or width, nothing above or beside the open card changes y, everything below shifts by exactly the detail's height, collapse restores the layout exactly, scrollY unchanged. Row-mates may shrink to their natural height when the row stops stretching (a2 lost 18px), never grow.
- Verify: looked at `verify/shots/expand/02-a1-open.*`, `03-a2-floating.*`, `04-w2-i1-open.*`. Report in `verify/REPORT.md`.
- Design review carried: full citation sentences as link text on a 230px card (prose on a card); dead band above the dashed rule from the empty status row; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards.
- Ticked check 17.
- Next: check 18 (light and dark themes legible, every colour a token, explicit body background), then 19 (400px once the bar exists).

### 6 · themes legible, tokens only, explicit body background
- New `verify/theme.spec.ts` (5 tests × 4 viewports, 108 passing in total): body background opaque and equal to `--paper`, dark/light per scheme; every visible text sample from 29 selectors reaches 4.5:1 against the first opaque background behind it, in a state that shows job header, banner, ⚠, open detail, analogue box and a changed product card; signal/warn reach 3:1 on paper and card; no colour literal outside the `:root` blocks of `src/style.css`; no inline colour in markup or TS.
- Decision: three tokens moved off the reference values because the reference's tertiary grey and light ochre were below WCAG AA at 11–12px: light `--ink-3` #8a8f99 → #666b74, light `--warn` #9a6b12 → #8a5f0e, dark `--ink-3` #737a86 → #8a919d. Spec says "both legible"; spec wins. Reference values are noted in comments beside the tokens.
- Negative check: restoring the old light `--ink-3` fails the contrast test on 30+ samples, so the assertion is real.
- Verify: looked at `verify/shots/theme/01-first-load.*` and `02-states.*` at all four viewports. Report in `verify/REPORT.md`. Earlier screenshot sets (stack, assumptions, chips, expand) regenerated with the new greys and committed.
- README: added a "Look" section (themes follow the OS, `data-theme` override, tokens only, contrast checked).
- Design review carried: dark cards 1.09:1 against paper (flat stack in dark); heavier keys now closer in weight to values; black `now` pill is the loudest thing on an idle screen; plus the five open items from earlier iterations.
- Ticked check 18.
- Next: check 19 (400px: no horizontal scroll, log below stack, bar fits). Needs the prompt bar to exist, so build the bar shell from the reference (`.barwrap`, hints, input, ⌘K kbd) as the smallest change, without intent routing yet.

### 7 · 400px: no horizontal scroll, log below stack, bar fits
- Built the prompt bar shell in `src/bar.ts` from the reference: `.barwrap` with five hint chips (same text and titles), `✎` prompt with placeholder, `⌘K` kbd, ⌘K/Ctrl+K focus, Enter clears. Submit goes through `setSubmit()` so intent routing (Bar checks) plugs in later; for now it only clears the field. Added a visually hidden label for the input and a signal border on `.prompt:focus-within` since the input itself has no outline.
- New `verify/phone.spec.ts` (5 tests × 4 viewports, 128 passing in total).
- Fixed from the screenshots: the bar covered the "Log" heading at 400px (hints wrap to three rows, taller than the fixed 120px padding). `bar.ts` publishes the measured bar height as `--bar-h` via ResizeObserver; stack/log pad by it, and at ≤860px only the log carries it so there is no dead band between stack and log. Negative check: old CSS fails the new assertion by 46px.
- Decision: moved Playwright `outputDir` to `verify/.out` (ignored). Running any single spec was wiping every screenshot set in `verify/shots/` and leaving failure artefacts there. Full `npm run verify` regenerated all sets; committed.
- Verify: looked at `verify/shots/phone/03-bar-at-bottom.*`, `04-bar-focused.phone-dark`, `01-first-load.phone-dark`. Report in `verify/REPORT.md`.
- Design review new items: sticky top bar is three rows at phone (~125px) plus a ~170px bar leaves ~500px of content; hint chips float over cards with see-through gaps; ⌘K kbd shows on phone. All UX-phase candidates.
- README: bar paragraph in "Look".
- Ticked check 19. Stack-and-cards section complete.
- Next: Runner section, check 20 (job header with phase, "Reaches N levels", k/n cells, Stop, progress bar). Markup exists in `main.ts`; needs `runner/scripted.ts` to drive it: start with a `startJob/endJob` + job state in the store and the Flow A sizing step, then the state machine checks 21–26 build on it.

### 8 · job header: phase, "Reaches N levels", k/n cells, Stop, progress bar
- Built the runner core. `store.job` (phase sizing | intervene | running, dir, levels, touches, done/total) is the only source for the job header, the `.scanning` dim on levels and the "◀ entered here" marker; `renderJob()` in `render.ts` draws all three from it. `src/log.ts` (logEntry, logLine, cite, baseline "Jul" entry on load). `src/runner/scripted.ts` ports Flow A (sizing → c1 → p1, p2 → i1 → a1, a2, Product and Code collapse at the end) with every delay from `runner/timing.ts`. `bar.ts` gained `classify(text)` (the reference's five regexes); `main.ts` routes only `milestone` to the runner for now. Stop button and Esc abort at the next await.
- New `verify/job.spec.ts` (4 tests × 4 viewports, 144 passing in total). Drives Flow A from the hint chip at real demo timing (~11s per project).
- Fixed from the run: a stopped run left trend/_status keys on every card (now deleted, and trends clear only once the run proceeds, so Stop in the window is a true no-op, asserted by serialising state); reference counted 7 cells for six settles (total is 6 now); orphaned "·" in the intervene meta at 400px (two flex children, no glyph).
- Decision: k/n total is 6, not the reference's 7. The spec wants an honest count; the reference never reaches 7/7. Noted in `scripted.ts`.
- Decision: `.scanning` is added one frame after the stack is rebuilt so the dim transitions in (render rebuilds the DOM, so a class present at creation would not animate).
- Decision: the "2s to intervene" warning is a `.warn` span (token colour), not the reference's inline style, so the no-inline-colour check holds.
- Verify: looked at `verify/shots/job/01-sizing`, `02-reaches`, `03-cells`, `04-done`, `05-after`, `06-stopped` across the four projects. Report in `verify/REPORT.md`.
- Design review new items: entry marker on Code is below the fold at desktop during the window; header spinner still turns at 6/6. Both UX-phase candidates.
- README: "Runner" section.
- Ticked check 20.
- Next: check 21 (`scanning` dims every level ~1.1s, untouched levels snap back solid). The mechanism exists; needs assertions on opacity ≈ 0.35 during sizing, 1 after, and timing within ~1.1s, plus screenshots mid-dim. Then 22 (intervene window, Esc leaves state unchanged — the state-equality assertion from this iteration covers most of it).

### 9 · scanning dims every level ~1.1s, then snaps back solid
- Mechanism existed from iteration 8; this iteration measured it. New `verify/scanning.spec.ts` (3 tests × 4 viewports, 156 passing in total) installs a per-frame watcher in the page before the chip is clicked and records: first frame with `.scanning`, first frame at ≤ 36% opacity, first frame with the class gone, and every level body's opacity on that frame.
- Fixed from the measurement: the dim was snapping in, not fading (0ms). `render()` rebuilds the stack, and `.scanning` was added in a `requestAnimationFrame` that runs before the new elements get a first style pass, so the 300ms transition had no before-change style and never ran. Now `renderJob` forces one style pass (`offsetHeight`) and adds the class synchronously. Measured after: hold 1114/1112ms, fade 264/263ms (desktop/phone), every body at opacity 1 on the first frame after (snap out, as the reference does, since the transition only exists on the `.scanning` rule). Assertion: fade 150–450ms; reduced-motion ≤ 40ms; hold 1000–1500ms; snap-back bodies all exactly `1`.
- Also asserted: level heads stay solid while bodies dim; no spinner, accent or entry marker while scanning; World never dims again during Flow A; Esc mid-scan leaves serialised state identical, header hidden, "stopped before running".
- Decision: "untouched levels snap back" is implemented as the reference does it: every level snaps back when sizing ends, touched ones included; touched levels then get their own `preparing` marks. Dim is on `.cards`/`.compact`, not the level head, so the level label stays readable (reference does the same).
- Verify: looked at `verify/shots/scanning/01-dimmed.*` (all four), `02-solid.desktop-light`, `02-solid.phone-dark`, `03-stopped-while-scanning.phone-dark`. Report in `verify/REPORT.md`.
- Design review: hint chips float solid over dimmed cards at phone (chips louder than the change); dark dimmed cards nearly lose their edges (dark stack already flat). Both carried to UX phase. No new anti-slop violations.
- README: runner sentence now says the levels fade to 35% for about a second and snap back.
- Ticked check 21.
- Next: check 22 (2-second intervene window; Esc during it leaves state unchanged). `job.spec.ts` already asserts state equality on Stop in the window; needs the Esc path, the window length measured (~2s between "Reaches" appearing and "0/6 cells done"), and a bar-disabled-or-not decision deferred to the Bar checks. Then 23 (preparing spinner + note, proposed ghost, settled ↑/↓ + accent rule) which is the first state-machine check that needs new render work: the `proposed` ghost of the old value does not exist yet.

### 10 · 2-second intervene window; Esc during it leaves state unchanged
- The window existed since iteration 8; this iteration measured it and fixed how stopping feels. New `verify/intervene.spec.ts` (5 tests × 4 viewports, 176 passing in total): a per-frame watcher records when the plan title appears and when "0/6 cells done" replaces it, and checks every frame between for a spinner, accent, dim, open quiet level or a changed serialised state. Measured 2000ms at both widths, zero marked frames, zero changed frames.
- Fixed: `stop()` was honoured only when the current `sleep` ran out, so Esc at the start of the window left "Reaches 4 levels…" on screen for up to 2s. `scripted.ts` now has an abortable `wait()` that `stop()` wakes; the header drops the same frame. Negative check: old runner fails the "hidden < 300ms" assertion. Also reordered the stop path so `finish()` runs before the "stopped before running" log line (which paused 260ms first).
- Decision: typing in the bar during the window does not intervene; Esc and Stop do. The reference ignores the bar while running, and the Bar check later wants the bar visibly disabled for the whole run. Asserted: Enter with text in the bar during the window is ignored and the run goes on. SPEC §5's "type in the bar" is left to that Bar check to resolve (disable, not route).
- Verify: looked at `verify/shots/intervene/01-window.*` (all four), `02-esc-early.desktop-dark`, `03-esc-late.phone-light`. Report in `verify/REPORT.md`.
- Design review new items: "2s to intervene" (bottom-left) and "Stop · Esc" (top-right) are ~1100px apart at desktop, so the reason and the action are split; nothing shows the window draining (bar moves 6% → 12%); clicked hint chip keeps its focus ring through the run. All UX-phase candidates.
- README: runner paragraph says Esc/Stop act at once and the bar is ignored during a run.
- Ticked check 22.
- Known gap, not in this check: after the window, the runner never reads `store.abort`, so Esc during `running` does nothing until the run ends. SPEC §6 says Esc stops a run. Fold into check 23/24 (make `prepare`/`settle` return early on abort and `finish()` with a "stopped after k/n cells" line).
- Next: check 23 (`preparing` spinner + per-cell note; `proposed` old value ghosted beside new; `settled` keeps ↑/↓ and accent rule). Spinner/note and settled accent exist; the `proposed` ghost (`●●●○○ → ●○○○○`, then fades) does not: needs a `_prev` per changed field set in `settle()`, a `.ghost` span in `renderCard` while the card is `proposed`, and a timed transition to `settled` that clears it. Keep the ghost fade 200–400ms and respect reduced-motion.

### 11 · preparing spinner + note; proposed ghost of the old value; settled ↑/↓ + accent
- Built the `proposed` state, the only missing piece of the SPEC §6 machine. `settle()` in `scripted.ts` clones the card before the mutation, keeps the old value of every ghosted field (`f`, `ev`, `us`, `exposure`, `pct`, the same set the compare view diffs) in `_prev`, sets `_phase: 'proposed'`, holds 600ms, fades the ghost in place (`.ghost.out`, 300ms, none under reduced motion), then redraws the card settled. `renderCard` now adds `preparing`/`proposed` classes from `_phase` and feeds `diff()` from `_prev` while proposed, so the compare view and the proposed ghost share one code path and one look (struck-through grey beside the new value). `_phase`, `_prev` are transient like `_status`/`_note`; `finish()` removes all four.
- Closed the gap from iteration 10: Esc/Stop mid-run now stops. `tick()` throws out of the next pause, `running()` catches it: settled cells keep their values, the in-flight cell loses its spinner or ghost, Product and Code collapse, log says "stopped after k/n cells". `wait()` also resolves at once if the abort flag is already set (a stop pressed during a log line's pause).
- Timing: `TIMING.settle` (350) replaced by `proposed` (600) + `ghostFade` (300). Flow A is ~3s longer (~14s). It reads as calm in the shots; the timing pass later can trim `proposed` if it drags.
- Decision: the ghost is struck through with no arrow, as the reference's compare view does it, rather than the spec's `●●●○○ → ●○○○○` notation; one visual language for "old value" everywhere. The arrow text already lives on the status row ("20% → 70%").
- Decision: code/product cards ghost nothing (their only change is text; a struck-through old note beside a new one on a 230px card truncates both). They show the accent and the new value during `proposed`.
- Decision: `done` increments at `proposed`, not `settled`, because the value is applied immediately; a stop mid-ghost then reports a count that matches what the screen shows (asserted).
- New `verify/cells.spec.ts` (4 tests × 4 viewports, 192 passing in total): per-frame watcher records every phase change and the ghost's opacity. Screenshots now centre the active card first (the desktop preparing shot showed nothing preparing because Code is at the bottom of the stack).
- Verify: looked at `verify/shots/cells/01-preparing.{desktop-light,phone-light}`, `02-proposed.*` (all four), `03-settled.desktop-light`, `04-after.phone-dark`, `05-stopped-mid-run.desktop-dark`. Report in `verify/REPORT.md`.
- Design review new items: the job header is not sticky, so following the change down to Code loses "k/6 cells done" and Stop (top UX-phase candidate; related to the entry-marker-below-the-fold item); the proposed card says the move twice (ghost in the field + "20% → 70%" on the status row); the new value jumps left when the faded ghost is removed.
- README: runner paragraph now describes the three cell states and stop-mid-run.
- Ticked check 23.
- Next: check 24 (log line for each cell appears in sync with that cell settling; assert ordering). The runner already emits each line right after `settle()` returns; needs a watcher that timestamps each `.l` arriving in the log against each card's settled frame and asserts line-after-settle within a few frames and never before, plus the p1/p2 shared line and the a1/a2 split. Then 25 (touched levels expand, Product/Code collapse after) which the cells spec already half-asserts.

### 12 · log line for each cell in sync with its settle
- The runner already appended each line right after `settle()` returned, so for single-line cells the line and the settled render shared a frame. The gap was the product level: one line for two flows, but p1 and p2 settled in sequence, so p1 sat settled ~900ms before its line and p2 prepared the whole time. They now settle via `Promise.all` (SPEC §5: cells within a level run concurrently). Flow A is ~900ms shorter (~13s).
- Concurrent settles exposed a stop bug: `wait()` kept a single `wake`, so Stop woke only the last pause started and the other settle ran on after `finish()` and re-rendered ~900ms later. `wakers` is now a set; `stop()` wakes all of them. Asserted with a MutationObserver on the stack: zero mutations for 1.5s after a stop during the shared settle.
- Decision: "in sync" means the settled frame (ghost gone), per SPEC §6's `settled` bullet, not the proposed frame. The line arrives when the value is final on the card. Measured gap 0ms at all four viewports.
- Decision: a1 and a2 keep their own lines and settle in sequence (a2 prepares alongside a1, then settles after a1's line lands). The spec's "next cell waits for the line" assertion applies across levels only; within a level, cells prepare together.
- New `verify/sync.spec.ts` (2 tests × 4 viewports, 200 passing in total): per-frame watcher timestamps card phase changes and every `.l` in the run's entry. Negative check on the old runner: "p1 line 900ms after settle".
- Verify: looked at `verify/shots/sync/01-a1-settled.{desktop-light,desktop-dark,phone-light}`, `02-a1-line.{phone-light,phone-dark}`. Report in `verify/REPORT.md`.
- Design review new items: "6/6 cells done" with a2's ghost still on screen (count at proposed finishes before the screen does); "source" link orphaned on its own line at 320px; a1/a2 lines run 4–6 visual lines against §7's two-line intent.
- README: settled state now says the line lands on the same frame; shared-line cells settle together.
- Ticked check 24.
- Next: check 25 (levels touched by a run expand; Product and Code collapse again when the run ends). `touchLevel()` and `running()` already do this and `cells.spec` asserts the collapsed compact lines after a run; needs a dedicated spec that records `expanded` per level frame by frame: product/code expand at the moment their first cell prepares (not before), stay open through their settle, and collapse on the frame the header hides; initiatives/assumptions stay open; world never expands. Then 26 ("N changed" on level headers), which `cells.spec` already half-asserts for product/code.

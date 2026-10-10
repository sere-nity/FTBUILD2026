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

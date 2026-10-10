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

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

# Checks

Tick a box only when `npm run verify` evidence (assertions + screenshots you have looked at) shows it passes. Mark `blocked: <reason>` after three failed iterations and move on.

## Scaffold
- [x] Vite + TypeScript project builds and serves; `npm run dev`, `npm run build`, `npm run verify` exist
- [x] Playwright installed; a smoke test loads the page and screenshots it at 1280×800 and 400×800
- [x] `data/seed.json`, `data/sources.json`, `data/analogues.json` ported verbatim from `reference/waypoint.html`
- [x] First commit on `main` with README stub

## Stack and cards
- [x] Five levels render top to bottom: World, Assumptions, Initiatives, Product, Code
- [x] Product and Code are collapsed to one plain line with "expand" on first load; the other three show cards
- [x] Card component renders all five level shapes from one function (title, fields, chip, trend)
- [ ] Assumptions show separate evidence and belief dot bars; ⚠ appears when they differ by ≥ 2
- [ ] Chips use only the enums in SPEC §3
- [ ] Card expands in place with evidence links, "resting on this", analogue block, history; the rest of the stack doesn't shift
- [ ] Light and dark themes both legible; every colour from a token; body has explicit background
- [ ] 400px wide: no horizontal scroll, log moves below the stack, bar fits

## Runner and state machine
- [ ] Job header appears with phase, "Reaches N levels", k/n cells, Stop button, progress bar
- [ ] `scanning` dims every level for ~1.1s, then untouched levels snap back solid
- [ ] 2-second intervene window after sizing; Esc during it leaves state unchanged
- [ ] `preparing` shows spinner + per-cell note; `proposed` shows old value ghosted beside new; `settled` keeps ↑/↓ and accent rule
- [ ] Log line for each cell appears in sync with that cell settling (assert ordering)
- [ ] Levels touched by a run expand; Product and Code collapse again when the run ends
- [ ] Level headers show "N changed" after a run

## Flows (SPEC §8), each at desktop + phone, light + dark, with screenshots per step
- [ ] Flow A milestone: exact outcomes in §8
- [ ] Flow B world: exact outcomes in §8, including the ⚠ evidence/belief gap and ⚑ trigger
- [ ] Flow C inspect: three preamble lines then Flow A
- [ ] Flow D ask: highlight only, no values change, no job header
- [ ] Flow E unmatched: exactly one dashed `unplaced` card, nothing else touched
- [ ] Flow F snapshots: save adds chip + log entry with counts; compare shows struck-through old values; viewing `Jul` is read-only with banner; `now` returns
- [ ] Flow G expand/collapse

## Bar
- [ ] Hint chips above the bar run each flow on click
- [ ] Intent routing: ask / inspect / world / milestone / unmatched as in SPEC §5
- [ ] ⌘K / Ctrl+K focuses the bar; Enter submits; input clears after submit
- [ ] Bar is disabled (visibly) while a run is in progress or a past snapshot is being viewed

## Persistence and handover
- [ ] State and snapshots persist in localStorage across reload (try/catch, page works without it)
- [ ] Export / import JSON buttons work; importing the exported file restores the same screen
- [ ] Editing a title in `data/seed.json` shows up after reload with no code change
- [ ] README covers everything in SPEC §10.5
- [ ] `verify/REPORT.md` has a dated entry per verify run with what was seen and what was fixed

## Design review (repeat every pass until it finds nothing)
- [ ] No anti-slop violations per SPEC §7 (list what was checked)
- [ ] Copy pass: every label, chip, log line and placeholder is the plainest possible wording
- [ ] Timing pass: the full Flow A reads as calm; no step shorter than 300ms or longer than 1.5s without reason
- [ ] Focus states visible on every control; reduced-motion respected

## UX self-improvement (after everything above is green; never ends)
- [ ] `## UX log` in PROGRESS.md has at least one before/after entry per iteration, with screenshot paths

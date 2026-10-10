# Waypoint

The framework with a memory: a living strategy stack that tracks which AI future is arriving and how exposed what you're building is to it.

Built for Stewardship at BUILD 26. This README is replaced by the build agent as the project grows; see SPEC.md for the product and CLAUDE.md for how the autonomous build runs.

## Quick start

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # TypeScript check + production build
npm run verify     # Playwright tests at desktop + phone, light + dark
```

## Project structure

- `src/` — TypeScript source: `main.ts`, `state.ts`, `render.ts`, `bar.ts`, `log.ts`, `runner/`
- `data/seed.json` — editable card data (2 scenarios, 4 assumptions, 3 initiatives, 3 product flows, 1 milestone)
- `data/sources.json` — 12 curated evidence sources
- `data/analogues.json` — 6 prior-strategy cases
- `verify/` — Playwright specs + `shots/` screenshots + `REPORT.md`
- `reference/waypoint.html` — single-file prototype to match, then exceed

## Look

Light and dark follow the OS (`prefers-color-scheme`); force one with `<html data-theme="light|dark">`. Every colour is a token in the `:root` blocks at the top of `src/style.css`; nothing else in the app may name a colour, and `npm run verify` fails if it does. Text is checked for 4.5:1 contrast in both themes.

The prompt bar is fixed to the bottom with the five hint chips above it. `⌘K` / `Ctrl+K` focuses it; Enter submits and clears it. The page pads its bottom by the bar's measured height, so at 400px (where the chips wrap to three rows) nothing hides behind it and the log sits below the stack.

## Runner

The default runner is scripted (`src/runner/scripted.ts`): no network, no key, same content and order as the reference. So far it runs the milestone flow (Flow A, bottom-up); the bar routes text that mentions ship / api / agent / milestone / launch to it. Every run shows a job header above the stack: phase ("Sizing change…" while every level fades to 35% for about a second and snaps back, then "Reaches N levels · direction" with what it touches and a 2-second window to intervene, then "k/n cells done"), a Stop button, and a thin progress bar. Each touched card then walks the state machine: `preparing` (thin spinner and a one-line note of what the agent is doing for that cell), `proposed` (the new value applied at once, the old one struck through beside it, accent border), `settled` (the ghost fades, a small ↑/↓ stays on the field that moved, the accent rule stays until the next snapshot, and the log line for that cell lands on the same frame). Cells that share one log line, like the two product flows, settle together. `Esc` or Stop ends the run at once; pressed while sizing or during the window, the header drops the same frame, the log says "stopped before running", and the state is byte-for-byte what it was. Pressed later, cells already settled keep their values, the cell in flight is cleaned up, and the log says "stopped after k/n cells". Typing in the bar during a run is ignored. All delays live in `src/runner/timing.ts`.

## Kit contents
- `CLAUDE.md` operating rules for the unattended build
- `SPEC.md` product spec, data model, flows, look, backlog
- `CHECKS.md` acceptance list the agent ticks with evidence
- `PROGRESS.md` iteration journal and UX log

## Run the overnight build
```
./run.sh 60
```
Leave it. In the morning read PROGRESS.md top to bottom, then `npm run dev`.

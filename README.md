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

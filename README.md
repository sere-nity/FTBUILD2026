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

## What you see

A ledger with a spine. Five levels top to bottom, each with a one-line description: **World** (which future is arriving), **Beliefs** (what we think is true, with separate evidence and belief dots and how many bets ride on each), **Bets** (what we're building and which beliefs it depends on, with a shipped % and a trigger), **Product**, **Code**. A rail on the left shows the direction a change moves and which levels it has reached. The log on the right, "What changed, and why", keeps every move with its reason and a source link. An intro strip on first load says what the thing is and offers one button, "Try it"; it goes on the first run or on "hide". Above the bar are five labelled Try actions: You shipped something · The world moved · Let it read the code · Ask a question · Say anything.

The seed is a Spotify demo (`data/seed.json`): two scenarios, four beliefs, three bets, three product flows, one milestone; `data/sources.json` is the shelf of 12 sources the log may cite; `data/analogues.json` holds six "what happened last time" cases. Edit the JSON by hand; reload.

## Project structure

- `src/` — TypeScript source: `main.ts` (shell, routing, top-bar actions), `state.ts` (types, seed, store, chip help), `render.ts` (one `render()`), `bar.ts` (Try actions, input, ⌘K), `log.ts`, `runner/scripted.ts` (all five flows), `runner/llm.ts` (optional model path), `runner/timing.ts`
- `data/seed.json`, `data/sources.json`, `data/analogues.json` — editable content
- `server/index.mjs` — optional Express proxy for the model path (see below)
- `verify/` — Playwright specs + `shots/` screenshots + `REPORT.md`
- `reference/waypoint.html` — single-file prototype to match, then exceed (`waypoint-v1.html` is the earlier giving-platform version)

## Look

Light and dark follow the OS (`prefers-color-scheme`); force one with `<html data-theme="light|dark">`. Every colour is a token in the `:root` blocks at the top of `src/style.css`; nothing else in the app may name a colour, and `npm run verify` fails if it does. Text is checked for 4.5:1 contrast in both themes. One accent for "changed", amber for ⚠ and ⚑, green only on the live/robust chips.

The prompt bar is fixed to the bottom with the Try actions above it. `⌘K` / `Ctrl+K` focuses it; Enter submits and clears it. The page pads its bottom by the bar's measured height, so at 400px (where the actions wrap to three rows) nothing hides behind it and the log sits below the stack. The bar dims while a run is in progress or a past snapshot is shown; during a run only the word "stop" is read.

## Flows

Everything routes from the bar (`src/bar.ts` → `classify`): a question (ends with `?` or starts with why/what/which/how) is **ask**; "repo" / "inspect" is **inspect**; "world" / "label" / "licen…" / "signpost" / "regulat…" is **world**; "ship" / "dj" / "milestone" / "launch" / "released" is **milestone**; anything else is **unmatched**.

- **You shipped something** (Flow A, bottom-up): "shipped AI DJ v2". Code → Product (AI DJ and Home change, Artist profile does not) → Bets (AI DJ v2 60% → 100%, stays hedge) → Beliefs (two beliefs now carry more; the one with middling evidence gets a ⚠ warning line and a source). World is not touched.
- **The world moved** (Flow B, top-down): a simulated signpost. Scenario "Artists must prove they're human" watch → rising → belief "Labels keep licensing on current terms" loses evidence, ⚠ gap of 3, the tool says it won't choose for you → two bets go fragile, one trigger ⚑ fires → an analogue line (app stores). Product and Code are not touched.
- **Let it read the code** (Flow C): three lines (reading the repo, running the app for screenshots, the prompt it wrote), then Flow A.
- **Ask a question** (Flow D): one answer line ending "Nothing changed.", the cards it refers to glow for three seconds, no job header.
- **Say anything** (Flow E): exactly one dashed `unplaced` belief with empty dots and "where does this belong?". Nothing else is touched; the tool never invents cards to make text fit.
- **Save snapshot / Show what changed since last snapshot / Jul / now** (Flow F): a snapshot adds a chip named by the date and a log line with the counts ("7 cards changed since “Jul”. 2 beliefs out of step with the evidence."), and clears the changed marks and the rail. Compare ghosts the last snapshot's value struck through beside the current one. Viewing Jul is read-only with a banner.
- Click any card (Flow G) to open it in place: evidence with links, the signposts set in July, the bets riding on a belief, what a bet depends on, "what happened last time", history.

## Runner

The default runner is scripted (`src/runner/scripted.ts`): no network, no key, same content and order as the reference. Every run shows a job header above the stack: "Sizing the change…" while every level fades for about a second, then "Reaches N levels · moving up from Code" (or "moving down from World") with what it will touch and a 2-second window to type "stop" or press Esc, then "k/n cells done" with a thin progress bar and a Stop button. The rail marks the entry level "starts here", fills the dot of the level the run is in, and leaves the dots of levels it has visited filled until the next snapshot. Each touched card walks the state machine: `preparing` (thin spinner and a one-line note of what the agent is doing for that cell), `proposed` (the new value applied at once, the old one struck through beside it, accent border), `settled` (the ghost fades, a small ↑/↓ stays on the field that moved, the accent rule and a "changed · why" line stay until the next snapshot, and the log line for that cell lands on the same frame). Cells that share one log line, like the two product flows, settle together. Stopped in the window, the log says "Stopped before anything changed." and the state is byte-for-byte what it was; stopped later, settled cells keep their values and the log says "Stopped after k of n cells." All delays live in `src/runner/timing.ts`.

Product and Code are quiet by default: one plain line each with a "show" link. A run opens each level on the frame its first cell starts preparing and closes Product and Code again when the header goes.

## LLM runner (optional, `WAYPOINT_LLM=1`)

Off by default. The scripted runner is the product; the model path is an optional layer on top and the demo never depends on it.

```bash
# terminal 1: the proxy that holds the key (never sent to the browser)
ANTHROPIC_API_KEY=sk-ant-… npm run server          # http://localhost:8787, GET /api/health

# terminal 2: the app with the flag on
npm run dev:llm                                     # = WAYPOINT_LLM=1 vite; /api is proxied to :8787
```

How it works (`server/index.mjs`, `src/runner/llm.ts`): on submit, the browser dims every level ("Sizing the change…") and POSTs the event, the full current state and the source shelf to `/api/plan`. The proxy makes one call to Claude (`claude-opus-5-5`, structured JSON output, refusal fallback on) and gets back a plan: direction, levels reached, the cells to touch with one mutation and one log sentence each, and one or two closing lines. The proxy then enforces the SPEC §5 guardrails before anything reaches the browser: belief (`us`) is never changed, evidence (`ev`) moves only with a source id from the shelf, unknown card or source ids are rejected or nulled, a work event may not touch World. The browser runs the checked plan through the same `prepare → proposed → settled` state machine and the same job header, intervene window and Stop as the scripted runner.

If anything fails (proxy not running, no key, timeout, model declined, invalid JSON, plan rejected) the log says "The model is unavailable (reason). Using the scripted runner instead." and the scripted flow runs in the same entry. `verify/llm.spec.ts` asserts both that fallback and that with the flag off no `/api` request is ever made. Set `WAYPOINT_MODEL` to use a different model.

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

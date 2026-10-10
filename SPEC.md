# Waypoint — product spec

A living strategy stack for digital product teams facing an uncertain AI future. Built for Stewardship (UK Christian giving charity) at BUILD 26, usable by any product team afterwards.

Positioning line: **the framework with a memory**. It tells you which AI future is arriving and how exposed what you're building is to it, and it remembers what you believed and why you changed your mind.

What it is not: a prediction engine, a chatbot, a trend dashboard, or a "societal impact" oracle. The agent retrieves evidence and maps changes onto a structure the team already wrote down. It never writes an opinion with nothing behind it.

The reference implementation is `reference/waypoint.html`: a single-file prototype with the full seed, the scripted runner, the log, snapshots and compare. Open it in a browser first and play every hint chip. Your job is to rebuild it properly, keep everything it does, and improve it. When this spec and the reference disagree, the spec wins.

---

## 1. The mental model

Two pressures meet in the middle.

```
   world ──────▶  WORLD         scenarios, moved by external signposts     (moves rarely)
                  ASSUMPTIONS   the team's bets: evidence vs belief        ◀── where they meet
   your work ──▶  INITIATIVES   what you're building, % shipped, health
                  PRODUCT       flows and screens that changed
                  CODE          the last milestone
```

- The world pushes **outside-in**: a signpost crosses a threshold, a scenario moves, the assumptions that depend on it lose or gain evidence, the initiatives resting on those assumptions change health.
- Work pushes **inside-out**: a milestone ships, product flows change, an initiative's % shipped rises, the assumptions it rests on carry more exposure. Code changes your **position** in the landscape, never the world.
- Everything is an **event** that enters at one level and ripples through the others, usually stopping early. The first thing the agent decides is **how deep** a change goes. "Reaches 1 level" is a normal, good answer.

## 2. Users and the morning demo

Primary user: a PM or founder at Stewardship. Secondary: an engineer who tells the tool what shipped. The client will open the app at 9am, play three scripted events, click around, and keep the repo.

The demo must never depend on the network. The scripted runner is the default.

## 3. The five levels and their cards

Every card has the same skeleton so one component renders all of them: **title · 2–3 fields · a status chip · a trend mark**. Click a card to expand it in place (not a modal) to show evidence, signposts, edges, the prior-strategy analogue, and history.

| Level | Title | Fields | Chip (enum) | Trend |
|---|---|---|---|---|
| World | scenario name | if true (axes), signposts moved (n/4), last moved | `live` `rising` `watch` `fading` | ↑ ↓ |
| Assumptions (shown as **Beliefs**) | the proposition | **evidence** ●●●○○, **our belief** ●●●○○, riding on it (N bets) | `fact` `interpretation` `prediction` `unplaced` | ↑ ↓, ⚠ when evidence and belief differ by ≥ 2 |
| Initiatives (shown as **Bets**) | name | shipped % (with a thin bar), depends on (belief titles), trigger | `robust` `hedge` `fragile` | ↑ ↓, ⚑ fired |
| Product | flow or screen | one-line note | `changed` / `unchanged` | |
| Code | milestone | files, modules, date | | |

Rules:
- Evidence and belief are **separate** five-dot bars. Never show a single blended confidence.
- Chips come from a fixed enum. No freeform adjectives anywhere on a card.
- Every level header carries a one-line sub ("Which future is arriving. Scenarios move when their signposts do.") and shows "N changed" after a run. A rail on the left (one dot per level, a line through them) shows which level the run is in, which it has touched, and the direction arrow.
- Every chip has a tooltip saying what the word means (`CHIP_HELP`).
- Quiet levels collapse to one line of plain text (title · note per card) with a "show" link. Levels a run touches expand during the run; Product and Code collapse again when the run ends. The stack should breathe.
- Unchanged rows stay fully legible: solid text, no spinner, no greying. "Didn't move" is information.

## 4. Data model (plain JSON in `data/seed.json`, editable by hand)

```ts
type Level = 'world'|'assumptions'|'initiatives'|'product'|'code'

type Card = {
  id: string; level: Level; title: string; hist: string[];
  // world
  sub?: string; chip?: 'live'|'rising'|'watch'|'fading'; f?: { signposts: string; lastMoved: string }; signposts?: string[];
  // assumptions
  kind?: 'fact'|'interpretation'|'prediction'|'unplaced'; ev?: 0|1|2|3|4|5; us?: 0|1|2|3|4|5; exposure?: number; analogue?: string;
  // initiatives
  pct?: number; rests?: string[]; chip?: 'robust'|'hedge'|'fragile'; trigger?: string; triggerHit?: boolean;
  // product / code
  note?: string;
  // shared
  sources?: string[];          // keys into Source
  trend?: '↑'|'↓'|null; trendOn?: string;
}
type Source   = { id: string; t: string; u?: string; kind: 'paper'|'report'|'book'|'article'|'data' }
type Analogue = { id: string; t: string; what: string; where: string; tracked: string; believed: string }
type Snapshot = { name: string; at: string; state: State }
type Event    = { kind: 'milestone'|'world'|'inspect'|'tell'|'ask'|'edit'|'snapshot'; text: string; at: string }
type State    = { cards: Card[]; expanded: Record<Level,boolean>; changed: Record<string,string> }
```

The seed content is in `reference/waypoint.html` (`seed()`, `SRC`, `ANALOGUES`), a Spotify demo seed since 2026-10-10 (the earlier giving-platform seed is in `reference/waypoint-v1.html`). Port it verbatim into `data/seed.json`, then keep it there. It has: 2 scenarios, 4 beliefs, 3 bets, 3 product flows, 1 milestone, 12 sources, 6 prior-strategy cases.

## 5. The runner: one pipeline, three thin inputs

```
event ──▶ classify ──▶ propagate ──▶ diff ──▶ suggest
```

- **classify** decides the entry level, the direction, how many levels the ripple reaches, and which cards it will touch. This is shown to the user **before** anything runs ("Reaches 3 levels · top-down · touches: 1 scenario, 1 assumption, 1 initiative") with a 2-second window to intervene (type in the bar, or Esc to stop).
- **propagate** walks the levels in order (bottom-up for work events, top-down for world events). Within a level, cells run concurrently; levels run in sequence. Each touched card goes through the state machine in §6.
- **diff** writes the change into the log and the card's history, with the reason and the source if any.
- **suggest** is one or two plain next-move lines in the log, each tied to a card that just changed. No essays.

Inputs that produce events:
1. **Tell** (bar): "we shipped the agent-facing giving API". Work event, bottom-up.
2. **World update** (bar or button): a signpost crossing with its evidence. World event, top-down.
3. **Inspect repo** (bar: "look at the repo"): the agent reads the code and writes the Tell prompt for the user, then runs it as (1). In this build, scripted.
4. **Ask** (bar, ends with `?` or starts with why/what/which/how): answer streams into the log, referenced cards get a soft highlight for 3s, nothing changes.
5. **Edit** (bar: "set belief on <card> to N [because ...]"): direct change. Logged as `moved without evidence` unless a "because" is given. P1.
6. **Unmatched text**: creates exactly one `unplaced` assumption card (ev 0, us 0, no sources) and stops. The agent never invents several cards to make text fit.

**Scripted runner (default).** Implements events 1, 2, 3, 4, 6 exactly as `reference/waypoint.html` does, with the same content and ordering. Timing is tunable in one place (`runner/timing.ts`). This path has zero network dependency.

**LLM runner (optional, `WAYPOINT_LLM=1`).** Same pipeline, but `classify` and the log sentences come from one model call per stage with the full current state, the curated source shelf, and a strict JSON schema for its output (entry level, direction, touched card ids, per-card mutation, log lines each with a source id or `null`). Belief (`us`) may never be changed by the model. Evidence (`ev`) may only change when a source id is attached. If the call fails or returns invalid JSON, fall back to the scripted runner and say so in the log. Use the Anthropic API via `@anthropic-ai/sdk`; key from `ANTHROPIC_API_KEY`. Build this last.

## 6. Cell state machine (the heart of the product)

```
idle ──(run starts)──▶ scanning ──┬──▶ unchanged   (snaps back solid, no mark)
                                  └──▶ preparing ──▶ proposed ──▶ settled
```

- `scanning`: the whole level dims to ~35% opacity while classify runs (~1.1s). Then untouched levels snap back.
- `preparing`: thin spinner + one-line note of what the agent is doing for this cell ("recomputing exposure from initiatives that rest on this"). The note is the "agentic" signal. No cursor, no mascot.
- `proposed`: the new value appears with the old value ghosted beside it (`●●●○○ → ●○○○○`), accent border on the card, applied immediately. No per-cell accept button.
- `settled`: ghost fades, a small ↑/↓ stays on the field that moved, the card keeps a thin accent rule until the next snapshot, and the log line for this cell appears **in sync** with the settle.
- A job header above the stack shows: phase, "Reaches N levels", k/n cells done, direction, a Stop button, a thin progress bar.
- Esc stops a run. Stopping during the 2-second window means nothing changed.

## 7. Look, and the anti-slop rules

The reference is a **ledger**: paper and ink, one accent reserved for *changed*, one warning colour for ⚠/⚑, monospace for numbers and the log, a serif only for the brand and the analogue title. Both light and dark themes. Keep that.

Hard rules:
- Cells are structured: numbers, chips, arrows, source chips. The only generated text on a card is its title.
- Prose lives only in the log, two lines max per entry, with the source inline as a link.
- No sparkle icons, no gradients, no "AI insights" headings, no emoji as UI, no cursor or character for the agent, no terrain or 3D.
- The agent may cite only from the curated shelf (`data/sources.json`). If it finds nothing, it says "no evidence found" and bars do not move.
- One accent colour. Everything else monochrome. If it looks like a ledger, it's right.
- Motion only on state changes, 200–400ms, respects `prefers-reduced-motion`.
- Phone width (400px) must work without horizontal scroll. The log moves below the stack.

## 8. Screens and flows (what verify must drive)

**Layout.** Sticky top bar: brand ("Waypoint · Spotify · demo seed"), snapshot chips (`Jul` … `now`), "Show what changed since last snapshot", "Save snapshot". Below it an intro strip (one paragraph, a "Try it" button that runs Flow A, a "hide" link; it goes on the first run) and the job header (hidden when idle) and a read-only banner when viewing a past snapshot. Main: the stack with its rail (left) and the log "What changed, and why" (right, 340px). Floating prompt bar at the bottom with five labelled "Try:" actions above it (You shipped something / The world moved / Let it read the code / Ask a question / Say anything). `⌘K`/`Ctrl+K` focuses the bar. The bar dims while a run is in progress or a past snapshot is shown; typing "stop" during a run stops it.

**Job header copy.** Sizing: "Sizing the change…" / "How far does this reach? Looking at every level." Plan: "Reaches N levels · moving up from Code" (or "moving down from World") / "Will touch: … Type “stop” or press Esc in the next 2 seconds to cancel." and a "starts here" tag on the entry level. Running: "Reaches N levels · k/n cells done". Stopped in the window: "Stopped before anything changed." Stopped later: "Stopped after k of n cells."

**Flow A, milestone (bottom-up).** Type or click "shipped AI DJ v2". Expected: log entry `you shipped` → sizing → "Reaches 4 levels · moving up from Code" → Code card becomes `Milestone: AI DJ v2` · 31 files → Product expands, `AI DJ` and `Home feed` change, `Artist profile` unchanged → Bet `AI DJ v2` 60% → 100% ↑, stays hedge → Beliefs: `Listeners will let an AI assistant choose for them` riding on it 1 → 2 ↑, `Labels keep licensing on current terms` 2 → 3 ↑ with a warn log line and a source → "World: no scenario moved." → Product and Code collapse → level headers show "N changed" (World none, Beliefs 2, Bets 1, Product 2, Code 1).

**Flow B, world (top-down).** "world update". Expected: entry `the world moved` · "a label changes its AI licensing terms" → "Simulated signal for the demo" line naming the signpost → sizing → "Reaches 3 levels · moving down from World" → `Artists must prove they're human` 1 / 4 → 2 / 4 moved ↑, watch → rising → `Labels keep licensing on current terms` evidence ●●●○○ → ●○○○○ ↓, belief unchanged ●●●●○, ⚠ gap, warn line with a source → `Open listening-history API for agents` ⚑ fired, hedge → fragile → `AI DJ v2` hedge → fragile → "What happened last time: app stores" line with a source → "Product and Code: unchanged."

**Flow C, inspect.** "look at the repo". Expected: entry `inspect` with three lines (reading the repo, running the app and taking screenshots, the prompt it wrote) then Flow A with the title "shipped AI DJ v2 (from the repo)".

**Flow D, ask.** "why is the API fragile?". Expected: one entry `you asked`, `Open listening-history API for agents` highlighted for ~3s, one answer line ending "Nothing changed.", no card values change, no job header.

**Flow E, unmatched.** "listeners will pay extra for human-only playlists". Expected: entry `you said` → sizing with "Will touch: nothing in the stack matches this" → exactly one dashed `unplaced` card at Beliefs with ev/us 0, 0 bets and "where does this belong?" → warn line "Added one unplaced belief…" → "Next: attach a source…" → nothing else touched.

**Flow F, snapshots.** After A and B: "Save snapshot" adds a chip named by today's date and a log entry "Saved. N cards changed since “Jul”. M beliefs out of step with the evidence." (or "Every belief is in step with its evidence."); changed marks, arrows and the rail reset. "Show what changed since last snapshot" shows struck-through old values beside new ones on changed cards. Clicking `Jul` shows the baseline read-only with the banner "Viewing the “Jul” snapshot, read-only. Click “now” to come back."; clicking `now` returns.

**Flow G, expand.** Click any belief card: Evidence (n) with links (or "none attached. The bar can't move until there is some."), Signposts we set in July (world cards), Bets riding on this (or "none. You believe this but nothing you're building depends on it."), Depends on (bets), What happened last time (got cheap / value moved to / survivor watched / loser believed), History (or "no changes yet"). Click again to collapse. The rest of the stack doesn't move.

Each flow is a Playwright script with DOM assertions at each named step and a screenshot per step, at desktop and phone width, light and dark.

## 9. Stack and structure

Keep it small so it survives an unattended build.

- Vite + TypeScript, vanilla DOM (no React). One `render(state)` function; the DOM is a function of state, same as the reference.
- `src/` : `state.ts` (types, seed load, snapshots, diff), `render.ts`, `runner/` (`scripted.ts`, `llm.ts`, `timing.ts`), `bar.ts` (intent routing), `log.ts`, `main.ts`.
- `data/seed.json`, `data/sources.json`, `data/analogues.json`.
- Persistence: `localStorage` for state and snapshots (wrapped in try/catch), plus `data/export.json` download/upload buttons so the client can keep a file. No server unless the LLM runner needs one; if it does, a 40-line Express proxy in `server/` so the key never reaches the browser.
- `verify/` : Playwright scripts, `shots/`, `REPORT.md`.
- `npm run dev`, `npm run build`, `npm run verify`.
- Fonts: IBM Plex Sans / Serif / Mono via Google Fonts with system fallbacks.

## 10. Acceptance (summary; the itemised list is `CHECKS.md`)

1. All seven flows pass in Playwright at both widths and both themes, with screenshots committed.
2. The scripted runner works offline with no key.
3. The seed is editable JSON and a change to it shows up without code changes.
4. The design review finds no anti-slop violations (§7).
5. README explains: what it is, how to run it, how to add a card, a source, a signpost, and an analogue, how to turn on the LLM runner, and what is scripted vs real.

## Backlog (do not build until CHECKS.md is green; keep in priority order)

1. Edit intent in the bar ("set belief on X to N because …"), logged as on-evidence or not.
2. Undo per cell for the duration of a run.
3. Per-card history timeline in the expand view, with the snapshot it belonged to.
4. LLM runner behind `WAYPOINT_LLM=1` (see §5). Built early on the client's request, 2026-10-10 (PROGRESS.md §14); real model round-trip still unverified.
5. A second seed, `data/seed-lantern.json` (a community social app: scenarios "Agent-mediated feeds" / "Verified-identity web"; assumptions about authenticity, identity regulation, feed control; initiatives anonymous posting, verified-human badge, creator payouts) and a seed switcher in the top bar.
6. Timeline scrubber replacing the snapshot chips, with the dotted "if this scenario wins" region past `now`.
7. Real inspect: given a repo path, summarise the diff since the last milestone and screenshot the app (Playwright) into the Product cards.
8. World update from live signposts: a scheduled fetch of one or two public indicators with thresholds from `data/signposts.json`.

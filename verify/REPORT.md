# Verify Report

## 2026-10-10 · Iteration 1 · Scaffold smoke test

### Screenshots reviewed
- `verify/shots/smoke/desktop-light.png`: Brand "Waypoint" with subtitle visible, light grey background, loading text. No layout issues.
- `verify/shots/smoke/phone-light.png`: Same at 400px. No horizontal scroll. Brand fits.
- `verify/shots/smoke/desktop-dark.png`: Dark background (#121417), light text. Brand legible. Correct dark theme.
- `verify/shots/smoke/phone-dark.png`: Same at 400px. No horizontal scroll.

### Defects
- None at this stage (scaffold only — no cards, log, or bar yet).

### Design review
- N/A (scaffold only).

## 2026-10-10 · Iteration 2 · Stack and cards (first load)

Run 1: 24 passed (smoke + stack.spec at 4 viewports). Run 2 after fixes: 32 passed.

### Screenshots reviewed
- `verify/shots/stack/01-first-load.desktop-light.png`: five levels World → Code top to bottom, rules between them. World 2 cards, Assumptions 4 (3+1 wrap), Initiatives 3. Product/Code one compact line each with underlined "expand". Chips LIVE/WATCH, kind chips, HEDGE/FRAGILE/ROBUST tinted correctly. Evidence and belief are separate dot bars. Log column empty except heading.
- `verify/shots/stack/01-first-load.desktop-dark.png`: same layout, dark paper, cards slightly lighter than paper, all text legible, chip tints readable.
- `verify/shots/stack/01-first-load.phone-light.png`: single column, every card full width, no horizontal scroll, log heading below stack. Top bar wraps to three rows.
- `verify/shots/stack/01-first-load.phone-dark.png`: same as phone-light in dark tokens, legible.

### Defects found (run 1)
1. World card "axes" value truncated with ellipsis at desktop ("agents · cheap intelligen…"), hiding a whole word. Fixed: axes value wraps (`.fields .v.wrap`). Assertion added.
2. Phone top bar: "Save snapshot" orphaned on its own third row away from "Compare to last". Fixed: both buttons grouped in `.tools` so they wrap together. Assertion added (same y).
3. Log is empty on first load: no baseline "Jul" entry yet. Not fixed here; belongs to the log/runner checks.

### Design review (SPEC §7)
- One accent (signal) used only for chips live/robust and "changed" marks; warn colour only on fragile/rising. Monochrome otherwise. OK.
- Mono for numbers/fields, serif only for brand. OK.
- No icons, gradients, emoji-as-UI, mascots. OK.
- Defects still open: (a) empty `.status` row reserves 16px at the bottom of every idle card, so each card has dead space below its fields; kept for now because it stops cards jumping when a spinner appears during a run, revisit in UX phase. (b) Initiative "rests on" and "trigger" values are truncated with ellipsis at desktop width; title attribute carries the full text, matches reference. (c) Log column at desktop is a large blank area until the baseline entry exists.

## 2026-10-10 · Iteration 3 · Assumptions: evidence/belief bars and ⚠ gap

Run: 44 passed (smoke + stack + assumptions at 4 viewports). New spec `verify/assumptions.spec.ts`; test hook `window.__waypoint` added so tests can set ev/us and re-render (seed has no gap ≥ 2 on first load).

### Screenshots reviewed
- `verify/shots/assumptions/01-no-gap.*.png` (4): identical to first-load; no ⚠ anywhere, as expected (largest seed gap is 1).
- `verify/shots/assumptions/02-gap-3.desktop-light.png`: a2 "Our AI vendor stays available" shows evidence ●○○○○, belief ●●●●○ ⚠ in warn ochre. Flag on the belief row only. Other three assumptions unflagged. Nothing shifted.
- `verify/shots/assumptions/02-gap-3.desktop-dark.png`: same; ⚠ in the lighter dark-theme ochre, legible against the card.
- `verify/shots/assumptions/02-gap-3.phone-light.png`: single column; ⚠ sits right of the belief dots with room to spare, not clipped. No horizontal scroll.
- `verify/shots/assumptions/02-gap-3.phone-dark.png`: same, legible.

### Defects
- None blocking. Assertions cover: two separate bars per card, five glyphs each, belief row below evidence row, ⚠ absent at gap 1, present at gap 2 and 3, present in either direction, attached to belief row not evidence row, not clipped by the row's overflow.

### Design review (SPEC §7)
1. ⚠ is a 12px mono glyph in ochre; at desktop it is easy to miss on a first scan. Matches the reference, so kept. Candidate for the UX phase: slightly larger glyph or a short word ("⚠ gap 3") — decide when the world flow log line exists so the two agree.
2. Assumptions grid at desktop is 3 + 1: card a4 sits alone on a second row with two empty slots. Unchanged from iteration 2; revisit (maybe 2×2 or 4-across at ≥1200px) in UX phase.
3. Initiative "rests on" / "trigger" values still truncated with ellipsis at every width; the full text is only in a title attribute, which phones cannot show. Open from iteration 2.
4. Empty `.status` row still reserves 16px under every idle card. Open from iteration 2.

## 2026-10-10 · Iteration 4 · Chips use only the SPEC §3 enums

Run: 64 passed (smoke + stack + assumptions + chips at 4 viewports). New spec `verify/chips.spec.ts` (5 tests). Chip text now goes through one `chipFor()` in `src/state.ts` with a `CHIPS` enum map per level; a word outside the enum renders no chip. Product cards now carry `changed` / `unchanged` per the SPEC §3 table (the reference had no product chip; spec wins).

### Screenshots reviewed
- `verify/shots/chips/01-first-load.*.png` (4): identical to the stack first-load frames. Chips: LIVE, WATCH, INTERPRETATION ×2, PREDICTION, FACT, HEDGE, FRAGILE, ROBUST. Nine chips, nine cards, all enum words.
- `verify/shots/chips/02-all-expanded.desktop-light.png`: product level opened to three cards, each with a grey UNCHANGED chip; code milestone card has no chip. Grid 3-across, chips right-aligned in the head row, nothing clipped.
- `verify/shots/chips/02-all-expanded.phone-dark.png`: single column, UNCHANGED chips legible on dark cards, no horizontal scroll.
- `verify/shots/chips/03-product-changed.desktop-light.png`: p1 "Donor discovery flow" flips to a blue CHANGED chip, card takes the accent border + left rule, status row reads "changed exposed to agents", level header reads "1 changed" in blue. p2/p3 stay UNCHANGED grey.
- `verify/shots/chips/03-product-changed.desktop-dark.png`: same in dark; CHANGED chip in the dark signal tint, legible.
- `verify/shots/chips/03-product-changed.phone-light.png`: same at 400px; chip and status row fit on their own lines.

### Defects
- None blocking. Assertions cover: every chip on first load in its level enum; at most one chip per card; product chips changed/unchanged with all five levels open; code has no chip; `unplaced` kind renders the `unplaced` chip and the dashed card; out-of-enum words (`exciting`, `hunch`, `promising`) render no chip and leave the rest of the card intact; chips are uppercase, mono, nowrap.

### Design review (SPEC §7)
1. A changed product card says "changed" twice: the CHANGED chip in the head and the "changed" status row underneath. Spec asks for the chip; the status row is from the reference. One of them should go in the UX phase (likely the status word, keeping its note).
2. Three UNCHANGED chips in a row on the product level is quiet grey, but it is three repeated words where the reference had none. Acceptable per spec; watch whether it reads as noise once the runner collapses Product after a run.
3. Assumptions grid still 3 + 1 at desktop (open from iteration 3).
4. Initiative "rests on" / "trigger" truncated with ellipsis at every width (open from iteration 2).
5. Empty `.status` row still reserves 16px on idle cards (open from iteration 2).

## 2026-10-10 · Iteration 5 · Card expands in place (check 17, Flow G)

Run 1: 6 failed / 18 passed on the new spec (two wrong expectations in the test: title case of "Agent-facing giving API", full analogue title "Newspapers and classifieds, 1998–2010"; and Playwright's own pre-click scroll on phone being counted as a page jump). Run 2: 88 passed. Run 3 after the CSS fix: 86 passed, 2 failed (row-mates shrank 18px to natural height, assertion was too strict). Run 4: 88 passed. New spec `verify/expand.spec.ts` (6 tests × 4 viewports).

### Screenshots reviewed
- `verify/shots/expand/01-closed.*.png` (4): first-load frames, no `.detail` anywhere.
- `verify/shots/expand/02-a1-open.desktop-light.png` (run 2): a1 opens in place with a dashed rule, then EVIDENCE (4) as four blue links, INITIATIVES RESTING ON THIS "Agent-facing giving API · 20%", PRIOR STRATEGY box with the italic serif title and four mono labels, HISTORY in mono. Defect: a2 and a3 stretched to a1's full height, two ~700px empty white boxes beside the open card.
- `verify/shots/expand/02-a1-open.desktop-light.png` (run 4): a2 and a3 keep their own height; a1 alone is tall; a4 sits under it as before. Levels below shifted down by exactly the detail height (asserted).
- `verify/shots/expand/02-a1-open.desktop-dark.png`: same in dark; links in the lighter signal blue, analogue box a shade lighter than the card, all legible.
- `verify/shots/expand/02-a1-open.phone-light.png`: single column, detail fits the card width, link text wraps, analogue grid two columns with wrapping values, no horizontal scroll.
- `verify/shots/expand/03-a2-floating.desktop-light.png`: a2 open with one evidence link, "none · this bet is floating free of any action" in italic grey, App stores analogue, "no changes recorded".
- `verify/shots/expand/03-a2-floating.phone-light.png`: same at 400px, nothing clipped.
- `verify/shots/expand/04-w2-i1-open.desktop-light.png` (run 2): w2 and i1 both open. Defect: the sticky top bar was painted mid-page because the full-page capture happened while scrolled to i1. Test artefact. Defect: "ev ●●●○○" dots in i1's Rests on list rendered in the sans face, larger than the card dots.
- `verify/shots/expand/04-w2-i1-open.desktop-dark.png` (run 4): top bar at the top, w2 shows EVIDENCE (1) + SIGNPOSTS (4) + HISTORY, i1 shows EVIDENCE (0) "⊘ no evidence attached", RESTS ON with two assumptions and mono dots, HISTORY. Row-mates keep their height.
- `verify/shots/expand/04-w2-i1-open.phone-dark.png`: single column, both details readable, no horizontal scroll.

### Defects fixed
1. Row-mates stretched to the open card's height (grid `align-items: stretch`). Fixed with `.cards:has(.detail) { align-items: start }` so first-load rows stay flush and only an open card grows. Assertion: no card other than the opened one gains height.
2. Detail "Rests on" dots in sans. Fixed: `.detail .dots` mono. Assertion on computed font-family.
3. Screenshot helper now scrolls to top before a full-page capture (test only).

### Assertions added
Detail is a static descendant of the card (no dialog/overlay); four sections in order; four `https` links with `target=_blank rel=noopener`; resting-on list; analogue title + four labels, italic title; history text; click again collapses; every card and level header keeps x and width, everything above and beside keeps y, everything below shifts by exactly the detail height, collapse restores y and h exactly; scrollY unchanged on open; floating-free and no-history messages; world signposts and initiative rests-on; link click does not collapse.

### Design review (SPEC §7)
1. Evidence link text runs to four lines per source at 230px card width; it is the full citation sentence. Prose on a card, which §7 says belongs in the log. Candidate for UX phase: show the short source name (`SRC[k].t` first clause) and keep the rest in the title attribute. Not changed now because the reference shows the full text.
2. The empty 16px status row plus the card gap leaves a visible dead band above the dashed detail rule (open since iteration 2).
3. Assumptions grid is 3 + 1 at desktop; with a1 open the lone a4 under it reads as an afterthought (open since iteration 3).
4. Initiative "rests on" / "trigger" truncated with ellipsis (open since iteration 2).
5. Product "changed" said twice when changed (open since iteration 4).

## 2026-10-10 · Iteration 6 · Themes legible, every colour a token, explicit body background (check 18)

Run 1 (theme spec alone): 20 passed. Negative check: with the old light `--ink-3` (#8a8f99) restored, the contrast test fails on 30+ samples at 3.03–3.25:1, so it bites. Full run: 108 passed. New spec `verify/theme.spec.ts` (5 tests × 4 viewports).

Token changes (reference values were below WCAG AA for 11–12px labels): light `--ink-3` #8a8f99 → #666b74 (card 3.25 → 5.36, card-2 2.84 → 4.69); light `--warn` #9a6b12 → #8a5f0e (warn-soft 4.02 → 4.84); dark `--ink-3` #737a86 → #8a919d (card-2 3.51 → 4.78). Nothing else moved.

### Screenshots reviewed
- `verify/shots/theme/01-first-load.desktop-light.png`: paper #f6f7f8 body, white cards, keys (axes, evidence, belief) now a mid grey that reads at a glance instead of fading into the card. Chips LIVE/ROBUST blue, FRAGILE ochre, rest grey. Only the black `now` pill and the blue chips carry colour.
- `verify/shots/theme/01-first-load.desktop-dark.png`: #121417 body, cards one shade lighter with a visible rule, keys legible, chip tints in the lighter dark variants. Same layout as light, nothing shifted.
- `verify/shots/theme/02-states.desktop-light.png`: job header on card-2 grey with mono "reaches 3 levels · 2 / 7 cells", 30% signal bar, ochre Stop button; read-only banner on warn-soft with ochre text, readable. a2 belief ⚠ in ochre, a1 open with blue evidence links, PRIOR STRATEGY box on card-2, p1 CHANGED chip + accent rule, PRODUCT "1 changed" in blue.
- `verify/shots/theme/02-states.desktop-dark.png`: same states; banner is a deep brown with light ochre text, job header a slightly lighter band, links and CHANGED chip in the light blue, all readable. Analogue box distinguishable from the card.
- `verify/shots/theme/02-states.phone-light.png`: single column; job header, banner, open a1 with wrapped links, analogue box, changed p1 all fit at 400px. No horizontal scroll.
- `verify/shots/theme/02-states.phone-dark.png`: same in dark, legible.

### Defects
- None blocking. Job header and read-only banner showing together is a test artefact (rich state turns both on); they never coexist in a real flow.

### Assertions added
Body background is opaque and equals the resolved `--paper`; luminance < 0.05 in dark and > 0.85 in light; `color-scheme: dark` applied in dark. Every visible text sample from 29 selectors (brand, counts, keys, values, chips, status, flag, detail headings/links/none, analogue keys/title, history, job title/meta/stop, banner) reaches ≥ 4.5:1 against the first opaque background behind it, in a state that exposes every coloured style. Signal and warn reach ≥ 3:1 on paper and card (focus ring, ⚠, Stop). No colour literal (`#hex`, `rgb()`, `hsl()`, named colour) in any colour-bearing property outside the `:root` token blocks of `src/style.css`; no hex anywhere else in the file; no inline colour styles or hex literals in `index.html` or `src/**/*.ts`.

### Design review (SPEC §7)
1. Dark theme cards are 1.09:1 against the paper, so the card surface is carried almost entirely by the 1px rule. Matches the reference; acceptable for a ledger, but the stack reads flatter in dark than in light. UX-phase candidate: nudge dark `--card` one step lighter.
2. The darker `--ink-3` makes field keys (evidence, belief, shipped) heavier than the reference, so key and value are closer in weight. Hierarchy still holds because values are in `--ink` and keys in `--ink-3`, but watch it once ghosts (also `--ink-3`, struck through) appear beside new values in the `proposed` state.
3. The black `now` pill in the top bar is the highest-contrast element on an idle screen, ahead of anything that changed. Matches the reference. Revisit in UX phase (outline instead of fill).
4. Carried: full citation sentences as link text on 230px cards; dead 16px status band; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards; ⚠ glyph small.

## 2026-10-10 · Iteration 7 · 400px: no horizontal scroll, log below the stack, bar fits (check 19)

Run 1 (phone spec alone, bar shell just mounted): 20 passed, but the screenshots showed the bar covering the "Log" heading at 400px. Added the assertion, negative check with the old CSS: fails at phone-light with `.log > :last-child bottom vs bar top: Expected <= 633.9, Received 679.5`, so it bites. Run 2 (full): 128 passed. New spec `verify/phone.spec.ts` (5 tests × 4 viewports).

Also moved Playwright `outputDir` from `verify/shots` to `verify/.out` (ignored). Before, every run wiped all screenshot sets and dropped failure artefacts among the evidence.

### Screenshots reviewed
- `verify/shots/phone/03-bar-at-bottom.phone-light.png` (run 1): page scrolled to the end; the three rows of hint chips plus the prompt stood ~170px tall and sat over the "Log" heading (only the "L" showed). A ~120px empty band separated the Code level from the log.
- `verify/shots/phone/03-bar-at-bottom.phone-light.png` (run 2): LOG heading fully visible above the chips; Code "expand" to LOG rule is one normal level gap. Prompt spans the width with 20px margins, ⌘K kbd at the right edge, pen glyph at the left. Nothing clipped.
- `verify/shots/phone/03-bar-at-bottom.desktop-light.png`: five chips on one row centred under the stack + log, prompt 680px centred, both inside the viewport. Stack and log columns end above the bar.
- `verify/shots/phone/04-bar-focused.phone-dark.png`: prompt border turns signal blue on focus, "hello" in ink, chips keep their card background over the dimmer cards behind them and stay readable.
- `verify/shots/phone/01-first-load.phone-dark.png` (full page): single column, log below stack, bottom padding under LOG equals the bar height. The bar appears mid-page in the capture because fixed elements are drawn at the viewport position in full-page shots; not a layout defect.

### Defects fixed
1. Bar covered the log at 400px: `.stack`/`.log` had a fixed 120px bottom padding, the wrapped bar is taller. `bar.ts` now publishes the measured bar height as `--bar-h` (ResizeObserver) and the padding is `calc(var(--bar-h) + 16px)`. Assertion: at scroll bottom, the last level and the log's last child end above `.barwrap`.
2. Dead band between stack and log at phone: stack bottom padding is 18px below 860px; only the log carries the bar padding. Assertion: log top within 4px of stack bottom at phone.

### Assertions added
Document `scrollWidth ≤ clientWidth` and no element's right edge past the viewport, on first load and with every level and card open; log below and full-width at ≤860px, beside and 320px wide at desktop; barwrap, prompt, input, kbd and every hint inside the viewport; prompt y unchanged after scrolling to the bottom (fixed); five hints with the reference text; placeholder text; ⌘K/Ctrl+K focuses the input; Enter clears it.

### Design review (SPEC §7)
1. At 400px the sticky top bar takes three rows (brand / snapshots / buttons, ~125px) and the bar takes ~170px, leaving ~500px of content. Candidate for UX phase: put the snapshot chips and buttons on one row at phone, or let the hints collapse to one scrolling row.
2. Hint chips float over card content with transparent gaps between them (three rows at phone). Matches the reference. UX-phase candidate: a short paper fade behind the barwrap so the chips do not sit on top of a dot bar.
3. The ⌘K kbd shows on phone where there is no keyboard shortcut. UX-phase candidate: hide `.kbd` below 860px.
4. Carried: dark cards 1.09:1 against paper; black `now` pill loudest element; full citation sentences on cards; dead 16px status band; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards; ⚠ glyph small.

## 2026-10-10 · Iteration 8 · Job header: phase, "Reaches N levels", k/n cells, Stop, progress bar (check 20)

Run 1 (full): 132 passed, 12 failed. Three causes: the spec's `.entry` selector also matched the five level-head entry-marker spans (test defect); the title never reached 7/7 because the reference counts 7 cells but settles six (c1, p1, p2, i1, a1, a2), so the total is now 6; Stop during the intervene window still changed state (trends cleared before sizing, transient keys written as `null`). Run 2 (full): 144 passed. Run 3 (job + theme after the meta fix): 36 passed. New spec `verify/job.spec.ts` (4 tests × 4 viewports) drives Flow A from the hint chip at real demo timing.

### Screenshots reviewed
- `verify/shots/job/01-sizing.desktop-light.png`: job header under the top bar: spinner, "Sizing change…", "scanning all levels", Stop · Esc in ochre outline at the right, progress bar a short signal stub. Every card in every level dimmed to ~35%. Log: new MILESTONE entry on top with "sizing…", Jul baseline entry below it.
- `verify/shots/job/01-sizing.phone-dark.png`: same at 400px, header is three rows (title + Stop, meta, bar). Dimmed cards legible as "paused", not broken.
- `verify/shots/job/02-reaches.desktop-light.png`: "Reaches 4 levels · bottom-up", meta "touches: 1 milestone, 2 product flows, 1 initiative, 2 assumptions" then "2s to intervene" in ochre; levels solid again; bar at 12%. The "◀ entered here" marker is on the Code level, below the fold at 1280×800.
- `verify/shots/job/02-reaches.phone-dark.png` (run 2): meta wrapped with a lone "·" left dangling at the end of the first line before "2s to intervene" on its own line.
- `verify/shots/job/02-reaches.phone-light.png` (run 3): touches on two lines, "2s to intervene" on the third, no separator glyph. Desktop shows the two with a 14px gap.
- `verify/shots/job/03-cells.desktop-dark.png`: "Reaches 4 levels · 3/6 cells done", meta "bottom-up · milestone", bar just past half. Log has sizing, reach line (signal), code line.
- `verify/shots/job/03-cells.phone-light.png`: same at 400px; header two rows plus bar.
- `verify/shots/job/04-done.desktop-light.png`: "6/6 cells done", bar full width, a1 and a2 carry the accent rule with "changed · exposure ↑" / "changed · now load-bearing", Assumptions head reads "2 changed", Initiatives "1 changed". Spinner in the header still turning at 6/6.
- `verify/shots/job/05-after.desktop-light.png`: header gone, stack moved up by its height, level counts show changed totals, log entry complete with both source links and the warn line for a2.
- `verify/shots/job/06-stopped.phone-light.png`: after Stop in the window: header hidden, every card at seed values, no arrows, no accent.

### Defects fixed
1. Stopped run mutated state (trend/trendOn set to null on every card before sizing; `_status`/`_note` left as null). Trends now clear only once the run proceeds; transient keys are deleted. Assertion: serialised state identical before and after a stopped run.
2. k/n total said 7 for six settling cells (reference bug). Total is 6. Assertion: title reaches "6/6 cells done" and the bar passes 99%.
3. Orphaned "·" in the intervene meta at 400px. Meta is now two flex children with no separator. Assertion: no "·" in the meta, exactly two child spans.
4. Test defect: `.entry` matched level-head spans; log selectors scoped to `#log .entry`.

### Assertions added
Header hidden when idle; visible with spinner, "Sizing change…", "scanning all levels", Stop · Esc, five `.level.scanning`, bar between 0 and 10%; then "Reaches 4 levels · bottom-up", touches text, "2s to intervene" in `.warn`, zero scanning levels, entry marker on Code only, bar grew; then "0/6", "1/6", "3/6", "6/6 cells done" with the bar growing each time and "bottom-up · milestone" in the meta; header hidden after the run, markers cleared, no spinner left on any card. Stop in the window: header hidden, "stopped before running" warn line, state unchanged. Second submit during a run ignored (log entry count stays 2); Esc stops.

### Design review (SPEC §7)
1. The entry marker ("◀ entered here") sits on Code, which is below the fold at desktop during the 2-second window, so the one moment the spec calls out most is partly invisible. UX-phase candidate: scroll the entry level into view when the plan is shown, or put the direction in the header only.
2. The header spinner keeps turning at "6/6 cells done" while the last log lines land. Minor; a done state could stop it.
3. During sizing at phone, the header plus top bar push the first card to y≈270, so only one and a half dimmed cards show the "scanning" state. Acceptable.
4. Carried: hint chips float over cards at 400px; ⌘K kbd on phone; dark cards 1.09:1; black `now` pill; full citation sentences on cards; dead 16px status band; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards; ⚠ glyph small.

## 2026-10-10 · Iteration 9 · `scanning` dims every level ~1.1s, then snaps back solid (check 21)

Run 1 (scanning only): 12 passed. Run 2 (full, after the fade fix): 156 passed. New spec `verify/scanning.spec.ts` (3 tests × 4 viewports) installs a per-frame watcher in the page before the hint chip is clicked and records when `.scanning` appears, when the bodies reach ≤ 36% opacity, when the class is gone, and the opacity of every level body on that first frame.

Measured (one-off script, same watcher): desktop held 1114ms, fade to 35% in 264ms; phone held 1112ms, fade 263ms; every body at opacity 1 on the frame the class left. Before the fix: held 1082/1100ms, fade 0ms.

### Screenshots reviewed
- `verify/shots/scanning/01-dimmed.desktop-light.png`: header "Sizing change…" / "scanning all levels", Stop · Esc. Every card in World and Assumptions at 35%: titles, dots and chips all faded evenly; level heads ("WORLD 2 scenarios") stay full ink. Log shows the new MILESTONE entry with "sizing…" at the same moment. Hint chips and bar stay solid over the dimmed stack.
- `verify/shots/scanning/01-dimmed.desktop-dark.png`: same in dark. Dimmed cards are faint but still read as cards; chips LIVE/WATCH tints survive the dim.
- `verify/shots/scanning/01-dimmed.phone-light.png`: 400px: header three rows, World's two cards and the first Assumptions card visible, all dimmed. The five hint chips sit solid on top of the dimmed Assumptions card, so the chips are the loudest thing on screen during sizing.
- `verify/shots/scanning/01-dimmed.phone-dark.png`: same in dark; nothing clipped.
- `verify/shots/scanning/02-solid.desktop-light.png`: "Reaches 4 levels · bottom-up", every card back at full opacity, no residual dim, no marks on any card.
- `verify/shots/scanning/02-solid.phone-dark.png`: same at 400px dark; "2s to intervene" wrapped to its own line under touches.
- `verify/shots/scanning/03-stopped-while-scanning.phone-dark.png`: after Esc during the dim: header gone, every card solid and at seed values, no arrows, no accent.

### Defects fixed
1. The dim landed with no fade. `render()` rebuilds the stack and `.scanning` was added in a `requestAnimationFrame`, which runs before the new elements get their first style pass, so there was no before-change style and the 300ms transition never ran (measured 0ms). Fixed: force one style pass (`offsetHeight`) and add the class synchronously. Assertion: time from class-on to ≤ 36% opacity is between 150 and 450ms (reduced-motion: ≤ 40ms).

### Assertions added
Five `.level.scanning`, every level body ≤ 0.36 while the heads stay at 1, no spinner/accent/entry marker while scanning; class held 1000–1500ms; lowest sampled opacity 0.30–0.36; fade-in 150–450ms; every body at exactly `1` on the first frame the class is gone (snap, not fade); World never dims again during the run and is at 1 at 3/6 and at the end. Esc while scanning: header hidden, all bodies at 1, "stopped before running", serialised state identical. Reduced motion: bodies at 0.35 on the first scanning frame, same hold, same snap.

### Design review (SPEC §7)
1. At phone the hint chips float solid over the dimmed cards during sizing, so the chips read louder than the change in progress. UX-phase candidate (already carried: chips float over cards at 400px).
2. Dark theme dimmed cards sit at roughly 2:1 against paper; fine as a transient "paused" state, but the dark stack is already flat (1.09:1), so dimming nearly erases card edges. Carried with the dark-card item.
3. The level heads stay solid while the bodies dim; that reads as "the level is still here, the contents are being read", which is right. No change.
4. Carried: entry marker below the fold at desktop; spinner at 6/6; ⌘K kbd on phone; black `now` pill; citation sentences on cards; dead 16px status band; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards; ⚠ glyph small.

## 2026-10-10 · Iteration 10 · 2-second intervene window; Esc leaves state unchanged (check 22)

Run 1 (intervene only): 20 passed. Run 2 (full, after the Esc reorder): 176 passed. New spec `verify/intervene.spec.ts` (5 tests × 4 viewports) installs a per-frame watcher before the chip is clicked and records when the plan title appears, when the first cell count replaces it, and on every frame in between whether any spinner, accent, dim or open quiet level showed, or the serialised state differed.

Measured (one-off script): window 2000ms at desktop and at phone. Esc → header hidden: 301/303ms before the reorder (the log line's 260ms pause ran before `finish()`), now under 300ms asserted, a few frames in practice. Before the abortable wait: Esc was honoured only when the 2s timer ran out, so the early-Esc assertion fails on the old runner (negative check: "Expected: hidden, Received: visible").

### Screenshots reviewed
- `verify/shots/intervene/01-window.desktop-light.png`: header "Reaches 4 levels · bottom-up", "touches: 1 milestone, 2 product flows, 1 initiative, 2 assumptions", "2s to intervene" in ochre, "Stop · Esc" at the far right, progress bar at ~12%. Every card solid at seed values, no spinner, no accent; Product and Code still collapsed (below the fold). Log: MILESTONE entry with "sizing…". The clicked hint chip keeps its focus ring.
- `verify/shots/intervene/01-window.desktop-dark.png`: same in dark; ochre warning and Stop outline both legible.
- `verify/shots/intervene/01-window.phone-light.png`: 400px: header is three rows (title, touches wrapping to two lines, "2s to intervene" alone on the third), bar beneath; first card starts at y≈280. Nothing clipped.
- `verify/shots/intervene/01-window.phone-dark.png`: same in dark.
- `verify/shots/intervene/02-esc-early.desktop-dark.png`: after Esc at the start of the window: header gone, stack at seed values, log entry reads "sizing…" then "stopped before running" with the ochre rule. Two lines, nothing else.
- `verify/shots/intervene/03-esc-late.phone-light.png`: after Esc 1.5s into the window at 400px: header gone, cards solid, no marks; log is below the fold.

### Defects fixed
1. Esc/Stop during sizing or the window took effect only when the current timer ran out (up to 2s of "Reaches…" after the key). `wait()` in `scripted.ts` now races the timer against `stop()`. Assertion: header hidden < 300ms after Esc at the start of the window.
2. After a stop, the "stopped before running" log line paused 260ms before the header was removed, so the header outlived the log's verdict. `finish()` now runs first and the line lands with no pause.

### Assertions added
Plan title, touches, "2s to intervene", Stop and entry marker shown with zero spinners/accents/dim, quiet levels collapsed and state identical; window 1900–2400ms from plan to "0/6 cells done" with no marked frame and no changed-state frame; run then proceeds and state differs at the end. Esc at the start: header hidden < 300ms, warn line, entry has exactly two lines, idle state, state identical, still identical 3s later, log entry count unchanged. Esc at 1.5s: same. Esc when idle: no header, no log entry. Esc with the bar focused during the window: stops. Enter with text in the bar during the window: ignored, run proceeds to 6/6, entry count stays two.

### Design review (SPEC §7)
1. The two halves of the window's message sit at opposite edges at desktop: "2s to intervene" bottom-left, "Stop · Esc" top-right, ~1100px apart. The one thing the user can do is split from the reason to do it. UX-phase candidate: move the warning next to the button, or the button next to the warning.
2. "2s to intervene" is static while the window drains; the progress bar moves only from ~6% to ~12%, so nothing on screen shows the window closing. UX-phase candidate: keep the text, let the bar express the 2s.
3. At 400px the header is three rows plus the three-row top bar, ~250px of chrome before the first card during the window. Carried with the phone top-bar item.
4. The clicked hint chip keeps a blue focus ring for the whole run, so it reads as "selected" rather than "pressed". Focus states check (design review section) will decide `:focus-visible` rules.
5. Carried: entry marker below the fold at desktop; spinner at 6/6; hint chips float over cards at phone; ⌘K kbd on phone; dark cards 1.09:1; black `now` pill; citation sentences on cards; dead 16px status band; 3+1 assumptions grid; truncated rests-on/trigger; double "changed" on product cards; ⚠ glyph small.

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

## 2026-10-10 · Iteration 11 · preparing spinner + note; proposed ghost; settled ↑/↓ + accent (check 23)

Run 1 (cells only, 2 projects): 8 failed, all test bugs (Product and Code collapse at the end so their cards leave the DOM; `#job` is hidden for 260ms after the click so a `toBeHidden` wait passed at once). Run 2: 8 passed. Full run: 192 passed. Run 3 (cells only, after centring the active card before each screenshot): 16 passed. New spec `verify/cells.spec.ts` (4 tests × 4 viewports) installs a per-frame watcher that records every phase change per card (idle / preparing / proposed / settled, from the card's classes) with its spinner, status word, note, ghost text and new value, and the ghost's computed opacity on every frame it exists.

Measured: proposed → settled held 900–960ms per cell at both widths (600 hold + 300 fade); the ghost sits at opacity 1 for ≥ 450ms, then slopes to < 0.2 over ~300ms, then the card is redrawn without it. Reduced motion: every ghost frame is exactly 1 or 0, no slope. Esc during `i1` preparing: header hidden in a few frames, "stopped after 3/6 cells". Stop during `i1` proposed: "stopped after 4/6 cells", `i1` keeps 70% ↑ and the accent, ghost dropped.

### Screenshots reviewed
- `verify/shots/cells/01-preparing.desktop-light.png`: Code card "Last milestone: Pay by Bank" with signal border, thin spinner, "Reading…" and the note "api/giving/* · 14 files" on the status row. Old files value still shown. "◀ entered here" on the Code level line. Job header is scrolled out of view (page scrolled to centre the card).
- `verify/shots/cells/01-preparing.phone-light.png`: same at 400px; card full width, spinner and note on one row, log below with "sizing…" and "reaches 4 levels…".
- `verify/shots/cells/02-proposed.desktop-light.png`: Initiative card: "shipped ~~20%~~ 70% ↑", accent border and inset rule, status row "changed 20% → 70%", level line "1 changed". Other two initiatives untouched. (First run of this shot, before centring: card half under the floating bar.)
- `verify/shots/cells/02-proposed.desktop-dark.png`: same in dark; struck-through grey ghost legible beside the white new value; product cards above show CHANGED chips and accents, Code card changed below.
- `verify/shots/cells/02-proposed.phone-light.png` / `.phone-dark.png`: ghost and new value on one line at 400px, nothing clipped; accent on the card; "1 changed".
- `verify/shots/cells/03-settled.desktop-light.png`: ghost gone, "shipped 70% ↑", accent border kept, status row "changed 20% → 70%". Product cards CHANGED with accents, Code changed.
- `verify/shots/cells/04-after.phone-dark.png`: Assumptions "2 changed"; a1 "exposure 2 initiatives ↑", a2 "exposure 1 initiative ↑ · now load-bearing", both with accent; belief/evidence bars unchanged.
- `verify/shots/cells/05-stopped-mid-run.desktop-dark.png`: after Esc while `i1` prepared: no header, Initiatives back to "3 cards" with `i1` at 20% and no accent, Product "2 changed" and Code "1 changed" collapsed to their compact lines with the new notes. Hint chip keeps its focus ring.

### Defects fixed
1. After the intervene window the runner never read the abort flag: Esc/Stop did nothing until the run ended on its own (gap noted in iteration 10). `tick()` now throws out of the next pause; the flow unwinds, the in-flight cell loses its spinner/ghost, settled cells keep their values, quiet levels collapse, and the log says "stopped after k/n cells". Assertion: header hidden < 300ms after Esc mid-run; changed ids exactly the settled ones; no `_` keys left on any card.
2. `.card.preparing` existed in the stylesheet but was never applied (the status row alone marked a preparing card). Now set from `_phase`. Assertion: class present with spinner before `proposed`.
3. Screenshots of the active cell were taken without scrolling, so the desktop preparing shot showed only the header and World. The spec now centres the active card before each shot.

### Assertions added
For each of c1, p1, p2, i1, a1, a2: phases seen in the order preparing → proposed → settled; preparing has a spinner, a status word from {Reading…, Preparing…} and the exact per-cell note; proposed has no spinner, the exact ghost text (20% / 1 initiative / 0 initiatives; none for code/product cards whose only change is text) and the exact new value; proposed held 800–1400ms; settled has no ghost. Levels start in run order (code < product < initiatives < assumptions). Ghost: first frame opacity 1, solid ≥ 450ms, fade 150–450ms, reaches < 0.2 before removal. Proposed card has a different border colour from an idle card and a non-none box-shadow; the settled card has the same border and shadow as when proposed. After the run: ↑ on i1 shipped, a1 and a2 exposure only (three arrows in total), six changed ids, three accented cards on screen plus "2 changed"/"1 changed" on the collapsed levels. Reduced motion: same order, ghost opacity only ever 1 or 0.

### Design review (SPEC §7)
1. The job header is not sticky. The first cell to change is on the Code level at the bottom of the stack, so at desktop the viewer either watches the header with nothing visibly changing, or scrolls down and loses "k/6 cells done" and Stop. UX-phase candidate (highest): keep the header under the top bar, or bring the active cell into view as the run walks up.
2. While proposed, the card says the move twice: "~~20%~~ 70% ↑" in the field and "changed 20% → 70%" on the status row. One of them is enough. Same family as the double "changed" on product cards.
3. The ghost fades to transparent and is then removed, so the new value jumps left by the ghost's width at the end of the fade. Small, but it is the one motion in the settle that is not a fade. Candidate: collapse the ghost's width with its opacity.
4. Product card notes, the only thing that changes on those cards, are cut mid-word at desktop ("exposed to age…"). Carried (truncated values).
5. Carried: warning and Stop at opposite edges; window not shown draining; phone chrome ~250px; hint chip focus ring through the run; spinner at 6/6; hint chips float over cards at phone; ⌘K kbd on phone; dark cards 1.09:1; black `now` pill; citation sentences on cards; dead 16px status band; 3+1 assumptions grid; ⚠ glyph small.

## 2026-10-10 · Iteration 12 · log line in sync with the settle (check 24)

Run 1 (sync only): 4 failed, test bug (compared a 12-char slice of each line to a shorter prefix). Run 2: 4 failed, wrong assumption in the test (a2 prepares alongside a1 by design; the "next cell waits for the line" rule holds across levels only). Run 3: 8 passed. Negative check on the previous runner (p1 and p2 settled in sequence under one shared line): fails with "p1 line 900ms after settle". Full run: 200 passed. New spec `verify/sync.spec.ts` (2 tests × 4 viewports) installs a per-frame watcher that timestamps every phase change on every card and every `.l` that lands in the run's log entry.

Measured: settle → line gap 0ms for c1, p1, p2, i1, a1, a2 at all four viewports (the settle's render and the line's append share a task, so they share a frame). p1 and p2 now propose and settle within the same frame. Stop while p1/p2 are proposed: header hidden < 1s, "stopped after 3/6 cells", zero DOM mutations in the stack for the next 1.5s.

### Screenshots reviewed
- `verify/shots/sync/01-a1-settled.desktop-light.png`: Assumptions "2 changed". a1 settled: "exposure 2 initiatives ↑", accent, status "changed exposure ↑". a2 already proposed (the shot lands ~300ms after a1's settle): "~~0 initiatives~~ 1 initiative ↑", "changed now load-bearing". Log entry has six lines, the newest "assumption “AI assistants mediate discovery”: exposure ↑ …· source"; no line for a2 yet. Header "6/6 cells done" with the spinner still turning.
- `verify/shots/sync/01-a1-settled.desktop-dark.png`: same in dark; struck-through ghost and the ochre-free line legible.
- `verify/shots/sync/01-a1-settled.phone-light.png`: a1 centred and settled, a2 proposed beneath with its ghost; hint chips float over the third assumption card.
- `verify/shots/sync/02-a1-line.phone-light.png`: log scrolled into view: six lines, a1's last, with the source link; the Code card's compact-expanded tail ("changed 14 files") above the LOG heading. Hint chips float over the Jul entry.
- `verify/shots/sync/02-a1-line.phone-dark.png`: same in dark.

### Defects fixed
1. One log line covers both product flows, but p1 and p2 settled in sequence, so p1 sat settled for ~900ms with no line (and p2 preparing all the while). They now settle concurrently, as SPEC §5 says cells in a level do. Assertion: p1/p2 proposed and settled within 50ms of each other; every cell's line ≤ 150ms after its settle (measured 0).
2. `stop()` woke only the most recent pause, so with two settles in flight the other ran on after the stop and re-rendered the stack ~900ms later. Pauses are now a set and Stop wakes all of them. Assertion: no stack DOM mutations for 1.5s after a stop during the shared settle.

### Assertions added
Exactly eight lines in the run's entry, in order (sizing, reaches, code, product, initiative, assumption a1, assumption a2 (warn), world), non-decreasing timestamps; "reaches" line before the first preparing; for each cell line: not before proposed, not before settled, ≤ 150ms after settled, the cell's last phase change before the line is `settled`; the next level's first cell prepares only after the previous level's line; a2 settles after a1's line; world line after a2's settle; Stop mid-shared-settle: 3/6, no transient classes or `_` keys, four lines in the entry, no stack mutations afterwards.

### Design review (SPEC §7)
1. The header reaches "6/6 cells done" while a2's ghost is still on screen and the spinner still turns: the count finishes before the screen does. (Sharper form of the carried "spinner at 6/6".) Candidate: count at settle, or stop the spinner and say "done" only when the last ghost has gone.
2. The a1 line ends "no new sources found ·" and the word "source" wraps alone onto a fifth line at 320px: an orphaned link. Candidate: `white-space: nowrap` on the `· source` span, or put the link on the sentence rather than a trailing word.
3. The a1 and a2 lines run to 4 and 6 visual lines in the 320px log; §7 wants prose to be two lines. Copy-pass candidate: cut the second sentence of each (the card already shows the number).
4. Carried: job header not sticky; proposed card says the move twice; new value jumps left when the ghost goes; product notes cut mid-word; warning and Stop at opposite edges; window not shown draining; phone chrome ~250px; hint chip focus ring through the run; hint chips float over cards and the log at phone; ⌘K kbd on phone; dark cards 1.09:1; black `now` pill; citation sentences on cards; dead 16px status band; 3+1 assumptions grid; ⚠ glyph small.

## 2026-10-10 · Iteration 13 · levels open for a run and close after (check 25)

Run 1 (levels only): 12 passed. No source change was needed: `touchLevel()` and `running()` already did this. New spec `verify/levels.spec.ts` (3 tests × 4 viewports) installs a per-frame watcher that records each level's open/compact state (from `.cards` vs `.compact` in the DOM), every card phase change with its level, and the frame the job header appears and hides.

Measured: Code opens on the same frame `c1` is first seen preparing (0ms at desktop and phone); Product opens on the same frame `p1` is first seen preparing (0ms); both close on the frame the header hides (0ms). World, Assumptions and Initiatives record one open-state change each (the first frame) and none after. Esc during the window: every level records exactly one change (first frame). Stop while `p1` prepares: Product and Code close on the header's frame; Code's compact line shows the new milestone title, Product's still shows the old notes.

### Screenshots reviewed
- `verify/shots/levels/01-code-opens.desktop-light.png`: Code level open with one card "Last milestone: Pay by Bank" in `preparing` (spinner, "Reading…", "api/giving/* · 14 files"), "◀ entered here" on the level line. Product above is still its compact line with "expand". Initiatives and the last assumption card above untouched. Header scrolled out of view.
- `verify/shots/levels/02-product-opens.desktop-light.png`: Product now three cards, the first with spinner "Preparing… which flows does this chan…"; all three carry UNCHANGED chips. Code below is "1 changed" with the settled milestone card (accent, "changed 14 files"). Initiatives still 20%.
- `verify/shots/levels/03-collapsed-after.desktop-dark.png`: run over. Product "2 changed" and Code "1 changed" back to compact lines, with the new notes ("cause search now exposed to agents", "Milestone: agent giving API v1 · 14 files · api/giving/* · Oct 2026") and "expand" links. Product's line wraps so "expand" sits alone on the second line. Initiatives 70% ↑ with accent; a1/a2 accented above. Log on the right with the a1, a2 (warn) and world lines, then the Jul snapshot.
- `verify/shots/levels/04-reopened.desktop-light.png`: after clicking Product's "expand": three cards, Donor discovery flow and Partner search with CHANGED chips, accents and "changed agent endpoint" / "changed partner data"; Giving app UNCHANGED. Code still compact. No header, nothing preparing. Both changed notes cut mid-word ("exposed to age…", "readable …").
- `verify/shots/levels/01-code-opens.phone-dark.png`: Product compact line (three rows), Code level open with the preparing card full width, LOG below with "sizing…" and the "reaches 4 levels" line. Hint chips float over the Jul entry.
- `verify/shots/levels/02-product-opens.phone-light.png`: three product cards stacked, first preparing; Code "1 changed" beneath, its card hidden under the floating hint chips.
- `verify/shots/levels/03-collapsed-after.phone-light.png`: Product "2 changed" compact in three rows with "expand" at the end; Code "1 changed" in two rows; LOG heading below. Hint chips over the log entry.

### Defects fixed
- None in source. The behaviour already matched SPEC §3 and §8.

### Assertions added
First load: `expanded` is {world, assumptions, initiatives: true; product, code: false}, compact lines visible. During sizing: five levels scanning, nothing open or closed. Code opens with `c1` first seen `preparing` (|Δ| ≤ 60ms), Product with `p1` (≤ 60ms), Product still compact while Code works, Product opens after `c1` settles. Product and Code each record exactly compact → open → compact; the other three record open only. Both close within 60ms of the header hiding and of each other, after `a2` settles. After the run: compact lines carry the new titles and notes, "expand" buttons present, 4/3/2 cards on the open levels. "expand" on Product shows three cards with two `changed`, Code stays compact, no header, no transient classes. Esc during the window: one state change per level (first frame). Stop while `p1` prepares: both levels compact on the header's frame, Code's line has the new title, Product's line does not have the new notes.

### Design review (SPEC §7)
1. When Product opens, all three cards wear an UNCHANGED chip while the first is already preparing: the chip contradicts the spinner on the same card. Candidate: no chip until the cell settles (it becomes CHANGED or stays UNCHANGED then), or drop the UNCHANGED chip from product cards altogether and let the accent do the work.
2. A level opens and closes as a snap: three cards push Code down ~150px on one frame, and the stack jumps back on the frame the header goes. §7 allows 200–400ms motion on state changes; this is a state change with none. Candidate: fade the cards in over ~250ms (opacity only, no height animation), and keep the snap on close.
3. The Product compact line wraps at desktop after the run, leaving "expand" alone on the second line (`03-collapsed-after.desktop-dark`). Candidate: shorter notes on the compact line, or put "expand" first.
4. Carried: header reaches 6/6 before the last ghost goes; "source" orphaned on its own line at 320px; a1/a2 log lines run 4–6 visual lines; job header not sticky; proposed card says the move twice; new value jumps left when the ghost goes; product notes cut mid-word; warning and Stop at opposite edges; window not shown draining; phone chrome ~250px; hint chip focus ring through the run; hint chips float over cards and the log at phone; ⌘K kbd on phone; dark cards 1.09:1; black `now` pill; citation sentences on cards; dead 16px status band; 3+1 assumptions grid; ⚠ glyph small.

## 2026-10-10 · Iteration 14 (manual, client request) · LLM runner + Express proxy (backlog 4)

### Screenshots reviewed
- `verify/shots/llm/01-sizing-while-calling.desktop-light.png`: job header "Sizing change… / scanning all levels" with Stop · Esc, log entry MILESTONE with "sizing…" while the fetch to /api/plan is in flight. Stack unchanged. Cards not yet visibly dimmed (shot lands inside the 300ms fade).
- `verify/shots/llm/01-sizing-while-calling.phone-light.png`: same at 400px; header fits on two lines, Stop sits right.
- `verify/shots/llm/02-fallback-line.desktop-dark.png`: amber-barred line "llm runner unavailable (proxy not reachable) · using the scripted runner", then a second "sizing…" as the scripted flow starts in the same entry. Dark tokens correct, contrast fine.
- `verify/shots/llm/02-fallback-line.phone-dark.png`: same at 400px; the warn line wraps to three lines but stays inside the log column.
- `verify/shots/llm/03-scripted-end-state.desktop-light.png`: Flow A end state: Assumptions "2 changed", a1 exposure 2 ↑, a2 "now load-bearing"; job header gone.
- `verify/shots/llm/03-scripted-end-state.phone-light.png`: same at 400px; header gone, "2 changed" visible, no horizontal scroll.

### Test results
- `verify/llm.spec.ts`: 8/8 (2 tests × 4 viewports). Flag off → zero `/api` requests. Flag on + proxy refused → warn line in the same log entry, scripted Flow A runs to its end state.
- Existing suite with the sizing split: 205/207 on the first run while the llm spec and a vite build ran concurrently; the 2 failures were both intervene timing tests on desktop-dark. `verify/intervene.spec.ts` alone: 20/20. Treated as load flakiness, not a regression.
- Server smoke (no key): `GET /api/health` → `{ok:true, model, key:false}`; `POST /api/plan {}` → 400; full body without a key → 500 with the SDK's auth message. The browser falls back on every non-200.
- Not verified: a real model call. No `ANTHROPIC_API_KEY` on this machine and `ant` is not installed. The proxy's request shape follows the current SDK docs (structured output via `output_config.format`, refusal fallback beta), but nobody has seen a plan come back yet.

### Defects
- Two "sizing…" lines in one entry when the fallback fires (LLM sizing, then the scripted runner's own). Honest but redundant. UX candidate: the fallback could skip the second line.
- The sizing dim is not visible on the first shot because of the 300ms fade; not a defect in the runner, but the "levels dim while the model thinks" moment is the whole point of starting sizing before the call, so it is worth a later screenshot timed after the fade.
- `class="entry"` is used both for log entries and for the level header's "◀ entered here" marker. Specs must scope to `#log .entry`. Rename candidate, not changed here.

### Design review (SPEC §7)
- The fallback line is the only amber line in the entry and carries two ideas (why, and what happens next) in one sentence of 11 words. Within the two-line budget at desktop; three at phone.
- No new colour, border or icon added. The proxy adds no UI.
- The second "sizing…" is the weakest moment of the fallback: the reader sees the same word twice 1s apart.

## 2026-10-10 · Iteration 15 (manual, client request) · new reference UI (Spotify seed, rail, intro, flows B–G)

### Screenshots reviewed
- `verify/shots/world/01-sizing.desktop-light.png`: entry "THE WORLD MOVED · a label changes its AI licensing terms", the simulated-signal line, "Sizing the change…" header with "How far does this reach? Looking at every level."
- `verify/shots/world/02-plan.desktop-light.png`: "Reaches 3 levels · moving down from World", "Will touch: 1 scenario, 1 belief, 2 bets." with the amber em, "starts here" tag on World.
- `verify/shots/world/04-evidence-gap.desktop-dark.png`: w2 RISING with "2 / 4 moved ↑" and "changed · watch → rising"; a4 evidence ●○○○○ ↓, belief ●●●●○ ⚠; Beliefs rail dot filled with ▼; the warn line "⚠ The gap is now 3" with a source link. Dark tokens correct.
- `verify/shots/world/05-bets-fragile.*`: i3 FRAGILE with "⚑ fired ·" on the trigger row, i1 FRAGILE.
- `verify/shots/world/06-end.desktop-light.png` (full page): World "1 changed", Beliefs "1 changed", Bets "2 changed", Product and Code untouched and still one line each; the analogue line "What happened last time: app stores" with a source; "Product and Code: unchanged."
- `verify/shots/inspect/01-three-lines.*`: INSPECT entry with reading / screenshots / "Wrote the prompt for you" (sig), then a separate "YOU SHIPPED · shipped AI DJ v2 (from the repo)" entry.
- `verify/shots/ask/01-highlight.phone-dark.png`: "YOU ASKED" entry; at phone width the highlighted bet is below the fold under the bar, so the glow is only visible at desktop. No job header.
- `verify/shots/unplaced/02-one-card.phone-light.png` (full page): one dashed UNPLACED card at the end of Beliefs, all dots empty, "0 bets", "changed · where does this belong?"; nothing else accented; the warn line and the "Next:" line.
- `verify/shots/snapshots/01-saved.*`: chip "10 Oct" between Jul and now; "Saved. 8 cards changed since “Jul”. 2 beliefs out of step with the evidence." (warn); no accents, no counts, rail dots hollow.
- `verify/shots/snapshots/02-viewing-jul.*`: amber banner "Viewing the “Jul” snapshot, read-only. Click “now” to come back."; i1 back at 60%; bar at half opacity.
- `verify/shots/snapshots/04-compare-ghosts.desktop-light.png`: "Show what changed since last snapshot" on; i1 "~~60%~~ 100% ↑", a1 "~~1 bet~~ 2 bets ↑", a4 "~~2 bets~~ 3 bets ↑"; nothing else ghosted.
- `verify/shots/expand/03-belief-open.*`: a4 open with Evidence (3) links, Bets riding on this (two), the App stores analogue with got cheap / value moved to / survivor watched / loser believed, History "no changes yet"; row-mates keep their own height.
- `verify/shots/bar/01-actions.*`: "Try:" and five labelled actions, the first with the ink border; `02-intro.*`: the strip with the paragraph, "Try it" button and "hide"; `03-dimmed-during-run.*` and `04-dimmed-viewing-jul.*`: the bar at half opacity.
- Re-generated by the rewritten specs: `shots/{smoke,stack,chips,expand,assumptions,job,scanning,intervene,levels}/…` all reviewed by the agents that rewrote them; spot-checked `job/02-plan.desktop-light` ("Reaches 4 levels · moving up from Code") and `levels/02-product-opens.phone-light` (p2 first).

### Test results
- New `verify/flows.spec.ts` (Flows B–G): 36/36. New `verify/bar.spec.ts`: 48/48.
- Rewritten: smoke/stack/chips/expand/assumptions 88/88; job/scanning/intervene/levels 60/60; cells/sync/phone/llm/theme: see the line below.
- cells/sync/phone/llm/theme: 76/76. theme.spec gained a token-coverage test (every token defined in light and both dark paths, every `-soft` has its strong partner) and the new classes in its contrast sweep.
- Full suite after the rewrites, one run: **308 passed, 0 failed, 0 flaky** (4.2 min).
- No source change was needed for any spec; every failure after the port was stale copy, the new seed, or a spec measurement artefact (viewport vs document coordinates, `expect` polling vs a 2s window).

### Defects
- Phone width: the five labelled Try actions plus the bar cover ~230px of an 800px viewport, more than the old chips did. The level under the bar is unreadable until the user scrolls. Top UX candidate: one row of actions at phone, or hide the labels under 480px.
- The intro's "hide" link sits alone on its own row under the paragraph (the reference does the same; its grid puts the third child on row two). Reads as an orphan.
- The ask highlight is invisible at phone when the matching card is below the fold; the answer line is the only signal. Could scroll the first hit into view.
- "Reaches 1 level · moving down from World" for the unmatched flow is honest but odd: nothing moves down from World. The reference has the same plan. Copy candidate.

### Design review (SPEC §7)
- One accent (signal) for changed/active, amber for ⚠/⚑/warn, green only on live/robust chips; no gradients, no icons beyond ⚠ ⚑ ↑ ↓, no mascot. The rail is monochrome until a run touches a level.
- Prose only in the log; the longest line (the ⚠ gap line in Flow B) is four visual lines at desktop and seven at phone, over §7's two-line intent. Candidate for a trim.
- Chip tooltips are the only hidden text; everything else is visible. Motion unchanged (300ms dim, 300ms ghost fade, 400ms bar).

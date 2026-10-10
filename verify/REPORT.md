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

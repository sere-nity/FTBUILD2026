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

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

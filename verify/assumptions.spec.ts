import { test, expect, type Page } from '@playwright/test';

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/assumptions/${frame}.${name}.png`, fullPage: true });

const DOTS = /^[●○]{5}$/;

/** Set a card's evidence/belief in the live store and re-render. */
const setDots = (page: Page, id: string, ev: number, us: number) =>
  page.evaluate(
    ([id, ev, us]) => {
      const { store, render } = window.__waypoint;
      const c = store.state.cards.find((x) => x.id === id)!;
      c.ev = ev as number;
      c.us = us as number;
      render();
    },
    [id, ev, us] as const,
  );

test.describe('beliefs: evidence, our belief, gap flag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level[data-level="assumptions"] .card').first().waitFor();
  });

  test('every belief shows two separate five-dot bars', async ({ page }) => {
    const cards = page.locator('.level[data-level="assumptions"] .card');
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const c = cards.nth(i);
      await expect(c.locator('.fields .k').nth(0)).toHaveText('evidence');
      await expect(c.locator('.fields .k').nth(1)).toHaveText('our belief');
      const ev = c.locator('.fields .v.dots').nth(0);
      const us = c.locator('.fields .v.dots').nth(1);
      await expect(ev).toHaveText(DOTS);
      // The belief row may carry the ⚠ flag after its dots.
      await expect(us).toHaveText(/^[●○]{5}( ⚠)?$/);
      // Two bars, never one blended confidence: they live in different rows.
      const [a, b] = await Promise.all([ev.boundingBox(), us.boundingBox()]);
      expect(b!.y).toBeGreaterThan(a!.y);
    }
    // Seed values: a1 3/4, a2 4/4, a3 2/4, a4 3/4.
    await expect(page.locator('.card[data-id="a1"] .fields .v.dots').nth(0)).toHaveText('●●●○○');
    await expect(page.locator('.card[data-id="a1"] .fields .v.dots').nth(1)).toHaveText('●●●●○');
    await expect(page.locator('.card[data-id="a2"] .fields .v.dots').nth(0)).toHaveText('●●●●○');
    await expect(page.locator('.card[data-id="a2"] .fields .v.dots').nth(1)).toHaveText('●●●●○');
    await expect(page.locator('.card[data-id="a3"] .fields .v.dots').nth(0)).toHaveText('●●○○○');
    await expect(page.locator('.card[data-id="a3"] .fields .v.dots').nth(1)).toContainText('●●●●○');
    await expect(page.locator('.card[data-id="a4"] .fields .v.dots').nth(0)).toHaveText('●●●○○');
    await expect(page.locator('.card[data-id="a4"] .fields .v.dots').nth(1)).toHaveText('●●●●○');
  });

  test('⚠ appears only when evidence and belief differ by 2 or more', async ({ page }, testInfo) => {
    const flags = page.locator('.level[data-level="assumptions"] .flag');
    // Seed: a3 believes ●●●●○ on ●●○○○ evidence (gap 2), the only gap of 2 or more → one flag, on a3.
    await expect(flags).toHaveCount(1);
    await expect(page.locator('.card[data-id="a3"] .fields .v.dots').nth(1).locator('.flag')).toHaveText('⚠');
    // Close a3's gap to 1 → no flag anywhere.
    await setDots(page, 'a3', 3, 4);
    await expect(flags).toHaveCount(0);
    await shot(page, testInfo.project.name, '01-no-gap');

    // Gap 3 on a2 → exactly one flag, on a2's belief row.
    await setDots(page, 'a2', 1, 4);
    await expect(flags).toHaveCount(1);
    const a2 = page.locator('.card[data-id="a2"]');
    await expect(a2.locator('.fields .v.dots').nth(0)).toHaveText('●○○○○');
    await expect(a2.locator('.fields .v.dots').nth(1)).toContainText('●●●●○');
    await expect(a2.locator('.fields .v.dots').nth(1).locator('.flag')).toHaveText('⚠');
    await expect(a2.locator('.flag')).toHaveAttribute('title', 'We believe this more than the evidence supports');
    // The flag must be visible, not clipped by the row's overflow.
    const row = a2.locator('.fields .v.dots').nth(1);
    expect(await row.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await shot(page, testInfo.project.name, '02-gap-3');

    // Gap exactly 2 → still flagged.
    await setDots(page, 'a2', 2, 4);
    await expect(flags).toHaveCount(1);

    // Gap 1 → flag gone.
    await setDots(page, 'a2', 3, 4);
    await expect(flags).toHaveCount(0);

    // Gap works in either direction (belief lower than evidence).
    await setDots(page, 'a2', 4, 1);
    await expect(flags).toHaveCount(1);
  });

  test('the flag sits beside the belief bar, not the evidence bar', async ({ page }) => {
    await setDots(page, 'a3', 0, 3);
    const a3 = page.locator('.card[data-id="a3"]');
    await expect(a3.locator('.fields .v.dots').nth(0).locator('.flag')).toHaveCount(0);
    await expect(a3.locator('.fields .v.dots').nth(1).locator('.flag')).toHaveCount(1);
  });
});

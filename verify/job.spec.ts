import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: Job header appears with phase, "Reaches N levels", k/n cells, Stop button,
// progress bar. Drives Flow A from the hint chip at real demo timing and watches the
// header through its three phases, then asserts it is gone when the run ends.

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/job/${frame}.${name}.png`, fullPage: false });

const barPct = (page: Page) =>
  page.evaluate(() => {
    const i = document.querySelector<HTMLElement>('#jobbar')!;
    const w = i.parentElement!.getBoundingClientRect().width;
    return (i.getBoundingClientRect().width / w) * 100;
  });

test.describe('job header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('hidden when idle', async ({ page }) => {
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    await expect(page.locator('[data-entry]')).toHaveText(['', '', '', '', '']);
  });

  test('phase, reach, cells, Stop and progress bar through a run', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const job = page.locator('#job');
    const title = page.locator('#jobtitle');
    const meta = page.locator('#jobmeta');
    const stop = page.locator('#stop');

    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();

    // 1 · sizing: header visible, spinner, phase text, every level dimmed, bar started.
    await expect(job).toBeVisible();
    await expect(title).toHaveText('Sizing change…');
    await expect(meta).toHaveText('scanning all levels');
    await expect(page.locator('#job .line1 .spin')).toBeVisible();
    await expect(stop).toBeVisible();
    await expect(stop).toHaveText('Stop · Esc');
    await expect(page.locator('.level.scanning')).toHaveCount(5);
    const p1 = await barPct(page);
    expect(p1).toBeGreaterThan(0);
    expect(p1).toBeLessThan(10);
    await shot(page, testInfo.project.name, '01-sizing');

    // 2 · intervene: "Reaches N levels · direction", touches, 2s warning, entry marker.
    await expect(title).toHaveText('Reaches 4 levels · bottom-up');
    await expect(meta).toContainText('touches: 1 milestone, 2 product flows, 1 initiative, 2 assumptions');
    await expect(meta.locator('.warn')).toHaveText('2s to intervene');
    // No separator glyph that can be orphaned at a line end when the meta wraps at 400px.
    await expect(meta).not.toContainText('·');
    await expect(meta.locator('> span')).toHaveCount(2);
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    await expect(page.locator('.level[data-level="code"] [data-entry]')).toHaveText('◀ entered here');
    await expect(page.locator('.level:not([data-level="code"]) [data-entry]')).toHaveText(['', '', '', '']);
    const p2 = await barPct(page);
    expect(p2).toBeGreaterThan(p1);
    await shot(page, testInfo.project.name, '02-reaches');

    // 3 · running: k/n cells counts up, bar grows with it, Stop stays available.
    await expect(title).toHaveText('Reaches 4 levels · 0/6 cells done');
    await expect(meta).toHaveText('bottom-up · milestone');
    await expect(stop).toBeVisible();
    await expect(title).toHaveText('Reaches 4 levels · 1/6 cells done', { timeout: 10_000 });
    const p3 = await barPct(page);
    expect(p3).toBeGreaterThan(p2);
    await expect(title).toHaveText('Reaches 4 levels · 3/6 cells done', { timeout: 10_000 });
    await shot(page, testInfo.project.name, '03-cells');
    const p4 = await barPct(page);
    expect(p4).toBeGreaterThan(p3);
    await expect(title).toHaveText('Reaches 4 levels · 6/6 cells done', { timeout: 15_000 });
    await expect.poll(() => barPct(page)).toBeGreaterThan(99);
    await shot(page, testInfo.project.name, '04-done');

    // 4 · finished: header gone, entry marker cleared, nothing left dimmed or preparing.
    await expect(job).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('[data-entry]')).toHaveText(['', '', '', '', '']);
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    await expect(page.locator('.status .spin')).toHaveCount(0);
    await shot(page, testInfo.project.name, '05-after');
  });

  test('Stop during the intervene window hides the header and changes nothing', async ({ page }, testInfo) => {
    const before = await page.evaluate(() => JSON.stringify(window.__waypoint.store.state));
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    await page.locator('#stop').click();
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('stopped before running');
    const after = await page.evaluate(() => JSON.stringify(window.__waypoint.store.state));
    expect(after).toBe(before);
    await expect(page.locator('[data-entry]')).toHaveText(['', '', '', '', '']);
    await shot(page, testInfo.project.name, '06-stopped');
  });

  test('a second submit while a run is in progress is ignored', async ({ page }) => {
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#job')).toBeVisible();
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#log .entry')).toHaveCount(2); // Jul baseline + one milestone
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden();
  });
});

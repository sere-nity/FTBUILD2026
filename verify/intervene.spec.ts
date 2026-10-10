import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: 2-second intervene window after sizing; Esc during it leaves state unchanged.
// SPEC §5: the plan ("Reaches 3 levels · top-down · touches …") is shown before anything runs
// with a 2-second window to intervene. SPEC §6: stopping during the window means nothing changed.
// The window is measured in-page, frame by frame, from the plan appearing to the first cell count.

type Watch = {
  planAt: number; // first frame with "Reaches … · bottom-up" in the title
  runAt: number; // first frame with "0/6 cells done"
  marks: number; // frames during the window with any spinner, accent, dim or open quiet level
  stateChanged: number; // frames during the window where the serialised state differed
};

declare global {
  interface Window {
    __win: Watch;
  }
}

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/intervene/${frame}.${name}.png`, fullPage: false });

const state = (page: Page) => page.evaluate(() => JSON.stringify(window.__waypoint.store.state));

const watch = (page: Page) =>
  page.evaluate(() => {
    const w: Watch = { planAt: 0, runAt: 0, marks: 0, stateChanged: 0 };
    window.__win = w;
    const before = JSON.stringify(window.__waypoint.store.state);
    const title = () => document.querySelector('#jobtitle')?.textContent ?? '';
    const tick = () => {
      const now = performance.now();
      const t = title();
      if (!w.planAt && /^Reaches \d levels · (bottom-up|top-down)$/.test(t)) w.planAt = now;
      if (w.planAt && !w.runAt) {
        if (/cells done/.test(t)) {
          w.runAt = now;
          return;
        }
        const s = window.__waypoint.store.state;
        const marked =
          document.querySelectorAll('.status .spin, .card.changed, .level.scanning').length > 0 ||
          s.expanded.product ||
          s.expanded.code;
        if (marked) w.marks++;
        if (JSON.stringify(s) !== before) w.stateChanged++;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const idle = async (page: Page) => {
  await expect(page.locator('#job')).toBeHidden();
  await expect(page.locator('.level.scanning')).toHaveCount(0);
  await expect(page.locator('.status .spin')).toHaveCount(0);
  await expect(page.locator('.card.changed')).toHaveCount(0);
  await expect(page.locator('[data-entry]')).toHaveText(['', '', '', '', '']);
  await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
  await expect(page.locator('.level[data-level="code"] .compact')).toBeVisible();
};

test.describe('intervene window', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('the plan holds for ~2s and nothing changes until it ends', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const before = await state(page);
    await watch(page);
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();

    // 1 · the plan: reach, direction, what it touches, the window warning, the entry marker.
    const title = page.locator('#jobtitle');
    await expect(title).toHaveText('Reaches 4 levels · bottom-up');
    await expect(page.locator('#jobmeta')).toContainText('touches: 1 milestone, 2 product flows, 1 initiative, 2 assumptions');
    await expect(page.locator('#jobmeta .warn')).toHaveText('2s to intervene');
    await expect(page.locator('#stop')).toBeVisible();
    await expect(page.locator('.level[data-level="code"] [data-entry]')).toHaveText('◀ entered here');
    // Nothing has moved yet: no spinner, no accent, no dim, quiet levels still collapsed.
    await expect(page.locator('.status .spin')).toHaveCount(0);
    await expect(page.locator('.card.changed')).toHaveCount(0);
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="code"] .compact')).toBeVisible();
    expect(await state(page)).toBe(before);
    await shot(page, testInfo.project.name, '01-window');

    // 2 · the window is ~2s long, measured from the plan appearing to the first cell count.
    await expect(title).toHaveText('Reaches 4 levels · 0/6 cells done', { timeout: 5_000 });
    const w = await page.evaluate(() => window.__win);
    expect(w.planAt).toBeGreaterThan(0);
    const held = w.runAt - w.planAt;
    expect(held, `window held ${Math.round(held)}ms`).toBeGreaterThanOrEqual(1900);
    expect(held, `window held ${Math.round(held)}ms`).toBeLessThanOrEqual(2400);
    // Not one frame of the window showed a mark or a changed state.
    expect(w.marks).toBe(0);
    expect(w.stateChanged).toBe(0);

    // 3 · the run then proceeds on its own.
    await expect(page.locator('.status .spin')).toHaveCount(1, { timeout: 3_000 });
    await expect(page.locator('#job')).toBeHidden({ timeout: 20_000 });
    expect(await state(page)).not.toBe(before);
  });

  test('Esc at the start of the window: header goes at once, nothing changed', async ({ page }, testInfo) => {
    const before = await state(page);
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    const t0 = Date.now();
    await page.keyboard.press('Escape');
    // Regression: stop used to be honoured only when the 2s timer ran out, so the header
    // stayed up for up to 2s after Esc (then 300ms, behind the log line's pause). It must
    // go within a few frames.
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    expect(Date.now() - t0).toBeLessThan(300);
    await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('stopped before running');
    await expect(page.locator('#log .entry').first().locator('.l')).toHaveCount(2); // sizing…, stopped
    await idle(page);
    expect(await state(page)).toBe(before);
    await shot(page, testInfo.project.name, '02-esc-early');
    // The run is over: nothing settles later.
    await page.waitForTimeout(3_000);
    await idle(page);
    expect(await state(page)).toBe(before);
    await expect(page.locator('#log .entry')).toHaveCount(2); // Jul baseline + this one
  });

  test('Esc late in the window still stops with nothing changed', async ({ page }, testInfo) => {
    const before = await state(page);
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    await page.waitForTimeout(1_500);
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('stopped before running');
    await idle(page);
    expect(await state(page)).toBe(before);
    await shot(page, testInfo.project.name, '03-esc-late');
    await page.waitForTimeout(2_000);
    await idle(page);
    expect(await state(page)).toBe(before);
  });

  test('Esc with the bar focused stops the run too; Esc when idle does nothing', async ({ page }) => {
    const before = await state(page);
    // Idle: Esc is a no-op. No header, no log entry.
    await page.keyboard.press('Escape');
    await page.locator('#prompt').focus();
    await page.keyboard.press('Escape');
    await idle(page);
    await expect(page.locator('#log .entry')).toHaveCount(1);
    expect(await state(page)).toBe(before);
    // In the window with the bar focused (the user was about to type): Esc still stops.
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await page.locator('#prompt').focus();
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    await idle(page);
    expect(await state(page)).toBe(before);
  });

  test('typing and submitting in the window is ignored; the run goes on', async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByRole('button', { name: 'shipped the agent-facing giving API' }).click();
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · bottom-up');
    await page.locator('#prompt').fill('world update');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log .entry')).toHaveCount(2); // Jul + the milestone only
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · 0/6 cells done', { timeout: 5_000 });
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · 6/6 cells done', { timeout: 25_000 });
    await expect(page.locator('#log .entry')).toHaveCount(2);
    await expect(page.locator('#job')).toBeHidden({ timeout: 10_000 });
  });
});

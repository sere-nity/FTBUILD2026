import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: `scanning` dims every level for ~1.1s, then untouched levels snap back solid.
// SPEC §6: the whole level body dims (to 0.3 in style.css) while classify runs (~1.1s). Then
// untouched levels snap back. Timing is measured in-page with a per-frame watcher so the assertion is
// about what the screen did, not about what the runner intended.

type Watch = {
  onAt: number; // first frame with a `.scanning` level
  dimAt: number; // first frame where a level's body is at ≤ 0.31 opacity
  offAt: number; // first frame with no `.scanning` level again
  minOpacity: number; // lowest opacity sampled while scanning
  atOff: string[]; // opacity of every level body on the frame scanning ended
  worldScanned: number; // frames where World was scanning after the first off
};

declare global {
  interface Window {
    __scan: Watch;
  }
}

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/scanning/${frame}.${name}.png`, fullPage: false });

const BODY = '.level .cards, .level .compact';

/** The primary hint: "You shipped something · shipped AI DJ v2". Starts Flow A. */
const ship = async (page: Page) => {
  const hint = page.locator('#hints .hint.primary');
  await expect(hint).toContainText('shipped AI DJ v2');
  await hint.click();
};

/** Sample the stack every animation frame until the scanning phase has come and gone. */
const watch = (page: Page) =>
  page.evaluate(() => {
    const w: Watch = { onAt: 0, dimAt: 0, offAt: 0, minOpacity: 1, atOff: [], worldScanned: 0 };
    window.__scan = w;
    const bodies = () => Array.from(document.querySelectorAll<HTMLElement>('.level .cards, .level .compact'));
    const tick = () => {
      const now = performance.now();
      const n = document.querySelectorAll('.level.scanning').length;
      if (n > 0 && !w.onAt) w.onAt = now;
      if (w.onAt && !w.offAt) {
        const ops = bodies().map((e) => parseFloat(getComputedStyle(e).opacity));
        const max = Math.max(...ops);
        w.minOpacity = Math.min(w.minOpacity, max);
        if (max <= 0.31 && !w.dimAt) w.dimAt = now;
        if (n === 0) {
          w.offAt = now;
          w.atOff = bodies().map((e) => getComputedStyle(e).opacity);
        }
      }
      if (w.offAt && document.querySelector('.level.scanning[data-level="world"]')) w.worldScanned++;
      if (document.querySelector('#job') && !(document.querySelector('#job') as HTMLElement).hidden) requestAnimationFrame(tick);
      else if (!w.offAt) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const opacities = (page: Page) =>
  page.$$eval(BODY, (els) => els.map((e) => getComputedStyle(e).opacity));

test.describe('scanning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('every level dims to 0.3 for ~1.1s, then snaps back solid', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await expect(page.locator('.level')).toHaveCount(5);
    await watch(page);
    await ship(page);

    // 1 · all five levels carry the class; bodies reach 0.3 once the 300ms fade is done.
    await expect(page.locator('.level.scanning')).toHaveCount(5);
    await expect.poll(async () => Math.max(...(await opacities(page)).map(Number))).toBeLessThanOrEqual(0.31);
    expect((await opacities(page)).length).toBe(5);
    // Level heads and the rail stay solid: the level body is dimmed, not hidden.
    for (const op of await page.$$eval('.level-head, .level .rail', (els) => els.map((e) => getComputedStyle(e).opacity))) {
      expect(op).toBe('1');
    }
    // Nothing is marked while scanning: no spinner, no accent, no entry marker.
    await expect(page.locator('.status .spin')).toHaveCount(0);
    await expect(page.locator('.card.changed')).toHaveCount(0);
    await expect(page.locator('[data-entry]')).toHaveText(['', '', '', '', '']);
    await shot(page, testInfo.project.name, '01-dimmed');

    // 2 · scanning ends after ~1.1s and every level is solid on the very next frame.
    await expect(page.locator('.level.scanning')).toHaveCount(0, { timeout: 5_000 });
    const w = await page.evaluate(() => window.__scan);
    expect(w.onAt).toBeGreaterThan(0);
    expect(w.offAt).toBeGreaterThan(w.onAt);
    const held = w.offAt - w.onAt;
    expect(held, `scanning held ${Math.round(held)}ms`).toBeGreaterThanOrEqual(1000);
    expect(held, `scanning held ${Math.round(held)}ms`).toBeLessThanOrEqual(1500);
    expect(w.minOpacity).toBeLessThanOrEqual(0.31);
    expect(w.minOpacity).toBeGreaterThanOrEqual(0.3);
    // Dim fades in over the 300ms transition (SPEC §7: motion 200–400ms), not instantly.
    // Regression: the stack is rebuilt before dimming, and a class added before the first
    // style pass used to land with no transition at all (0ms).
    const fade = w.dimAt - w.onAt;
    expect(fade, `dim reached after ${Math.round(fade)}ms`).toBeGreaterThanOrEqual(150);
    expect(fade, `dim reached after ${Math.round(fade)}ms`).toBeLessThanOrEqual(450);
    // Snap back: no fade out. Every body is at 1 on the frame the class is gone.
    expect(w.atOff).toEqual(['1', '1', '1', '1', '1']);
    expect(await opacities(page)).toEqual(['1', '1', '1', '1', '1']);
    await shot(page, testInfo.project.name, '02-solid');

    // 3 · World is untouched by Flow A and never dims again during the run.
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · 3/6 cells done', { timeout: 15_000 });
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    expect(await page.$eval('.level[data-level="world"] .cards', (e) => getComputedStyle(e).opacity)).toBe('1');
    await expect(page.locator('#job')).toBeHidden({ timeout: 15_000 });
    expect((await page.evaluate(() => window.__scan)).worldScanned).toBe(0);
    expect(await opacities(page)).toEqual(['1', '1', '1', '1', '1']);
  });

  test('Esc while scanning: levels snap back, header goes, nothing changed', async ({ page }, testInfo) => {
    const before = await page.evaluate(() => JSON.stringify(window.__waypoint.store.state));
    await ship(page);
    await expect(page.locator('.level.scanning')).toHaveCount(5);
    await expect.poll(async () => Math.max(...(await opacities(page)).map(Number))).toBeLessThanOrEqual(0.31);
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 3_000 });
    await expect(page.locator('.level.scanning')).toHaveCount(0);
    expect(await opacities(page)).toEqual(['1', '1', '1', '1', '1']);
    await expect(page.locator('#jobtitle')).not.toHaveText(/Reaches/);
    await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('Stopped before anything changed.');
    const after = await page.evaluate(() => JSON.stringify(window.__waypoint.store.state));
    expect(after).toBe(before);
    await shot(page, testInfo.project.name, '03-stopped-while-scanning');
  });
});

test.describe('scanning · reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('dims at once, no fade, same hold', async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto('/');
    await page.locator('.level').first().waitFor();
    await watch(page);
    await ship(page);
    await expect(page.locator('.level.scanning')).toHaveCount(5);
    expect(await opacities(page)).toEqual(['0.3', '0.3', '0.3', '0.3', '0.3']);
    await expect(page.locator('.level.scanning')).toHaveCount(0, { timeout: 5_000 });
    const w = await page.evaluate(() => window.__scan);
    expect(w.dimAt - w.onAt).toBeLessThanOrEqual(40);
    expect(w.offAt - w.onAt).toBeGreaterThanOrEqual(1000);
    expect(w.offAt - w.onAt).toBeLessThanOrEqual(1500);
    expect(w.atOff).toEqual(['1', '1', '1', '1', '1']);
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 3_000 });
  });
});

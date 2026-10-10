import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: 400px wide: no horizontal scroll, log moves below the stack, bar fits.
// Runs at all four projects; the "log below stack" assertion flips on viewport width.

const shot = (page: Page, name: string, frame: string, full = true) =>
  page.screenshot({ path: `verify/shots/phone/${frame}.${name}.png`, fullPage: full });

async function openEverything(page: Page) {
  await page.evaluate(() => {
    const { store, render } = window.__waypoint;
    store.state.expanded.product = true;
    store.state.expanded.code = true;
    for (const c of store.state.cards) store.open[c.id] = true;
    render();
  });
}

async function widestElement(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    let worst = { sel: '', right: 0 };
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.right > worst.right) worst = { sel: el.className ? `${el.tagName}.${el.className}` : el.tagName, right: r.right };
    }
    return { w, worst, scrollW: document.documentElement.scrollWidth };
  });
}

test.describe('phone width', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('no horizontal scroll on first load', async ({ page }, testInfo) => {
    const m = await widestElement(page);
    expect(m.scrollW, 'document scrollWidth').toBeLessThanOrEqual(m.w);
    expect(m.worst.right, `widest element ${m.worst.sel}`).toBeLessThanOrEqual(m.w);
    await shot(page, testInfo.project.name, '01-first-load');
  });

  test('no horizontal scroll with every level and card open', async ({ page }, testInfo) => {
    await openEverything(page);
    const m = await widestElement(page);
    expect(m.scrollW, 'document scrollWidth').toBeLessThanOrEqual(m.w);
    expect(m.worst.right, `widest element ${m.worst.sel}`).toBeLessThanOrEqual(m.w);
    await shot(page, testInfo.project.name, '02-all-open');
  });

  test('log sits below the stack at phone width, beside it at desktop', async ({ page }) => {
    const [stack, log] = await Promise.all([
      page.locator('.stack').boundingBox(),
      page.locator('.log').boundingBox(),
    ]);
    const w = page.viewportSize()!.width;
    if (w <= 860) {
      expect(log!.y).toBeGreaterThanOrEqual(stack!.y + stack!.height - 1);
      // No dead band between the stack and the log (the bar padding belongs to the log only).
      expect(log!.y - (stack!.y + stack!.height)).toBeLessThan(4);
      expect(log!.x).toBeCloseTo(stack!.x, 0);
      expect(log!.width).toBeCloseTo(stack!.width, 0);
    } else {
      expect(log!.x).toBeGreaterThan(stack!.x + stack!.width - 1);
      expect(Math.abs(log!.y - stack!.y)).toBeLessThan(2);
      expect(log!.width).toBeCloseTo(320, 0);
    }
  });

  test('bar fits: wrapper, prompt and every hint inside the viewport', async ({ page }, testInfo) => {
    const w = page.viewportSize()!.width;
    const h = page.viewportSize()!.height;
    const wrap = page.locator('.barwrap');
    await expect(wrap).toBeVisible();
    const boxes = await page
      .locator('.barwrap, .prompt, .hint, #prompt, .prompt .kbd')
      .evaluateAll((els) => els.map((e) => ({ sel: e.className || e.id, ...e.getBoundingClientRect().toJSON() })));
    for (const b of boxes) {
      expect(b.left, `${b.sel} left`).toBeGreaterThanOrEqual(0);
      expect(b.right, `${b.sel} right`).toBeLessThanOrEqual(w);
      expect(b.bottom, `${b.sel} bottom`).toBeLessThanOrEqual(h);
    }
    // The bar is fixed: it stays put when the page scrolls to the bottom.
    const before = await page.locator('.prompt').boundingBox();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = await page.locator('.prompt').boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    // Nothing in the stack or log is hidden behind the bar at the end of the page:
    // the last level and the log heading (the log's last child while it is empty) both
    // end above the bar wrapper. Regression: at 400px the hints wrap to three rows and
    // the bar grew past the fixed 120px padding, covering the "Log" heading.
    const wrapBox = await wrap.boundingBox();
    for (const sel of ['.stack .level:last-child', '.log > :last-child']) {
      const b = await page.locator(sel).boundingBox();
      expect(b!.y + b!.height, `${sel} bottom vs bar top`).toBeLessThanOrEqual(wrapBox!.y);
    }
    await shot(page, testInfo.project.name, '03-bar-at-bottom', false);
  });

  test('five hint chips, placeholder, ⌘K focuses, Enter clears', async ({ page }, testInfo) => {
    await expect(page.locator('.hint')).toHaveCount(5);
    await expect(page.locator('.hint').first()).toHaveText('shipped the agent-facing giving API');
    const input = page.locator('#prompt');
    await expect(input).toHaveAttribute('placeholder', 'tell it what changed, or ask…');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    await expect(input).toBeFocused();
    await input.fill('hello');
    await shot(page, testInfo.project.name, '04-bar-focused', false);
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('');
  });
});

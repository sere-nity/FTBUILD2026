import { test, expect, type Page } from '@playwright/test';

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/stack/${frame}.${name}.png`, fullPage: true });

test.describe('stack and cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('five levels render top to bottom', async ({ page }, testInfo) => {
    const heads = page.locator('.level-head h3');
    await expect(heads).toHaveText(['World', 'Beliefs', 'Bets', 'Product', 'Code']);
    // Visual order follows DOM order: each level's top is below the previous one.
    const boxes = await page.locator('.level').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().top),
    );
    for (let i = 1; i < boxes.length; i++) expect(boxes[i]).toBeGreaterThan(boxes[i - 1]);
    await shot(page, testInfo.project.name, '01-first-load');
  });

  test('product and code are collapsed on first load, others show cards', async ({ page }) => {
    for (const id of ['world', 'assumptions', 'initiatives']) {
      const lvl = page.locator(`.level[data-level="${id}"]`);
      await expect(lvl.locator('.cards')).toHaveCount(1);
      await expect(lvl.locator('.compact')).toHaveCount(0);
    }
    for (const id of ['product', 'code']) {
      const lvl = page.locator(`.level[data-level="${id}"]`);
      await expect(lvl.locator('.cards')).toHaveCount(0);
      await expect(lvl.locator('.compact')).toHaveCount(1);
      await expect(lvl.locator('.compact button[data-expand]')).toHaveText('show');
    }
    await expect(page.locator('.level[data-level="product"] .compact')).toContainText('Home feed');
    await expect(page.locator('.level[data-level="code"] .compact')).toContainText('Last milestone: Jam sessions');
  });

  test('card counts and seed content', async ({ page }) => {
    await expect(page.locator('.level[data-level="world"] .card')).toHaveCount(2);
    await expect(page.locator('.level[data-level="assumptions"] .card')).toHaveCount(4);
    await expect(page.locator('.level[data-level="initiatives"] .card')).toHaveCount(3);
    // The level count is silent until a run changes something, then it says how many.
    await expect(page.locator('.level-head .count')).toHaveText(['', '', '', '', '']);
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      store.state.changed['a1'] = 'more riding on it';
      store.state.changed['a4'] = 'more riding on it';
      store.state.changed['c1'] = '31 files';
      render();
    });
    await expect(page.locator('.level[data-level="assumptions"] .count')).toHaveText('2 changed');
    await expect(page.locator('.level[data-level="assumptions"] .count')).toHaveClass(/changed/);
    await expect(page.locator('.level[data-level="code"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="world"] .count')).toHaveText('');
  });

  test('one card component renders all level shapes', async ({ page }) => {
    // world: chip + if true/signposts/last moved
    const w1 = page.locator('.card[data-id="w1"]');
    await expect(w1.locator('h4')).toHaveText('Agents pick the music');
    await expect(w1.locator('.chip')).toHaveText('live');
    await expect(w1.locator('.fields .k')).toHaveText(['if true', 'signposts', 'last moved']);
    await expect(w1.locator('.fields .v').nth(1)).toHaveText('3 / 4 moved');
    await expect(w1.locator('.fields .v').nth(2)).toHaveText('Sep 2026');
    // assumptions: separate evidence + belief dot bars, what rides on it
    const a1 = page.locator('.card[data-id="a1"]');
    await expect(a1.locator('.chip')).toHaveText('interpretation');
    await expect(a1.locator('.fields .k')).toHaveText(['evidence', 'our belief', 'riding on it']);
    await expect(a1.locator('.fields .v').nth(0)).toHaveText('●●●○○');
    await expect(a1.locator('.fields .v').nth(1)).toHaveText('●●●●○');
    await expect(a1.locator('.fields .v').nth(2)).toHaveText('1 bet');
    await expect(page.locator('.card[data-id="a4"] .fields .v').nth(2)).toHaveText('2 bets');
    // initiatives: chip + % bar + shipped / depends on / trigger
    const i1 = page.locator('.card[data-id="i1"]');
    await expect(i1.locator('.chip')).toHaveText('hedge');
    await expect(i1.locator('.pct i')).toHaveCount(1);
    await expect(i1.locator('.fields .k')).toHaveText(['shipped', 'depends on', 'trigger']);
    await expect(i1.locator('.fields .v').nth(0)).toHaveText('60%');
    await expect(i1.locator('.fields .v').nth(1)).toHaveText(
      'Listeners will let an AI assistant choose for them · Labels keep licensing on current terms',
    );
    await expect(i1.locator('.fields .v').nth(2)).toHaveText(
      'if a label withdraws AI-feature rights → ship with licensed catalogue only',
    );
    // i2 has no trigger → no trigger row
    await expect(page.locator('.card[data-id="i2"] .fields .k')).toHaveText(['shipped', 'depends on']);
  });

  test('world "if true" value is not truncated', async ({ page }) => {
    const v = page.locator('.card[data-id="w1"] .fields .v').first();
    await expect(v).toHaveText('assistants choose · AI is cheap');
    const clipped = await v.evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(clipped).toBe(false);
  });

  test('top bar buttons stay on one row together', async ({ page }) => {
    const [cmp, save] = await Promise.all([
      page.locator('#cmp').boundingBox(),
      page.locator('#save').boundingBox(),
    ]);
    expect(Math.abs(cmp!.y - save!.y)).toBeLessThan(2);
  });

  test('no horizontal scroll at any width', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

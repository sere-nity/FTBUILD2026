import { test, expect, type Page } from '@playwright/test';

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/chips/${frame}.${name}.png`, fullPage: true });

// SPEC §3: the only words a chip may show, per level.
const ENUMS: Record<string, string[]> = {
  world: ['live', 'rising', 'watch', 'fading'],
  assumptions: ['fact', 'interpretation', 'prediction', 'unplaced'],
  initiatives: ['robust', 'hedge', 'fragile'],
  product: ['changed', 'unchanged'],
  code: [],
};

/** Every chip on screen as [level, text] pairs. */
const chips = (page: Page) =>
  page.locator('.level .card .chip').evaluateAll((els) =>
    els.map((e) => [e.closest('.level')!.getAttribute('data-level')!, e.textContent!.trim()] as const),
  );

test.describe('chips use only the SPEC §3 enums', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level[data-level="world"] .card').first().waitFor();
  });

  test('every chip on first load is in its level enum, one per card', async ({ page }, testInfo) => {
    const all = await chips(page);
    expect(all.length).toBe(2 + 4 + 3); // world + assumptions + initiatives cards, one chip each
    for (const [level, text] of all) expect(ENUMS[level], `${level}: "${text}"`).toContain(text);
    // One chip per card, never two.
    const perCard = await page.locator('.card').evaluateAll((els) => els.map((e) => e.querySelectorAll('.chip').length));
    for (const n of perCard) expect(n).toBeLessThanOrEqual(1);
    await shot(page, testInfo.project.name, '01-first-load');
  });

  test('all five levels expanded: product shows changed/unchanged, code shows no chip', async ({ page }, testInfo) => {
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      store.state.expanded.product = true;
      store.state.expanded.code = true;
      render();
    });
    const product = page.locator('.level[data-level="product"] .card');
    await expect(product).toHaveCount(3);
    await expect(product.locator('.chip')).toHaveText(['unchanged', 'unchanged', 'unchanged']);
    await expect(page.locator('.level[data-level="code"] .card')).toHaveCount(1);
    await expect(page.locator('.level[data-level="code"] .card .chip')).toHaveCount(0);
    const all = await chips(page);
    expect(all.length).toBe(2 + 4 + 3 + 3);
    for (const [level, text] of all) expect(ENUMS[level], `${level}: "${text}"`).toContain(text);
    await shot(page, testInfo.project.name, '02-all-expanded');

    // A product card the run touched flips to "changed" and takes the accent.
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      store.state.changed['p1'] = 'exposed to agents';
      render();
    });
    const p1 = page.locator('.card[data-id="p1"] .chip');
    await expect(p1).toHaveText('changed');
    await expect(p1).toHaveClass(/changed/);
    await expect(page.locator('.card[data-id="p2"] .chip')).toHaveText('unchanged');
    await shot(page, testInfo.project.name, '03-product-changed');
  });

  test('an unplaced assumption is chipped "unplaced"', async ({ page }) => {
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      store.state.cards.find((c) => c.id === 'a3')!.kind = 'unplaced';
      render();
    });
    await expect(page.locator('.card[data-id="a3"] .chip')).toHaveText('unplaced');
    await expect(page.locator('.card[data-id="a3"]')).toHaveClass(/unplaced/);
  });

  test('a word outside the enum never reaches a card', async ({ page }) => {
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      const w1 = store.state.cards.find((c) => c.id === 'w1')!;
      const a1 = store.state.cards.find((c) => c.id === 'a1')!;
      const i1 = store.state.cards.find((c) => c.id === 'i1')!;
      (w1 as { chip?: string }).chip = 'exciting';
      (a1 as { kind?: string }).kind = 'hunch';
      (i1 as { chip?: string }).chip = 'promising';
      render();
    });
    await expect(page.locator('.card[data-id="w1"] .chip')).toHaveCount(0);
    await expect(page.locator('.card[data-id="a1"] .chip')).toHaveCount(0);
    await expect(page.locator('.card[data-id="i1"] .chip')).toHaveCount(0);
    // The rest of the card still renders.
    await expect(page.locator('.card[data-id="w1"] h4')).toHaveText('Agent Concierge');
    await expect(page.locator('.card[data-id="i1"] .fields .k').first()).toHaveText('shipped');
  });

  test('chips are uppercase mono labels, not freeform prose', async ({ page }) => {
    const styles = await page.locator('.chip').evaluateAll((els) =>
      els.map((e) => {
        const cs = getComputedStyle(e);
        return { tt: cs.textTransform, ff: cs.fontFamily, ws: cs.whiteSpace };
      }),
    );
    for (const s of styles) {
      expect(s.tt).toBe('uppercase');
      expect(s.ff).toMatch(/Mono|mono|Menlo|Consolas|monospace/);
      expect(s.ws).toBe('nowrap');
    }
  });
});

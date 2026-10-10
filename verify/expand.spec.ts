import { test, expect, type Page } from '@playwright/test';

// Scroll to top first: a full-page capture paints the sticky bar wherever the page is scrolled.
const shot = async (page: Page, name: string, frame: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `verify/shots/expand/${frame}.${name}.png`, fullPage: true });
};

type Box = { id: string; x: number; y: number; w: number; h: number };

/** Position and size of every card and level header, keyed so we can diff before/after. */
const boxes = (page: Page): Promise<Box[]> =>
  page.locator('.card, .level-head').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      const id = e.classList.contains('card')
        ? (e as HTMLElement).dataset.id!
        : 'head:' + e.closest('.level')!.getAttribute('data-level');
      return { id, x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
    }),
  );

test.describe('card expands in place (CHECKS 17, SPEC Flow G)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level[data-level="assumptions"] .card').first().waitFor();
  });

  test('belief detail: evidence links, bets riding on it, what happened last time, history', async ({ page }, testInfo) => {
    await shot(page, testInfo.project.name, '01-closed');
    const a1 = page.locator('.card[data-id="a1"]');
    await expect(a1.locator('.detail')).toHaveCount(0);
    await a1.locator('h4').click();
    const d = a1.locator('.detail');
    await expect(d).toHaveCount(1);
    // In place: the detail is inside the card, not a modal or overlay.
    expect(await page.locator('[role="dialog"], .modal, .overlay').count()).toBe(0);
    expect(await d.evaluate((e) => getComputedStyle(e).position)).toBe('static');

    // Section headings, in order.
    await expect(d.locator('h5')).toHaveText(['Evidence (2)', 'Bets riding on this', 'What happened last time', 'History']);

    // Evidence: every source on a1 has a URL in data/sources.json, so two links.
    const links = d.locator('h5:has-text("Evidence") + ul a');
    await expect(links).toHaveCount(2);
    await expect(links).toHaveText([
      'Similarweb (2026): AI assistant referrals +117% year on year; ChatGPT share of gen-AI traffic fell to ~53%',
      'Pew Research (Jul 2025): users click a link on 8% of searches with an AI summary vs 15% without',
    ]);
    for (const a of await links.all()) {
      await expect(a).toHaveAttribute('href', /^https?:\/\//);
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
    }

    // Riding on it: i1 and i3 depend on a1.
    await expect(d.locator('h5:has-text("riding") + ul li')).toHaveText([
      'AI DJ v2 · 60% shipped',
      'Open listening-history API for agents · 40% shipped',
    ]);

    // Analogue block with the four labelled rows.
    const an = d.locator('.analogue');
    await expect(an.locator('.t')).toHaveText('Radio DJs → algorithmic playlists, 2008–2016');
    await expect(an.locator('.k')).toHaveText(['got cheap', 'value moved to', 'survivor watched', 'loser believed']);
    // Serif is reserved for the brand and the analogue title (SPEC §7).
    expect(await an.locator('.t').evaluate((e) => getComputedStyle(e).fontStyle)).toBe('italic');

    // History from the seed.
    await expect(d.locator('ul.hist li')).toHaveText(['Jul: evidence ●●○○○ → ●●●○○ (assistant referral data)']);
    await shot(page, testInfo.project.name, '02-a1-open');

    // Click again collapses.
    await a1.locator('h4').click();
    await expect(a1.locator('.detail')).toHaveCount(0);
  });

  test('the rest of the stack does not move when a card opens or closes', async ({ page }) => {
    // At phone width a1 sits below the fold; bring it into view first so Playwright's own
    // pre-click scroll is not what we measure. boxes() uses document coordinates throughout.
    await page.locator('.card[data-id="a1"] h4').scrollIntoViewIfNeeded();
    const before = await boxes(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.locator('.card[data-id="a1"] h4').click();
    await page.locator('.card[data-id="a1"] .detail').waitFor();
    const after = await boxes(page);
    expect(after.map((b) => b.id)).toEqual(before.map((b) => b.id));
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

    const a1Before = before.find((b) => b.id === 'a1')!;
    const a1After = after.find((b) => b.id === 'a1')!;
    const grew = a1After.h - a1Before.h;
    expect(grew).toBeGreaterThan(100);
    const a1Bottom = a1Before.y + a1Before.h;

    for (let i = 0; i < before.length; i++) {
      const b = before[i];
      const a = after[i];
      // Nothing moves sideways or changes width.
      expect(a.x, `${b.id} x`).toBeCloseTo(b.x, 0);
      expect(a.w, `${b.id} width`).toBeCloseTo(b.w, 0);
      // Only the opened card grows; its row-mates do not stretch into tall empty boxes
      // (they may shrink to their natural height once the row stops stretching).
      if (b.id !== 'a1') expect(a.h, `${b.id} height`).toBeLessThanOrEqual(b.h + 0.5);
      if (b.id === 'a1') {
        expect(a.y).toBeCloseTo(b.y, 0);
      } else if (b.y < a1Bottom) {
        // Everything above, and the cards beside a1 in the same row, stay put.
        expect(a.y, `${b.id} y`).toBeCloseTo(b.y, 0);
      } else {
        // Everything below slides down by exactly the detail's height, no more.
        expect(a.y - b.y, `${b.id} shift`).toBeCloseTo(grew, 0);
      }
    }

    // Collapse restores the original layout exactly.
    await page.locator('.card[data-id="a1"] h4').click();
    await expect(page.locator('.card[data-id="a1"] .detail')).toHaveCount(0);
    const back = await boxes(page);
    for (let i = 0; i < before.length; i++) {
      expect(back[i].y, `${before[i].id} y after collapse`).toBeCloseTo(before[i].y, 0);
      expect(back[i].h, `${before[i].id} h after collapse`).toBeCloseTo(before[i].h, 0);
    }
  });

  test('a belief no bet depends on says nothing is riding on it', async ({ page }, testInfo) => {
    // a2 is the only belief i2 depends on; point i2 elsewhere and a2 has nothing riding on it.
    await page.evaluate(() => {
      const { store, render } = window.__waypoint;
      store.state.cards.find((c) => c.id === 'i2')!.rests = ['a1'];
      render();
    });
    await page.locator('.card[data-id="a2"] h4').click();
    const d = page.locator('.card[data-id="a2"] .detail');
    await expect(d.locator('h5:has-text("riding") + .none')).toHaveText(
      "none. You believe this but nothing you're building depends on it.",
    );
    await expect(d.locator('h5:has-text("History") + .none')).toHaveText('no changes yet');
    await shot(page, testInfo.project.name, '03-a2-floating');
  });

  test('world and bet cards expand too: signposts, depends on with evidence dots', async ({ page }, testInfo) => {
    await page.locator('.card[data-id="w2"] h4').click();
    const w = page.locator('.card[data-id="w2"] .detail');
    await expect(w.locator('h5')).toHaveText(['Evidence (2)', 'Signposts we set in July', 'History']);
    await expect(w.locator('h5:has-text("Signposts") + ul li')).toHaveCount(4);

    await page.locator('.card[data-id="i1"] h4').click();
    const i = page.locator('.card[data-id="i1"] .detail');
    await expect(i.locator('h5')).toHaveText(['Evidence (0)', 'Depends on', 'History']);
    await expect(i.locator('h5:has-text("Evidence") + .none')).toHaveText(
      "none attached. The bar can't move until there is some.",
    );
    await expect(i.locator('h5:has-text("Depends on") + ul li')).toHaveText([
      'Listeners will let an AI assistant choose for them · evidence ●●●○○',
      'Labels keep licensing on current terms · evidence ●●●○○',
    ]);
    // Evidence dots in the detail use the same mono face as the dots on the cards.
    const ff = await i.locator('.dots').first().evaluate((e) => getComputedStyle(e).fontFamily);
    expect(ff).toMatch(/Mono|mono|Menlo|Consolas|monospace/);
    // Two cards open at once, both in place.
    await expect(page.locator('.detail')).toHaveCount(2);
    await shot(page, testInfo.project.name, '04-w2-i1-open');
    // Nothing spills sideways at any width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('clicking an evidence link does not collapse the card', async ({ page }) => {
    await page.locator('.card[data-id="a1"] h4').click();
    const link = page.locator('.card[data-id="a1"] .detail a').first();
    await link.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
    await link.click();
    await expect(page.locator('.card[data-id="a1"] .detail')).toHaveCount(1);
  });

  test('opening a detail is a toggle on the card, not a full-page jump', async ({ page }) => {
    // Open a4 (last belief), which sits lower on the page; the viewport must not scroll.
    // Bring it into view first so Playwright's own pre-click scroll is not what we measure.
    const a4 = page.locator('.card[data-id="a4"] h4');
    await a4.scrollIntoViewIfNeeded();
    const y0 = await page.evaluate(() => window.scrollY);
    await a4.click();
    await page.locator('.card[data-id="a4"] .detail').waitFor();
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  });
});

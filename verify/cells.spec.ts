import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: `preparing` shows spinner + per-cell note; `proposed` shows old value ghosted
// beside new; `settled` keeps ↑/↓ and accent rule. SPEC §6. A per-frame watcher in the page
// records every phase change per card and the ghost's opacity frame by frame, so the order
// preparing → proposed → settled, the hold, and the fade are measured, not assumed.

type Seen = { id: string; phase: string; at: number; spin: boolean; status: string; note: string; ghost: string; value: string };
type Frame = { at: number; op: number };
type Watch = { events: Seen[]; ghost: Record<string, Frame[]> };

declare global {
  interface Window {
    __cells: Watch;
  }
}

// Flow A touches six cells, in this order: c1, then p2 and p1 (settle together), i1, a1, a4.
const CELLS = ['c1', 'p2', 'p1', 'i1', 'a1', 'a4'] as const;
const STATUS: Record<string, string> = {
  c1: 'Reading the milestone',
  p2: 'Checking which flows changed',
  p1: 'Checking which flows changed',
  i1: 'Recomputing % shipped',
  a1: 'Recomputing what rides on this',
  a4: 'Recomputing what rides on this',
};
const NOTE: Record<string, string> = {
  c1: 'dj/* · 31 files · 5 commits',
  p2: 'screenshots of AI DJ',
  p1: 'screenshots of Home',
  i1: 'from the milestone',
  a1: 'a bet that depends on it just fully shipped',
  a4: 'a bet that depends on it just fully shipped',
};
// Old value ghosted beside the new one while proposed. Code/product cards change only text, so no ghost.
const GHOST: Record<string, [string, string]> = {
  c1: ['', ''],
  p2: ['', ''],
  p1: ['', ''],
  i1: ['60%', '100%'],
  a1: ['1 bet', '2 bets'],
  a4: ['2 bets', '3 bets'],
};
const GHOSTED = ['i1', 'a1', 'a4'];

/** The primary "Try" hint submits Flow A. (`#go` in the intro carries the same text, so scope to the bar.) */
const startFlowA = (page: Page) => page.locator('#hints .hint').filter({ hasText: 'shipped AI DJ v2' }).click();

// Centre the card so it is not under the sticky top bar or the floating prompt bar.
const centre = (l: ReturnType<Page['locator']>) => l.evaluate((el) => el.scrollIntoView({ block: 'center' }));

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/cells/${frame}.${name}.png`, fullPage: false });

const watch = (page: Page) =>
  page.evaluate(() => {
    const w: Watch = { events: [], ghost: {} };
    window.__cells = w;
    const last: Record<string, string> = {};
    let started = false;
    let endedAt = 0;
    const tick = () => {
      const now = performance.now();
      const job = !!window.__waypoint.store.job;
      if (job) started = true;
      if (started && !job && !endedAt) endedAt = now;
      for (const el of document.querySelectorAll<HTMLElement>('.card[data-id]')) {
        const id = el.dataset.id!;
        const phase = el.classList.contains('preparing') ? 'preparing'
          : el.classList.contains('proposed') ? 'proposed'
          : el.classList.contains('changed') ? 'settled'
          : 'idle';
        const g = el.querySelector<HTMLElement>('.fields .ghost');
        if (g) {
          (w.ghost[id] ??= []).push({ at: now, op: parseFloat(getComputedStyle(g).opacity) });
        }
        if (last[id] !== phase) {
          last[id] = phase;
          const status = el.querySelectorAll('.status > span');
          w.events.push({
            id,
            phase,
            at: now,
            spin: !!el.querySelector('.status .spin'),
            status: status[1]?.textContent ?? '',
            note: el.querySelector('.status .note')?.textContent ?? '',
            ghost: g?.textContent ?? '',
            value: g?.parentElement?.textContent?.replace(g.textContent ?? '', '').replace(/[↑↓]/g, '').trim() ?? '',
          });
        }
      }
      // Keep watching until half a second after the run ends, so the last settle is seen.
      if (!endedAt || now - endedAt < 500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const changedIds = (page: Page) =>
  page.evaluate(() => Object.keys(window.__waypoint.store.state.changed).sort());

const noTransient = async (page: Page) => {
  await expect(page.locator('.card.preparing, .card.proposed')).toHaveCount(0);
  await expect(page.locator('.status .spin')).toHaveCount(0);
  await expect(page.locator('.fields .ghost')).toHaveCount(0);
  const keys = await page.evaluate(() =>
    window.__waypoint.store.state.cards.flatMap((c) => Object.keys(c).filter((k) => k.startsWith('_'))),
  );
  expect(keys).toEqual([]);
};

test.describe('cell state machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('preparing → proposed → settled for every touched cell, with note, ghost, arrow and accent', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await watch(page);
    await startFlowA(page);

    // 1 · preparing: thin spinner, status sentence and a per-cell note on the card itself.
    const c1 = page.locator('.card[data-id="c1"]');
    await expect(c1).toHaveClass(/preparing/, { timeout: 10_000 });
    await expect(c1.locator('.status .spin')).toBeVisible();
    await expect(c1.locator('.status')).toContainText(STATUS.c1);
    await expect(c1.locator('.status .note')).toHaveText(NOTE.c1);
    await expect(c1).not.toHaveClass(/changed|proposed/);
    await centre(c1);
    await shot(page, testInfo.project.name, '01-preparing');

    // 2 · proposed: the new value with the old one ghosted beside it, accent on the card.
    const i1 = page.locator('.card[data-id="i1"]');
    await expect(i1).toHaveClass(/proposed/, { timeout: 20_000 });
    await centre(i1);
    const shipped = i1.locator('.fields .v').first();
    await expect(shipped.locator('.ghost')).toHaveText('60%');
    await expect(shipped).toContainText('100%');
    await expect(i1.locator('.status .spin')).toHaveCount(0);
    await expect(i1.locator('.status')).toContainText('60% → 100%');
    const idleCard = page.locator('.card[data-id="i2"]');
    const [accent, plain] = await Promise.all([
      i1.evaluate((el) => ({ border: getComputedStyle(el).borderColor, shadow: getComputedStyle(el).boxShadow })),
      idleCard.evaluate((el) => ({ border: getComputedStyle(el).borderColor, shadow: getComputedStyle(el).boxShadow })),
    ]);
    expect(accent.border).not.toBe(plain.border);
    expect(accent.shadow).not.toBe('none');
    expect(plain.shadow).toBe('none');
    await shot(page, testInfo.project.name, '02-proposed');

    // 3 · settled: ghost gone, ↑ stays on the field that moved, accent rule kept, bar full.
    await expect(i1).not.toHaveClass(/proposed/, { timeout: 5_000 });
    await expect(i1).toHaveClass(/changed/);
    await expect(shipped.locator('.ghost')).toHaveCount(0);
    await expect(shipped.locator('.arrow')).toHaveText('↑');
    await expect(shipped).toHaveText(/^100%\s*↑$/);
    await expect(i1.locator('.pct i')).toHaveAttribute('style', /width:\s*100%/);
    const settled = await i1.evaluate((el) => ({ border: getComputedStyle(el).borderColor, shadow: getComputedStyle(el).boxShadow }));
    expect(settled.border).toBe(accent.border);
    expect(settled.shadow).toBe(accent.shadow);
    await shot(page, testInfo.project.name, '03-settled');

    await expect(page.locator('#job')).toBeHidden({ timeout: 30_000 });
    await noTransient(page);

    // After the run: six changed in state; Product and Code have collapsed, so three cards
    // carry the accent on screen and the other three show as "N changed" on their level line.
    expect(await changedIds(page)).toEqual(['a1', 'a4', 'c1', 'i1', 'p1', 'p2']);
    await expect(page.locator('.card.changed')).toHaveCount(3);
    await expect(page.locator('.level[data-level="product"] .count')).toHaveText('2 changed');
    await expect(page.locator('.level[data-level="code"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="assumptions"] .count')).toHaveText('2 changed');
    await expect(page.locator('.level[data-level="initiatives"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="world"] .count')).toHaveText('');
    await expect(page.locator('.card[data-id="a1"] .fields .v').nth(2)).toHaveText(/^2 bets\s*↑$/);
    await expect(page.locator('.card[data-id="a4"] .fields .v').nth(2)).toHaveText(/^3 bets\s*↑$/);
    await expect(page.locator('.card[data-id="a2"] .fields .v').nth(2)).toHaveText('1 bet'); // a2 is not touched in this build
    await expect(page.locator('.card[data-id="a1"] .arrow')).toHaveCount(1);
    await expect(page.locator('.card[data-id="a4"] .arrow')).toHaveCount(1);
    await expect(page.locator('.card .arrow')).toHaveCount(3); // i1, a1, a4
    await centre(page.locator('.card[data-id="a1"]'));
    await shot(page, testInfo.project.name, '04-after');

    // 4 · the recorded timeline: every cell walked preparing → proposed → settled, in that order.
    // (Code and Product cards enter the DOM already preparing, so `idle` is not always seen.)
    const w = await page.evaluate(() => window.__cells);
    for (const id of CELLS) {
      const ev = w.events.filter((e) => e.id === id && e.phase !== 'idle');
      expect(ev.map((e) => e.phase), id).toEqual(['preparing', 'proposed', 'settled']);
      const [prep, prop, set] = ev;
      expect(prep.spin, `${id} preparing has a spinner`).toBe(true);
      expect(prep.status, `${id} status`).toBe(STATUS[id]);
      expect(prep.note, `${id} note`).toBe(NOTE[id]);
      expect(prop.spin, `${id} proposed has no spinner`).toBe(false);
      expect(prop.ghost, `${id} ghost`).toBe(GHOST[id][0]);
      if (GHOST[id][0]) expect(prop.value, `${id} new value`).toBe(GHOST[id][1]);
      // Hold ≈ TIMING.proposed + TIMING.ghostFade (600 + 300), not shorter than a reader can see.
      const held = set.at - prop.at;
      expect(held, `${id} proposed for ${Math.round(held)}ms`).toBeGreaterThanOrEqual(800);
      expect(held, `${id} proposed for ${Math.round(held)}ms`).toBeLessThanOrEqual(1400);
      expect(set.ghost, `${id} settled has no ghost`).toBe('');
    }
    // Nothing is marked outside the run order: code before product before bets before beliefs,
    // and within a level the first cell starts preparing before the second.
    const firstPrep = CELLS.map((id) => w.events.find((e) => e.id === id && e.phase === 'preparing')!.at);
    expect(firstPrep[0], 'c1 before p2').toBeLessThan(firstPrep[1]);
    expect(firstPrep[1], 'p2 before p1').toBeLessThan(firstPrep[2]);
    expect(firstPrep[2], 'p1 before i1').toBeLessThan(firstPrep[3]);
    expect(firstPrep[3], 'i1 before a1').toBeLessThan(firstPrep[4]);
    expect(firstPrep[4], 'a1 before a4').toBeLessThan(firstPrep[5]);

    // 5 · the ghost fades (200–400ms) rather than vanishing: opacity 1, then a slope, then gone.
    for (const id of GHOSTED) {
      const frames = w.ghost[id];
      expect(frames.length, `${id} ghost frames`).toBeGreaterThan(10);
      expect(frames[0].op).toBe(1);
      const fadeStart = frames.find((f) => f.op < 0.99);
      expect(fadeStart, `${id} ghost never started fading`).toBeTruthy();
      const gone = w.events.find((e) => e.id === id && e.phase === 'settled')!.at;
      const fade = gone - fadeStart!.at;
      expect(fade, `${id} fade took ${Math.round(fade)}ms`).toBeGreaterThanOrEqual(150);
      expect(fade, `${id} fade took ${Math.round(fade)}ms`).toBeLessThanOrEqual(450);
      expect(Math.min(...frames.map((f) => f.op)), `${id} ghost faded out before removal`).toBeLessThan(0.2);
      // It was solid for most of the hold first.
      const proposedAt = w.events.find((e) => e.id === id && e.phase === 'proposed')!.at;
      expect(fadeStart!.at - proposedAt).toBeGreaterThanOrEqual(450);
    }
  });

  test('Esc mid-run: settled cells keep their values, the cell in flight is cleaned up, log says how far', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await startFlowA(page);
    const i1 = page.locator('.card[data-id="i1"]');
    await expect(i1).toHaveClass(/preparing/, { timeout: 20_000 });
    const t0 = Date.now();
    await page.keyboard.press('Escape');
    // Regression: after the window the runner never read the abort flag, so Esc did nothing
    // until the run ended on its own.
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    expect(Date.now() - t0).toBeLessThan(300);
    await expect(page.locator('#log .entry').first().locator('.l.warn').last()).toHaveText('Stopped after 3 of 6 cells.');
    await noTransient(page);
    // What settled stays; what was in flight is untouched.
    expect(await changedIds(page)).toEqual(['c1', 'p1', 'p2']);
    await expect(i1).not.toHaveClass(/changed/);
    await expect(page.locator('.card.changed')).toHaveCount(0); // the three are on collapsed levels
    await expect(i1.locator('.fields .v').first()).toHaveText('60%');
    await expect(i1.locator('.pct i')).toHaveAttribute('style', /width:\s*60%/);
    await expect(page.locator('.card .arrow')).toHaveCount(0);
    // Quiet levels collapse as they do when a run ends; the touched level stays open.
    await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="code"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="product"] .count')).toHaveText('2 changed');
    await expect(page.locator('.level[data-level="code"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="code"] .compact b').first()).toHaveText('Milestone: AI DJ v2');
    await centre(i1);
    await shot(page, testInfo.project.name, '05-stopped-mid-run');
    // The run is over: nothing settles later.
    await page.waitForTimeout(3_000);
    expect(await changedIds(page)).toEqual(['c1', 'p1', 'p2']);
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('#log .entry')).toHaveCount(2);
  });

  test('Stop while a value is proposed keeps it (applied immediately) and drops the ghost', async ({ page }) => {
    test.setTimeout(60_000);
    await startFlowA(page);
    const i1 = page.locator('.card[data-id="i1"]');
    await expect(i1).toHaveClass(/proposed/, { timeout: 20_000 });
    await page.locator('#stop').click();
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    await expect(page.locator('#log .entry').first().locator('.l.warn').last()).toHaveText('Stopped after 4 of 6 cells.');
    await noTransient(page);
    await expect(i1).toHaveClass(/changed/);
    await expect(i1.locator('.fields .v').first()).toHaveText(/^100%\s*↑$/);
    expect(await changedIds(page)).toEqual(['c1', 'i1', 'p1', 'p2']);
    await expect(page.locator('.card.changed')).toHaveCount(1); // i1; the others sit on collapsed levels
    const pct = await page.evaluate(() => window.__waypoint.store.state.cards.find((c) => c.id === 'i1')!.pct);
    expect(pct).toBe(100);
  });
});

test.describe('cell state machine · reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('ghost goes at once, no fade; order and hold unchanged', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.locator('.level').first().waitFor();
    await watch(page);
    await startFlowA(page);
    await expect(page.locator('#job')).toBeVisible();
    await expect(page.locator('#job')).toBeHidden({ timeout: 40_000 });
    const w = await page.evaluate(() => window.__cells);
    for (const id of CELLS) {
      const ev = w.events.filter((e) => e.id === id && e.phase !== 'idle');
      expect(ev.map((e) => e.phase), id).toEqual(['preparing', 'proposed', 'settled']);
    }
    for (const id of GHOSTED) {
      const frames = w.ghost[id];
      // Every recorded frame is fully opaque or fully transparent: no slope.
      expect(frames.every((f) => f.op === 1 || f.op === 0), `${id} ghost opacities ${[...new Set(frames.map((f) => f.op))]}`).toBe(true);
      const transparent = frames.filter((f) => f.op === 0);
      if (transparent.length) {
        const gone = w.events.find((e) => e.id === id && e.phase === 'settled')!.at;
        expect(gone - transparent[0].at).toBeLessThanOrEqual(400);
      }
    }
  });
});

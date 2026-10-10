import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: levels touched by a run expand; Product and Code collapse again when the run
// ends. SPEC §3 ("Levels a run touches expand during the run; Product and Code collapse again
// when the run ends. The stack should breathe.") and §8 Flow A. A per-frame watcher records
// each level's open/compact state and the phase of every card on it, so "expands when its
// first cell prepares, not before" and "collapses on the frame the header hides" are measured.

type LevelId = 'world' | 'assumptions' | 'initiatives' | 'product' | 'code';
type Change = { level: LevelId; open: boolean; at: number };
type Phase = { id: string; level: LevelId; phase: string; at: number };
type Watch = { changes: Change[]; phases: Phase[]; jobHiddenAt: number; jobShownAt: number; frames: number };

declare global {
  interface Window {
    __levels: Watch;
  }
}

const LEVELS: LevelId[] = ['world', 'assumptions', 'initiatives', 'product', 'code'];
const FEW_FRAMES = 60;

const centre = (l: ReturnType<Page['locator']>) => l.evaluate((el) => el.scrollIntoView({ block: 'center' }));

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/levels/${frame}.${name}.png`, fullPage: false });

/** The primary hint: "You shipped something · shipped AI DJ v2". Starts Flow A. */
const ship = async (page: Page) => {
  const hint = page.locator('#hints .hint.primary');
  await expect(hint).toContainText('shipped AI DJ v2');
  await hint.click();
};

const watch = (page: Page) =>
  page.evaluate(() => {
    const w: Watch = { changes: [], phases: [], jobHiddenAt: 0, jobShownAt: 0, frames: 0 };
    window.__levels = w;
    const lastOpen: Record<string, boolean | undefined> = {};
    const lastPhase: Record<string, string> = {};
    let endedAt = 0;
    const tick = () => {
      const now = performance.now();
      w.frames++;
      const job = document.querySelector<HTMLElement>('#job');
      const shown = !!job && !job.hidden && getComputedStyle(job).display !== 'none';
      if (shown && !w.jobShownAt) w.jobShownAt = now;
      if (w.jobShownAt && !shown && !w.jobHiddenAt) w.jobHiddenAt = now;
      for (const el of document.querySelectorAll<HTMLElement>('.level[data-level]')) {
        const level = el.dataset.level as LevelId;
        const open = !!el.querySelector('.cards') && !el.querySelector('.compact');
        if (lastOpen[level] !== open) {
          lastOpen[level] = open;
          w.changes.push({ level, open, at: now });
        }
        for (const card of el.querySelectorAll<HTMLElement>('.card[data-id]')) {
          const id = card.dataset.id!;
          const phase = card.classList.contains('preparing') ? 'preparing'
            : card.classList.contains('proposed') ? 'proposed'
            : card.classList.contains('changed') ? 'settled'
            : 'idle';
          if (lastPhase[id] !== phase) {
            lastPhase[id] = phase;
            w.phases.push({ id, level, phase, at: now });
          }
        }
      }
      if (w.jobHiddenAt && !endedAt) endedAt = now;
      if (!endedAt || now - endedAt < 800) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const openAt = (w: Watch, level: LevelId, open: boolean) =>
  w.changes.filter((c) => c.level === level && c.open === open).map((c) => c.at);

const phaseAt = (w: Watch, id: string, phase: string) => w.phases.find((p) => p.id === id && p.phase === phase)!.at;

const expanded = (page: Page) =>
  page.evaluate(() => ({ ...window.__waypoint.store.state.expanded }));

test.describe('levels expand for a run and collapse after', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.level').first().waitFor();
  });

  test('Code and Product open on the frame their first cell prepares, stay open through settle, close with the header', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const product = page.locator('.level[data-level="product"]');
    const code = page.locator('.level[data-level="code"]');

    // First load: three open, two compact (SPEC §3).
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: false, code: false });
    await expect(product.locator('.compact')).toBeVisible();
    await expect(code.locator('.compact')).toBeVisible();
    await expect(product.locator('.cards')).toHaveCount(0);

    await watch(page);
    await ship(page);

    // Sizing and the intervene window change nothing about which levels are open.
    await expect(page.locator('#job')).toBeVisible();
    await expect(page.locator('.level.scanning')).toHaveCount(5);
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: false, code: false });
    await expect(product.locator('.compact')).toBeVisible();

    // 1 · Code opens as c1 starts preparing: its card appears already in `preparing`.
    const c1 = page.locator('.card[data-id="c1"]');
    await expect(c1).toHaveClass(/preparing/, { timeout: 10_000 });
    await expect(code.locator('.compact')).toHaveCount(0);
    await expect(code.locator('.cards .card')).toHaveCount(1);
    await expect(product.locator('.compact')).toBeVisible(); // Product waits for its own turn
    await centre(code);
    await shot(page, testInfo.project.name, '01-code-opens');

    // 2 · Product opens as p2 (AI DJ, its first cell) starts preparing; Code stays open with its settled card.
    const p2 = page.locator('.card[data-id="p2"]');
    await expect(p2).toHaveClass(/preparing/, { timeout: 10_000 });
    await expect(product.locator('.compact')).toHaveCount(0);
    await expect(product.locator('.cards .card')).toHaveCount(3);
    await expect(code.locator('.cards .card')).toHaveCount(1);
    await expect(c1).toHaveClass(/changed/);
    await centre(product);
    await shot(page, testInfo.project.name, '02-product-opens');

    // 3 · While the run walks up to Assumptions, both stay open: the stack shows the whole ripple.
    const a1 = page.locator('.card[data-id="a1"]');
    await expect(a1).toHaveClass(/preparing/, { timeout: 20_000 });
    await expect(product.locator('.cards .card')).toHaveCount(3);
    await expect(code.locator('.cards .card')).toHaveCount(1);
    await expect(page.locator('.card.changed')).toHaveCount(4); // c1, p1, p2, i1
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: true, code: true });

    // 4 · Run ends: Product and Code are compact again, with the new notes on the line.
    await expect(page.locator('#job')).toBeHidden({ timeout: 30_000 });
    await expect(product.locator('.compact')).toBeVisible();
    await expect(code.locator('.compact')).toBeVisible();
    await expect(product.locator('.cards')).toHaveCount(0);
    await expect(code.locator('.cards')).toHaveCount(0);
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: false, code: false });
    await expect(code.locator('.compact')).toContainText('Milestone: AI DJ v2 · 31 files · dj/* · Oct 2026');
    await expect(product.locator('.compact')).toContainText('AI DJ · v2: takes requests in natural language, remembers context');
    await expect(product.locator('.compact')).toContainText('Home feed · AI DJ now the first shelf on Home');
    await expect(product.locator('.compact')).toContainText('Artist profile · bio, credits, verification');
    await expect(product.locator('.compact button[data-expand="product"]')).toHaveText('show');
    await expect(code.locator('.compact button[data-expand="code"]')).toHaveText('show');
    // The three open levels still show their cards; two of them carry the accent.
    await expect(page.locator('.level[data-level="assumptions"] .cards .card')).toHaveCount(4);
    await expect(page.locator('.level[data-level="initiatives"] .cards .card')).toHaveCount(3);
    await expect(page.locator('.level[data-level="world"] .cards .card')).toHaveCount(2);
    await centre(product);
    await shot(page, testInfo.project.name, '03-collapsed-after');

    // 5 · The recorded timeline.
    await page.waitForTimeout(900);
    const w = await page.evaluate(() => window.__levels);
    expect(w.frames).toBeGreaterThan(100);
    expect(w.jobShownAt).toBeGreaterThan(0);
    expect(w.jobHiddenAt).toBeGreaterThan(w.jobShownAt);
    // World, Assumptions, Initiatives: open on the first frame and never change.
    for (const level of ['world', 'assumptions', 'initiatives'] as LevelId[]) {
      const ch = w.changes.filter((c) => c.level === level);
      expect(ch.map((c) => c.open), level).toEqual([true]);
    }
    // Product and Code: compact → open → compact, exactly once each.
    for (const level of ['product', 'code'] as LevelId[]) {
      const ch = w.changes.filter((c) => c.level === level);
      expect(ch.map((c) => c.open), level).toEqual([false, true, false]);
    }
    const [codeOpen] = openAt(w, 'code', true);
    const [productOpen] = openAt(w, 'product', true);
    const [codeClose] = openAt(w, 'code', false).slice(-1);
    const [productClose] = openAt(w, 'product', false).slice(-1);
    // Opens on the frame its first cell prepares, not before: the card is first seen preparing.
    expect(w.phases.find((p) => p.id === 'c1')!.phase).toBe('preparing');
    expect(w.phases.find((p) => p.id === 'p2')!.phase).toBe('preparing');
    expect(Math.abs(codeOpen - phaseAt(w, 'c1', 'preparing')), 'code opens with c1 preparing').toBeLessThanOrEqual(FEW_FRAMES);
    expect(Math.abs(productOpen - phaseAt(w, 'p2', 'preparing')), 'product opens with p2 preparing').toBeLessThanOrEqual(FEW_FRAMES);
    // p1 (Home) is on the level p2 opened, so it is first seen idle and starts preparing after Product opened.
    expect(w.phases.find((p) => p.id === 'p1')!.phase).toBe('idle');
    expect(phaseAt(w, 'p1', 'preparing')).toBeGreaterThan(productOpen);
    expect(phaseAt(w, 'p1', 'preparing')).toBeGreaterThan(phaseAt(w, 'p2', 'preparing'));
    // Not before the plan is shown: both open after the header appears, Code first, in run order.
    expect(codeOpen).toBeGreaterThan(w.jobShownAt);
    expect(productOpen).toBeGreaterThan(codeOpen);
    expect(productOpen).toBeGreaterThan(phaseAt(w, 'c1', 'settled'));
    // Stays open through its cells' settle and through the rest of the run.
    expect(codeClose).toBeGreaterThan(phaseAt(w, 'c1', 'settled'));
    expect(productClose).toBeGreaterThan(phaseAt(w, 'p2', 'settled'));
    expect(productClose).toBeGreaterThan(phaseAt(w, 'p1', 'settled'));
    expect(productClose).toBeGreaterThan(phaseAt(w, 'a4', 'settled'));
    // Closes on the frame the header hides.
    expect(Math.abs(codeClose - w.jobHiddenAt), 'code closes with the header').toBeLessThanOrEqual(FEW_FRAMES);
    expect(Math.abs(productClose - w.jobHiddenAt), 'product closes with the header').toBeLessThanOrEqual(FEW_FRAMES);
    expect(Math.abs(productClose - codeClose)).toBeLessThanOrEqual(FEW_FRAMES);
    testInfo.annotations.push({
      type: 'level timing ms',
      description: JSON.stringify({
        codeOpenVsC1: Math.round(codeOpen - phaseAt(w, 'c1', 'preparing')),
        productOpenVsP2: Math.round(productOpen - phaseAt(w, 'p2', 'preparing')),
        codeCloseVsHeader: Math.round(codeClose - w.jobHiddenAt),
        productCloseVsHeader: Math.round(productClose - w.jobHiddenAt),
      }),
    });

    // 6 · "expand" after the run reopens the level with its changed cards and accents intact.
    await product.locator('button[data-expand="product"]').click();
    await expect(product.locator('.cards .card')).toHaveCount(3);
    await expect(product.locator('.card.changed')).toHaveCount(2);
    await expect(product.locator('.card[data-id="p1"] .status')).toContainText('DJ promoted');
    await expect(product.locator('.card[data-id="p2"] .status')).toContainText('v2 shipped');
    await expect(code.locator('.compact')).toBeVisible(); // only the clicked level opens
    await centre(product);
    await shot(page, testInfo.project.name, '04-reopened');
    // Opening a level after the run does not start one or mark anything.
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('.card.preparing, .card.proposed')).toHaveCount(0);
  });

  test('Esc during the window: no level opens or closes', async ({ page }) => {
    test.setTimeout(30_000);
    await watch(page);
    await ship(page);
    await expect(page.locator('#job')).toContainText('Reaches 4 levels', { timeout: 5_000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    await page.waitForTimeout(1_000);
    const w = await page.evaluate(() => window.__levels);
    for (const level of LEVELS) {
      const ch = w.changes.filter((c) => c.level === level);
      expect(ch.length, `${level} changed open state`).toBe(1); // the first frame only
    }
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: false, code: false });
    await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="code"] .compact')).toBeVisible();
  });

  test('Stop mid-run: the touched levels that are quiet by default close at once', async ({ page }) => {
    test.setTimeout(60_000);
    await watch(page);
    await ship(page);
    const p2 = page.locator('.card[data-id="p2"]');
    await expect(p2).toHaveClass(/preparing/, { timeout: 20_000 });
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: true, code: true });
    await page.locator('#stop').click();
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    expect(await expanded(page)).toEqual({ world: true, assumptions: true, initiatives: true, product: false, code: false });
    await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="code"] .compact')).toBeVisible();
    // The stopped cells' text is on the compact line: Code changed, Product did not.
    await expect(page.locator('.level[data-level="code"] .compact')).toContainText('Milestone: AI DJ v2');
    await expect(page.locator('.level[data-level="product"] .compact')).not.toContainText('takes requests in natural language');
    await expect(page.locator('.level[data-level="product"] .compact')).toContainText('AI DJ · voice host, on-demand sessions');
    await page.waitForTimeout(900);
    const w = await page.evaluate(() => window.__levels);
    expect(w.changes.filter((c) => c.level === 'product').map((c) => c.open)).toEqual([false, true, false]);
    expect(w.changes.filter((c) => c.level === 'code').map((c) => c.open)).toEqual([false, true, false]);
    const [productClose] = openAt(w, 'product', false).slice(-1);
    expect(Math.abs(productClose - w.jobHiddenAt)).toBeLessThanOrEqual(FEW_FRAMES);
  });
});

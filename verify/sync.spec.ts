import { test, expect, type Page } from '@playwright/test';

// CHECKS.md: log line for each cell appears in sync with that cell settling (assert ordering).
// SPEC §6: "the log line for this cell appears in sync with the settle". A per-frame watcher
// timestamps every phase change on every card and every line that lands in the run's log
// entry, so "in sync" is measured: the line is never on screen before its cell is settled,
// and it is there within a few frames after.

type Ev = { id: string; phase: string; at: number };
type Line = { text: string; cls: string; at: number };
type Watch = { events: Ev[]; lines: Line[] };

declare global {
  interface Window {
    __sync: Watch;
  }
}

// Each log line of Flow A, in order, with the cells it reports on (none for the preamble/coda).
const LINES: { starts: string; cells: string[] }[] = [
  { starts: 'Sizing the change…', cells: [] },
  { starts: 'Reaches 4 levels, moving up from Code.', cells: [] },
  { starts: 'Code: dj/*, 31 files', cells: ['c1'] },
  { starts: 'Product: AI DJ and Home changed.', cells: ['p2', 'p1'] },
  { starts: 'Bet “AI DJ v2” is now fully shipped (60% → 100%).', cells: ['i1'] },
  { starts: 'Belief “Listeners will let an AI assistant choose for them”: more is riding on it now.', cells: ['a1'] },
  { starts: 'Belief “Labels keep licensing on current terms” now carries 3 bets', cells: ['a4'] },
  { starts: 'World: no scenario moved.', cells: [] },
];
// A few frames: the settle's render and the line's append share a task, so the gap is ~0 in
// practice; the bound leaves room for a busy machine running four browsers.
const FEW_FRAMES = 150;

/** The primary "Try" hint submits Flow A. (`#go` in the intro carries the same text, so scope to the bar.) */
const startFlowA = (page: Page) => page.locator('#hints .hint').filter({ hasText: 'shipped AI DJ v2' }).click();

const shot = (page: Page, name: string, frame: string) =>
  page.screenshot({ path: `verify/shots/sync/${frame}.${name}.png`, fullPage: false });

const watch = (page: Page) =>
  page.evaluate(() => {
    const w: Watch = { events: [], lines: [] };
    window.__sync = w;
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
        if (last[id] !== phase) {
          last[id] = phase;
          w.events.push({ id, phase, at: now });
        }
      }
      // The run's entry is the newest one of kind "you shipped"; lines are appended to it.
      // (`.level-head .entry` also exists, so the log's entries are scoped to #log.)
      const entry = [...document.querySelectorAll('#log .entry')].find(
        (e) => e.querySelector('.eh .kind')?.textContent === 'you shipped',
      );
      if (entry) {
        const ls = entry.querySelectorAll<HTMLElement>('.l');
        for (let i = w.lines.length; i < ls.length; i++) {
          w.lines.push({ text: ls[i].textContent ?? '', cls: ls[i].className, at: now });
        }
      }
      if (!endedAt || now - endedAt < 500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const at = (w: Watch, id: string, phase: string): number => {
  const e = w.events.find((x) => x.id === id && x.phase === phase);
  expect(e, `${id} was never ${phase}`).toBeTruthy();
  return e!.at;
};

test.describe('log line in sync with the settle', () => {
  test('each line lands the frame its cell settles, never before, in run order', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.locator('.level').first().waitFor();
    await watch(page);
    await startFlowA(page);

    // Screenshot the moment a1 settles: its line is in the log, a4 is still preparing.
    const a1 = page.locator('.card[data-id="a1"]');
    await expect(a1).toHaveClass(/proposed/, { timeout: 40_000 });
    await expect(a1).not.toHaveClass(/proposed/, { timeout: 5_000 });
    await expect(a1).toHaveClass(/changed/);
    const entry = page.locator('#log .entry').first();
    await expect(entry.locator('.eh .kind')).toHaveText('you shipped');
    await expect(entry.locator('.eh b')).toHaveText('shipped AI DJ v2');
    await expect(entry.locator('.eh .t')).toHaveText(/^\d\d:\d\d$/);
    await expect(entry.locator('.l').nth(5)).toContainText('Belief “Listeners will let an AI assistant choose for them”: more is riding on it now.');
    await expect(entry.locator('.l')).toHaveCount(6);
    const phone = testInfo.project.name.startsWith('phone');
    if (phone) {
      await a1.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await shot(page, testInfo.project.name, '01-a1-settled');
      await entry.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await shot(page, testInfo.project.name, '02-a1-line');
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, testInfo.project.name, '01-a1-settled');
    }

    await expect(page.locator('#job')).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(600);
    const w = await page.evaluate(() => window.__sync);

    // 1 · the lines, in order, exactly these.
    expect(w.lines.length, w.lines.map((l) => l.text).join('\n')).toBe(LINES.length);
    for (const [i, L] of LINES.entries()) expect(w.lines[i].text.startsWith(L.starts), `line ${i}: ${w.lines[i].text}`).toBe(true);
    for (let i = 1; i < w.lines.length; i++) expect(w.lines[i].at).toBeGreaterThanOrEqual(w.lines[i - 1].at);

    // 2 · the preamble is on screen before any cell starts preparing.
    const firstPrep = Math.min(...w.events.filter((e) => e.phase === 'preparing').map((e) => e.at));
    expect(w.lines[1].at).toBeLessThan(firstPrep);

    // 3 · each cell's line: not before the settle, and within a few frames after it.
    const gaps: Record<string, number> = {};
    for (const [i, L] of LINES.entries()) {
      if (!L.cells.length) continue;
      const line = w.lines[i];
      for (const id of L.cells) {
        const settled = at(w, id, 'settled');
        const proposed = at(w, id, 'proposed');
        expect(line.at, `${L.starts} line before ${id} was proposed`).toBeGreaterThanOrEqual(proposed);
        expect(line.at, `${L.starts} line before ${id} settled`).toBeGreaterThanOrEqual(settled);
        gaps[id] = line.at - settled;
        expect(gaps[id], `${id} line ${Math.round(gaps[id])}ms after settle`).toBeLessThanOrEqual(FEW_FRAMES);
        // On the frame the line appeared, this cell was already settled (its last phase change).
        const lastPhase = w.events.filter((e) => e.id === id && e.at <= line.at).pop()!;
        expect(lastPhase.phase, `${id} phase when its line appeared`).toBe('settled');
      }
      // The next level starts only after this line has landed (levels run in sequence; cells
      // within a level, like a1 and a4, prepare together).
      const next = LINES[i + 1];
      if (next?.cells.length && next.cells[0][0] !== L.cells[0][0]) {
        expect(at(w, next.cells[0], 'preparing'), `${next.cells[0]} prepared before the ${L.starts} line`).toBeGreaterThan(line.at);
      }
    }
    testInfo.annotations.push({ type: 'settle→line ms', description: JSON.stringify(Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, Math.round(v)]))) });

    // 4 · one line for two flows: p2 and p1 are proposed and settled together, so neither
    // sits settled with no line. (Regression: p2 settled 900ms after p1, so p1's line was late.)
    expect(Math.abs(at(w, 'p1', 'proposed') - at(w, 'p2', 'proposed'))).toBeLessThanOrEqual(50);
    expect(Math.abs(at(w, 'p1', 'settled') - at(w, 'p2', 'settled'))).toBeLessThanOrEqual(50);
    // Two cells with their own lines settle in sequence: a4 settles after the a1 line.
    expect(at(w, 'a4', 'settled')).toBeGreaterThan(w.lines[5].at);

    // 5 · the coda follows the last cell and nothing lands after the run ends.
    expect(w.lines[7].at).toBeGreaterThan(at(w, 'a4', 'settled'));
    expect(w.lines[7].cls).toBe('l');
    expect(w.lines[6].cls).toBe('l warn');
    expect(w.lines[4].cls).toBe('l sig');
    expect(w.lines[1].cls).toBe('l sig');
    await expect(entry.locator('.l')).toHaveCount(8);
  });

  test('Stop while two cells settle together ends both at once', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.locator('.level').first().waitFor();
    await startFlowA(page);
    const p2 = page.locator('.card[data-id="p2"]');
    await expect(p2).toHaveClass(/proposed/, { timeout: 20_000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden({ timeout: 1_000 });
    await expect(page.locator('#log .entry').first().locator('.l.warn').last()).toHaveText('Stopped after 3 of 6 cells.');
    // Regression: only the last pause in flight was woken, so the other cell's settle ran on
    // after the stop and re-rendered the stack ~900ms later.
    const mutations = await page.evaluate(() => {
      let n = 0;
      const mo = new MutationObserver((ms) => { n += ms.length; });
      mo.observe(document.querySelector('.stack')!, { childList: true, subtree: true, attributes: true, characterData: true });
      return new Promise<number>((r) => setTimeout(() => { mo.disconnect(); r(n); }, 1500));
    });
    expect(mutations).toBe(0);
    await expect(page.locator('.card.preparing, .card.proposed')).toHaveCount(0);
    const keys = await page.evaluate(() =>
      window.__waypoint.store.state.cards.flatMap((c) => Object.keys(c).filter((k) => k.startsWith('_'))),
    );
    expect(keys).toEqual([]);
    await expect(page.locator('#log .entry').first().locator('.l')).toHaveCount(4); // sizing, reaches, code, stopped
  });
});

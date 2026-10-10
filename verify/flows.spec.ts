// SPEC §8 Flows B–G, end to end, with a screenshot per named step at every viewport.
// Flow A has its own coverage in cells/sync/levels/job; this file drives the rest through
// the same public surface a person uses: the Try actions, the bar, the top-bar buttons.
import { test, expect, type Page, type TestInfo } from '@playwright/test';

const shot = (page: Page, info: TestInfo, flow: string, name: string, full = false) =>
  page.screenshot({ path: `verify/shots/${flow}/${name}.${info.project.name}.png`, fullPage: full });

const hint = (page: Page, text: string) => page.locator('#hints .hint', { hasText: text });
const entry = (page: Page) => page.locator('#log .entry').first();
const card = (page: Page, id: string) => page.locator(`.card[data-id="${id}"]`);
const field = (page: Page, id: string, k: string) =>
  card(page, id).locator('.fields .k', { hasText: new RegExp(`^${k}$`) }).locator('+ .v');

async function waitRunEnd(page: Page): Promise<void> {
  await expect(page.locator('#job')).toBeVisible();
  await expect(page.locator('#job')).toBeHidden({ timeout: 45000 });
}

test.describe('flow B · world, top-down', () => {
  test('the signpost moves, the belief loses evidence, two bets go fragile', async ({ page }, info) => {
    test.setTimeout(90000);
    await page.goto('/');
    await hint(page, 'world update').click();
    const e = entry(page);
    await expect(e.locator('.kind')).toHaveText('the world moved');
    await expect(e.locator('.eh b')).toHaveText('a label changes its AI licensing terms');
    await expect(e.locator('.l').first()).toContainText('Simulated signal for the demo');
    await expect(page.locator('#jobtitle')).toHaveText('Sizing the change…');
    await shot(page, info, 'world', '01-sizing');
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 3 levels · moving down from World', { timeout: 5000 });
    await expect(page.locator('#jobmeta')).toContainText('Will touch: 1 scenario, 1 belief, 2 bets.');
    await expect(page.locator('.level[data-level="world"] [data-entry]')).toHaveText('starts here');
    await shot(page, info, 'world', '02-plan');

    // w2: 1/4 → 2/4, watch → rising, arrow up
    await expect(field(page, 'w2', 'signposts')).toContainText('2 / 4 moved', { timeout: 10000 });
    await expect(card(page, 'w2').locator('.chip')).toHaveText('rising');
    await expect(card(page, 'w2').locator('.arrow')).toHaveText('↑');
    await expect(page.locator('.level[data-level="world"]')).toHaveClass(/touched/);
    await shot(page, info, 'world', '03-scenario-rising');

    // a4: evidence 3 → 1, belief unchanged, ⚠ gap, warn line with a source
    await expect(field(page, 'a4', 'evidence')).toContainText('●○○○○', { timeout: 10000 });
    await expect(field(page, 'a4', 'our belief')).toContainText('●●●●○');
    await expect(card(page, 'a4').locator('.flag')).toHaveText('⚠');
    const gapLine = e.locator('.l.warn', { hasText: 'The gap is now 3' });
    await expect(gapLine).toBeVisible({ timeout: 5000 });
    await expect(gapLine.locator('a')).toHaveText('source');
    await shot(page, info, 'world', '04-evidence-gap');

    // i3: trigger fired, fragile; i1: fragile
    await expect(card(page, 'i3').locator('.chip')).toHaveText('fragile', { timeout: 10000 });
    await expect(field(page, 'i3', 'trigger')).toContainText('⚑ fired');
    await expect(card(page, 'i1').locator('.chip')).toHaveText('fragile', { timeout: 5000 });
    await shot(page, info, 'world', '05-bets-fragile');

    await waitRunEnd(page);
    await expect(e.locator('.l', { hasText: 'What happened last time: app stores' }).locator('a')).toHaveText('source');
    await expect(e.locator('.l').last()).toHaveText('Product and Code: unchanged. The world moved; your position did not.');
    // Product and Code are untouched: still collapsed, no changed count
    await expect(page.locator('.level[data-level="product"] .compact')).toBeVisible();
    await expect(page.locator('.level[data-level="product"] .count')).toHaveText('');
    await expect(page.locator('.level[data-level="code"] .count')).toHaveText('');
    await expect(page.locator('.level[data-level="world"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="assumptions"] .count')).toHaveText('1 changed');
    await expect(page.locator('.level[data-level="initiatives"] .count')).toHaveText('2 changed');
    await shot(page, info, 'world', '06-end', true);
  });
});

test.describe('flow C · inspect', () => {
  test('three lines, then Flow A with the prompt it wrote', async ({ page }, info) => {
    test.setTimeout(90000);
    await page.goto('/');
    await hint(page, 'look at the repo').click();
    const inspect = page.locator('#log .entry', { has: page.locator('.kind', { hasText: 'inspect' }) });
    await expect(inspect.locator('.l')).toHaveCount(3, { timeout: 5000 });
    await expect(inspect.locator('.l').nth(0)).toContainText('Reading the repo');
    await expect(inspect.locator('.l').nth(1)).toContainText('taking screenshots');
    await expect(inspect.locator('.l').nth(2)).toContainText('Wrote the prompt for you');
    await expect(inspect.locator('.l').nth(2)).toHaveClass(/sig/);
    await shot(page, info, 'inspect', '01-three-lines');
    // The milestone entry it starts is a separate, newer entry with the repo title.
    const e = entry(page);
    await expect(e.locator('.kind')).toHaveText('you shipped', { timeout: 5000 });
    await expect(e.locator('.eh b')).toHaveText('shipped AI DJ v2 (from the repo)');
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 4 levels · moving up from Code', { timeout: 5000 });
    await shot(page, info, 'inspect', '02-flow-a-starts');
    await waitRunEnd(page);
    await expect(field(page, 'i1', 'shipped')).toContainText('100%');
    await shot(page, info, 'inspect', '03-end');
  });
});

test.describe('flow D · ask', () => {
  test('one entry, a highlight, nothing changes, no job header', async ({ page }, info) => {
    await page.goto('/');
    const before = await page.evaluate(() => JSON.stringify((window as any).__waypoint.store.state));
    await hint(page, 'why is the API fragile?').click();
    const e = entry(page);
    await expect(e.locator('.kind')).toHaveText('you asked');
    await expect(card(page, 'i3')).toHaveClass(/hl/);
    await expect(e.locator('.l')).toHaveCount(1);
    await expect(e.locator('.l')).toContainText('“Open listening-history API for agents” is');
    await expect(e.locator('.l')).toContainText('Nothing changed.');
    await expect(page.locator('#job')).toBeHidden();
    await shot(page, info, 'ask', '01-highlight');
    const after = await page.evaluate(() => JSON.stringify((window as any).__waypoint.store.state));
    expect(after).toBe(before);
    await expect(card(page, 'i3')).not.toHaveClass(/hl/, { timeout: 5000 });
    await shot(page, info, 'ask', '02-highlight-gone');
  });

  test('a question that matches nothing says so', async ({ page }) => {
    await page.goto('/');
    await page.fill('#prompt', 'what about the moon?');
    await page.press('#prompt', 'Enter');
    const e = entry(page);
    await expect(e.locator('.l.warn')).toHaveText('No card matches that question. Nothing changed.');
    await expect(page.locator('#prompt')).toHaveValue('');
  });
});

test.describe('flow E · unmatched', () => {
  test('exactly one dashed unplaced belief, nothing else touched', async ({ page }, info) => {
    test.setTimeout(60000);
    await page.goto('/');
    const cardsBefore = await page.locator('.card').count();
    await hint(page, 'listeners will pay extra').click();
    const e = entry(page);
    await expect(e.locator('.kind')).toHaveText('you said');
    await expect(page.locator('#jobtitle')).toHaveText('Reaches 1 level · moving down from World', { timeout: 5000 });
    await expect(page.locator('#jobmeta')).toContainText('Will touch: nothing in the stack matches this.');
    await shot(page, info, 'unplaced', '01-plan');
    await waitRunEnd(page);
    const u = page.locator('.card.unplaced');
    await expect(u).toHaveCount(1);
    await expect(u).toHaveCSS('border-style', 'dashed');
    await expect(u.locator('h4')).toHaveText('listeners will pay extra for human-only playlists');
    await expect(u.locator('.chip')).toHaveText('unplaced');
    await expect(u.locator('.fields .v').nth(0)).toHaveText('○○○○○');
    await expect(u.locator('.fields .v').nth(1)).toHaveText('○○○○○');
    await expect(u.locator('.fields .v').nth(2)).toHaveText('0 bets');
    await expect(u.locator('.status .note')).toHaveText('where does this belong?');
    await expect(page.locator('.level[data-level="assumptions"] .card')).toHaveCount(5);
    await expect(page.locator('.card')).toHaveCount(cardsBefore + 1);
    await expect(page.locator('.card.changed')).toHaveCount(1);
    await expect(e.locator('.l.warn')).toContainText('Added one unplaced belief with no evidence and no belief score. Nothing else was touched.');
    await expect(e.locator('.l').last()).toContainText('Next: attach a source, link a bet to it, or delete it.');
    await shot(page, info, 'unplaced', '02-one-card', true);
  });
});

test.describe('flow F · snapshots', () => {
  test('save adds a chip and counts; compare ghosts old values; Jul is read-only; now returns', async ({ page }, info) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.evaluate(() => { void (window as any).__waypoint.runMilestone('shipped AI DJ v2'); });
    await waitRunEnd(page);
    await page.evaluate(() => { void (window as any).__waypoint.runWorld(); });
    await waitRunEnd(page);

    // Save: a new chip named by today's date, a log entry with the counts, marks cleared.
    await page.click('#save');
    await expect(page.locator('#snaps .snap')).toHaveCount(3);
    const name = await page.locator('#snaps .snap').nth(1).textContent();
    const e = entry(page);
    await expect(e.locator('.kind')).toHaveText('snapshot');
    await expect(e.locator('.eh b')).toHaveText(name!);
    await expect(e.locator('.l')).toContainText('Saved. 8 cards changed since “Jul”.');
    await expect(e.locator('.l')).toContainText('2 beliefs');
    await expect(e.locator('.l')).toContainText('out of step with the evidence.');
    await expect(e.locator('.l')).toHaveClass(/warn/);
    await expect(page.locator('.card.changed')).toHaveCount(0);
    await expect(page.locator('.level .count.changed')).toHaveCount(0);
    await expect(page.locator('.level.touched')).toHaveCount(0);
    await shot(page, info, 'snapshots', '01-saved');

    // Compare against the new snapshot: nothing differs yet, so no ghosts.
    await page.click('#cmp');
    await expect(page.locator('#cmp')).toHaveClass(/on/);
    await expect(page.locator('.ghost')).toHaveCount(0);
    await page.click('#cmp');

    // A further run, then compare: the old values are struck through beside the new ones.
    await page.evaluate(() => { void (window as any).__waypoint.runUnplaced('listeners will pay extra for human-only playlists'); });
    await waitRunEnd(page);
    await page.click('#cmp');
    await expect(page.locator('#cmp')).toHaveClass(/on/);
    // The unplaced card is new, so it has no baseline; compare shows ghosts only for moved fields.
    await expect(page.locator('.ghost')).toHaveCount(0);
    await page.click('#cmp');

    // Viewing Jul is read-only: the banner, the baseline values, the bar dimmed.
    await page.locator('#snaps .snap', { hasText: 'Jul' }).click();
    await expect(page.locator('#ro')).toBeVisible();
    await expect(page.locator('#ro')).toHaveText('Viewing the “Jul” snapshot, read-only. Click “now” to come back.');
    await expect(field(page, 'i1', 'shipped')).toHaveText('60%');
    await expect(field(page, 'a4', 'evidence')).toContainText('●●●○○');
    await expect(page.locator('.card.unplaced')).toHaveCount(0);
    await expect(page.locator('#form')).toHaveClass(/off/);
    await page.fill('#prompt', 'shipped AI DJ v2');
    await page.press('#prompt', 'Enter');
    await expect(page.locator('#job')).toBeHidden();
    await shot(page, info, 'snapshots', '02-viewing-jul');

    // now: back to the live state.
    await page.locator('#snaps .snap.now').click();
    await expect(page.locator('#ro')).toBeHidden();
    await expect(field(page, 'i1', 'shipped')).toHaveText('100%');
    await expect(page.locator('.card.unplaced')).toHaveCount(1);
    await expect(page.locator('#form')).not.toHaveClass(/off/);
    await shot(page, info, 'snapshots', '03-back-to-now');
  });

  test('compare after a run and before a save ghosts every moved value against Jul', async ({ page }, info) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.evaluate(() => { void (window as any).__waypoint.runMilestone('shipped AI DJ v2'); });
    await waitRunEnd(page);
    await page.click('#cmp');
    await expect(field(page, 'i1', 'shipped').locator('.ghost')).toHaveText('60%');
    await expect(field(page, 'i1', 'shipped')).toContainText('100%');
    await expect(field(page, 'a1', 'riding on it').locator('.ghost')).toHaveText('1 bet');
    await expect(field(page, 'a4', 'riding on it').locator('.ghost')).toHaveText('2 bets');
    await expect(page.locator('.ghost')).toHaveCount(3);
    await shot(page, info, 'snapshots', '04-compare-ghosts');
    await page.click('#cmp');
    await expect(page.locator('.ghost')).toHaveCount(0);
  });
});

test.describe('flow G · expand a card in place', () => {
  test('a belief opens with evidence, bets riding on it, the analogue and history; the stack does not move', async ({ page }, info) => {
    await page.goto('/');
    // Document coordinates: Playwright scrolls the card into view on click, so viewport y would shift.
    const docY = (sel: string) => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().top + window.scrollY, sel);
    const betsTop = await docY('.level[data-level="initiatives"]');
    await card(page, 'a4').click();
    const d = card(page, 'a4').locator('.detail');
    await expect(d).toBeVisible();
    await expect(d.locator('h5')).toHaveText(['Evidence (3)', 'Bets riding on this', 'What happened last time', 'History']);
    await expect(d.locator('ul').first().locator('a')).toHaveCount(3);
    await expect(d.locator('ul').nth(1).locator('li')).toHaveText(['AI DJ v2 · 60% shipped', 'Open listening-history API for agents · 40% shipped']);
    await expect(d.locator('.analogue .t')).toHaveText('App stores, 2008–');
    await expect(d.locator('.analogue .k')).toHaveText(['got cheap', 'value moved to', 'survivor watched', 'loser believed']);
    await expect(d.locator('.none')).toHaveText('no changes yet');
    // Row-mates keep their own height; the next level has moved down only by the detail's height, not reflowed sideways.
    const a1Box = await card(page, 'a1').boundingBox();
    const a4Box = await card(page, 'a4').boundingBox();
    expect(a1Box!.height).toBeLessThan(a4Box!.height);
    await shot(page, info, 'expand', '03-belief-open', true);
    // Toggle closed: the detail goes and the levels below return to where they were.
    await card(page, 'a4').locator('h4').click();
    await expect(card(page, 'a4').locator('.detail')).toHaveCount(0);
    const betsAfter = await docY('.level[data-level="initiatives"]');
    expect(Math.round(betsAfter)).toBe(Math.round(betsTop));
  });

  test('a belief with nothing riding on it says so; a world card shows its signposts', async ({ page }, info) => {
    await page.goto('/');
    await card(page, 'a3').click();
    await expect(card(page, 'a3').locator('.detail .none').first()).toHaveText("none. You believe this but nothing you're building depends on it.");
    await card(page, 'w1').click();
    const w = card(page, 'w1').locator('.detail');
    await expect(w.locator('h5').nth(1)).toHaveText('Signposts we set in July');
    await expect(w.locator('ul').nth(1).locator('li')).toHaveCount(4);
    await shot(page, info, 'expand', '04-world-and-floating', true);
  });
});

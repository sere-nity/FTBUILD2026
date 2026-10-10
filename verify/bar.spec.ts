// The bar (SPEC §5 routing, §8 layout): the five Try actions, intent routing, ⌘K, Enter, and
// the bar dimming while a run is in progress or a past snapshot is shown.
import { test, expect, type Page } from '@playwright/test';

const entryKind = (page: Page) => page.locator('#log .entry').first().locator('.kind');
const shot = (page: Page, name: string, project: string) => page.screenshot({ path: `verify/shots/bar/${name}.${project}.png` });

test.describe('try actions', () => {
  test('five labelled actions, the first primary, each starts its flow', async ({ page }, info) => {
    await page.goto('/');
    const hints = page.locator('#hints .hint');
    await expect(hints).toHaveCount(5);
    await expect(page.locator('#hints .lbl')).toHaveText('Try:');
    await expect(hints.locator('small')).toHaveText(['You shipped something', 'The world moved', 'Let it read the code', 'Ask a question', 'Say anything']);
    await expect(hints.locator('span')).toHaveText(['shipped AI DJ v2', 'world update', 'look at the repo', 'why is the API fragile?', 'listeners will pay extra for human-only playlists']);
    await expect(hints.first()).toHaveClass(/primary/);
    await shot(page, '01-actions', info.project.name);

    // Ask changes nothing and has no job, so it can run first without waiting.
    await hints.nth(3).click();
    await expect(entryKind(page)).toHaveText('you asked');
    await expect(page.locator('#job')).toBeHidden();

    // Each of the others starts a job with its own entry kind; Esc in the window ends it with nothing changed.
    for (const [i, kind] of [[0, 'you shipped'], [1, 'the world moved'], [4, 'you said']] as const) {
      await hints.nth(i).click();
      await expect(entryKind(page)).toHaveText(kind);
      await expect(page.locator('#job')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#job')).toBeHidden();
      await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('Stopped before anything changed.');
    }
    await hints.nth(2).click();
    await expect(entryKind(page)).toHaveText('inspect');
    await expect(page.locator('#log .entry').first().locator('.l')).toHaveCount(3, { timeout: 5000 });
    await expect(page.locator('#job')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('.card.changed')).toHaveCount(0);
  });

  test('the intro\'s "Try it" runs Flow A and the strip goes; "hide" just hides it', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.locator('#intro')).toBeVisible();
    await shot(page, '02-intro', info.project.name);
    await page.click('#introx');
    await expect(page.locator('#intro')).toBeHidden();
    await page.reload();
    await expect(page.locator('#intro')).toBeVisible();
    await page.click('#go');
    await expect(page.locator('#intro')).toBeHidden();
    await expect(entryKind(page)).toHaveText('you shipped');
    await expect(page.locator('#log .entry').first().locator('.eh b')).toHaveText('shipped AI DJ v2');
    await page.keyboard.press('Escape');
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('#intro')).toBeHidden();
  });
});

test.describe('intent routing (SPEC §5)', () => {
  const cases: Array<[string, string]> = [
    ['why is the API fragile?', 'you asked'],
    ['Which belief has the least evidence', 'you asked'],
    ['look at the repo', 'inspect'],
    ['world update', 'the world moved'],
    ['a label changed its licensing', 'the world moved'],
    ['shipped AI DJ v2', 'you shipped'],
    ['we launched the new home feed', 'you shipped'],
    ['listeners will pay extra for human-only playlists', 'you said'],
  ];
  for (const [text, kind] of cases) {
    test(`"${text}" → ${kind}`, async ({ page }) => {
      await page.goto('/');
      await page.fill('#prompt', text);
      await page.press('#prompt', 'Enter');
      await expect(entryKind(page)).toHaveText(kind);
      await expect(page.locator('#log .entry').first().locator('.eh b')).toHaveText(kind === 'the world moved' ? 'a label changes its AI licensing terms' : kind === 'inspect' ? 'look at the repo' : text);
      await expect(page.locator('#prompt')).toHaveValue('');
      if (kind !== 'you asked') await page.keyboard.press('Escape');
    });
  }
});

test.describe('keyboard and state', () => {
  test('⌘K / Ctrl+K focuses the bar; Enter submits and clears; empty input does nothing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#prompt')).not.toBeFocused();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');
    await expect(page.locator('#prompt')).toBeFocused();
    await page.keyboard.press('Control+k');
    await expect(page.locator('#prompt')).toBeFocused();
    const entries = await page.locator('#log .entry').count();
    await page.keyboard.press('Enter');
    await expect(page.locator('#log .entry')).toHaveCount(entries);
    await page.keyboard.type('   ');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log .entry')).toHaveCount(entries);
    await expect(page.locator('#prompt')).toHaveValue('');
    await page.keyboard.type('why is the API fragile?');
    await page.keyboard.press('Enter');
    await expect(page.locator('#log .entry')).toHaveCount(entries + 1);
    await expect(page.locator('#prompt')).toHaveValue('');
  });

  test('the bar dims during a run and while viewing Jul; "stop" during a run stops it', async ({ page }, info) => {
    await page.goto('/');
    await expect(page.locator('#form')).not.toHaveClass(/off/);
    await page.locator('#hints .hint').first().click();
    await expect(page.locator('#form')).toHaveClass(/off/);
    const opacity = await page.locator('#form').evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeLessThan(1);
    await shot(page, '03-dimmed-during-run', info.project.name);
    // Other text is ignored during a run; "stop" ends it.
    await page.fill('#prompt', 'world update');
    await page.press('#prompt', 'Enter');
    await expect(page.locator('#log .entry').first().locator('.kind')).toHaveText('you shipped');
    await page.fill('#prompt', 'stop');
    await page.press('#prompt', 'Enter');
    await expect(page.locator('#job')).toBeHidden();
    await expect(page.locator('#form')).not.toHaveClass(/off/);
    await expect(page.locator('#log .entry').first().locator('.l.warn')).toHaveText('Stopped before anything changed.');

    await page.locator('#snaps .snap', { hasText: 'Jul' }).click();
    await expect(page.locator('#form')).toHaveClass(/off/);
    const entries = await page.locator('#log .entry').count();
    await page.fill('#prompt', 'shipped AI DJ v2');
    await page.press('#prompt', 'Enter');
    await expect(page.locator('#log .entry')).toHaveCount(entries);
    await expect(page.locator('#job')).toBeHidden();
    await shot(page, '04-dimmed-viewing-jul', info.project.name);
    await page.locator('#snaps .snap.now').click();
    await expect(page.locator('#form')).not.toHaveClass(/off/);
  });
});

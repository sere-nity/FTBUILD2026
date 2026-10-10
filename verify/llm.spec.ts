// LLM runner (SPEC §5, WAYPOINT_LLM=1): the demo must never depend on the network.
// With the flag on and no proxy answering, a submit must say so in the log and run the
// scripted flow to the same end state. With the flag off, /api is never called.
import { test, expect, type Page } from '@playwright/test';

const FLOW_A = 'shipped the agent-facing giving API';

async function shot(page: Page, flow: string, name: string, info: { project: { name: string } }) {
  await page.screenshot({ path: `verify/shots/${flow}/${name}.${info.project.name}.png`, fullPage: false });
}

test.describe('llm runner', () => {
  test('flag off: no /api call is made', async ({ page }) => {
    const calls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/')) calls.push(r.url()); });
    await page.goto('/');
    await page.fill('#prompt', FLOW_A);
    await page.press('#prompt', 'Enter');
    await expect(page.locator('#job')).toBeVisible();
    await expect(page.locator('#jobtitle')).toContainText('Reaches 4 levels', { timeout: 5000 });
    expect(calls).toEqual([]);
  });

  test('flag on, proxy down: log says so and the scripted flow runs', async ({ page }, info) => {
    // Simulate WAYPOINT_LLM=1 by answering /api/plan the way a dead proxy would (connection refused).
    await page.route('**/api/plan', (route) => route.abort('connectionrefused'));
    await page.goto('/');
    await page.evaluate(() => {
      const w = window as unknown as { __waypoint: { runLLM?: (t: string, i: string) => Promise<void> } };
      void w.__waypoint.runLLM!('shipped the agent-facing giving API', 'milestone');
    });
    // Sizing starts at once: levels dim while the call is in flight.
    await expect(page.locator('#job')).toBeVisible();
    await expect(page.locator('#jobtitle')).toHaveText('Sizing change…');
    await shot(page, 'llm', '01-sizing-while-calling', info);

    const warn = page.locator('#log .entry').first().locator('.l.warn').first();
    await expect(warn).toContainText('llm runner unavailable', { timeout: 10000 });
    await expect(warn).toContainText('using the scripted runner');
    await shot(page, 'llm', '02-fallback-line', info);

    // The scripted Flow A then runs to its end state.
    const i1 = page.locator('.card[data-id="i1"]');
    await expect(i1).toContainText('70', { timeout: 30000 });
    await expect(page.locator('#job')).toBeHidden({ timeout: 30000 });
    await shot(page, 'llm', '03-scripted-end-state', info);
  });
});

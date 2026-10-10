import { test, expect } from '@playwright/test';

test('page loads and shows Waypoint brand', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.brand')).toContainText('Waypoint');

  const name = testInfo.project.name;
  await page.screenshot({
    path: `verify/shots/smoke/${name}.png`,
    fullPage: true,
  });
});

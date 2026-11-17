// The site as a whole: Astro builds and serves it, and the standalone Wix demos still load as single files.
import { expect, test } from '@playwright/test';

test('the site builds and serves Home', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
});

for (const demo of ['network-multiply', 'network-globe', 'network-globe-pins', 'network-gallery']) {
  test(`${demo} still loads as a standalone file with no errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/${demo}.html`);
    await expect(page.locator('canvas').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

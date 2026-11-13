// What we do: the stats count up from 0 to their numbers as the section scrolls into view.
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

const nums = page => page.locator('.stats .num').allTextContents();

test('the stats count up to 7,088 disciples, 1,559 groups and 3 subnetworks', async ({ page }) => {
  await openPage(page);
  const first = page.locator('.stats .num').first();
  await first.evaluate(el => el.scrollIntoView({ block: 'center' }));
  // partway through, the first number is still climbing
  await expect.poll(async () => { const n = +(await first.textContent()).replace(/,/g, ''); return n > 0 && n < 7088; }, { timeout: 3000 }).toBe(true);
  await expect.poll(() => nums(page), { timeout: 5000 }).toEqual(['7,088', '1,559', '3']);
});

test('with reduced motion the numbers just show', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page);
  await page.locator('.stats').evaluate(el => el.scrollIntoView({ block: 'center' }));
  expect(await nums(page)).toEqual(['7,088', '1,559', '3']);
});

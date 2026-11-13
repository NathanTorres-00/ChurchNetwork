// The Groups page, reached from the home page's "Start a group".
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

test('Start a group on the home page opens the Groups page', async ({ page }) => {
  await openPage(page);
  await page.locator('.hero-actions').getByRole('link', { name: 'Start a group' }).click();
  await expect(page).toHaveURL(/\/groups(\.html)?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Church Groups');
});

test('the Groups page has its sections in order and no errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/groups.html');
  const headings = await page.locator('main h1, main h2').allTextContents();
  expect(headings).toEqual(['Church Groups', 'What are Rock Network Groups?', 'Network Video', 'Meet the team']);
  await expect(page.locator('.group-type h3')).toHaveText(['Church Groups', 'Discipleship Groups']);
  await expect(page.locator('.group-type').first().locator('.traits li')).toHaveCount(4);
  await expect(page.locator('.group-type').nth(1).locator('.traits li')).toHaveCount(3);
  await expect(page.getByText('Already a part of a group?')).toBeVisible();

  // the hero's Start a group jumps to the two kinds of group
  await page.locator('.hero-card').getByRole('link', { name: 'Start a group' }).click();
  await expect(page).toHaveURL(/#start$/);
  await expect(page.locator('#start')).toBeInViewport();

  // links still to be built stay put
  await page.getByRole('link', { name: 'Start a church group' }).click();
  await expect(page).toHaveURL(/#start$/);
  expect(errors).toEqual([]);
});

// Home: the loading screen, the hero's globe and headline, and the Adjust panel.
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

test('Home opens: loader, then the headline and the globe', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await openPage(page, '/');
  await expect(page.locator('.hero-title')).toHaveAttribute('aria-label', 'Multiplying disciples, leaders, churches, and movements');
  await expect(page.locator('.hero canvas').first()).toBeVisible();
  await expect(page.locator('#comment-toggle')).toHaveCount(0);
  await expect(page.locator('.versions-pill, [data-versions]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('if the CDN scripts are blocked the page can still be read', async ({ page }) => {
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, r => r.abort());
  await page.goto('/');
  // the loading screen gives way on its own, so it doesn't trap the reader
  await expect(page.locator('html')).not.toHaveClass(/is-loading/, { timeout: 15_000 });
  await expect(page.locator('#loader')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('.hero-lead')).toBeVisible();
});

test('garbage in saved settings falls back to defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rn:footer', '{not json');
    localStorage.setItem('rn:pageTransition', 'banana');
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await openPage(page, '/');
  await expect(page.locator('.hero-lead')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-footer-mark', 'clip');
  expect(errors).toEqual([]);
});

test('reduced motion shows the page without the loader animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page, '/');
  await expect(page.locator('.hero-lead')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-loading/);
});

test('?controls=0 hides the Adjust panel', async ({ page }) => {
  await openPage(page, '/?controls=0');
  await expect(page.locator('.hero-lead')).toBeVisible();
  await expect(page.locator('#adjust')).toBeHidden();
  await expect(page.locator('#panel')).toBeHidden();
});

test('the hero copy comes from the Home content', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.locator('.hero-lead')).toHaveText('A New Testament Church Network');
  await expect(page.locator('.hero-actions .button')).toHaveText(['Learn more', 'Start a group']);
  await expect(page.locator('.hero-actions .button').nth(1)).toHaveAttribute('href', '/groups');
});

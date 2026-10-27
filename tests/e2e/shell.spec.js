import { expect, test } from '@playwright/test';
import { enterCommentMode, intersects, openPage, tool, useFakeStore } from './helpers.js';

test('comment button sits beside the nav', async ({ page }) => {
  await openPage(page);
  const button = page.locator('#comment-toggle');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Comment');
  const b = await button.boundingBox();
  const wrap = await page.locator('.site-header .wrap').boundingBox();
  const nav = await page.locator('.site-nav').boundingBox();
  expect(b.x + b.width).toBeLessThanOrEqual(wrap.x + wrap.width);
  expect(intersects(b, nav)).toBe(false);
  expect(b.x).toBeGreaterThan(nav.x);

  await page.setViewportSize({ width: 500, height: 844 });
  await expect(button).toBeVisible();
});

test('nothing loads before the button is clicked', async ({ page }) => {
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  await openPage(page);
  await page.waitForTimeout(500);
  expect(requests.filter(u => u.includes('/review/') || u.includes('convex'))).toEqual([]);
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

test('entering shows the workspace', async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
  const toolbar = page.locator('.rv-toolbar');
  await expect(toolbar).toContainText('Comment mode');
  await expect(toolbar).toContainText('Reviewing Church Network — Home');
  await expect(toolbar.getByRole('button', { name: 'Share review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save review' })).toHaveCount(0);
  for (const name of ['Comment', 'Voice memo', 'Arrow', 'Marker']) await expect(tool(page, name)).toBeVisible();
  await expect(page.locator('.rv-sidebar').getByRole('heading', { name: 'Review activity' })).toBeVisible();
  await expect(tool(page, 'Comment')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.adjust')).toBeHidden();
});

test('exiting restores the page', async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/review-open/);
  await expect(page.locator('.adjust')).toBeVisible();
});

test('Esc backs out one level', async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
  await page.keyboard.press('Escape');
  await expect(tool(page, 'Comment')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

test('?comment opens comment mode after the loading screen', async ({ page }) => {
  await openPage(page, '/hero.html?comment');
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 5_000 });
});

test('?owner=test-owner is stored and removed from the address', async ({ page }) => {
  await openPage(page, '/hero.html?owner=test-owner');
  await expect.poll(() => page.evaluate(() => location.search)).toBe('');
  expect(await page.evaluate(() => localStorage.getItem('cn-review-owner'))).toBe('test-owner');
});

test('share review copies a comment-mode link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPage(page);
  await enterCommentMode(page);
  await page.getByRole('button', { name: 'Share review' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/\/hero\.html\?comment$/);
  await expect(page.locator('.rv-toolbar')).toContainText('Link copied');
});

test('page sits between rail and sidebar on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openPage(page);
  await enterCommentMode(page);
  await expect(page.locator('.rv-sidebar')).toBeVisible();
  const hero = await page.locator('.hero').boundingBox();
  expect(intersects(hero, await page.locator('.rv-rail').boundingBox())).toBe(false);
  expect(intersects(hero, await page.locator('.rv-sidebar').boundingBox())).toBe(false);
});

test('globe pauses and hub cursor is off in comment mode', async ({ page }) => {
  await openPage(page, '/hero.html?showHubs=1');
  await enterCommentMode(page);
  await expect(page.locator('html')).toHaveAttribute('data-globe', 'paused');
  await tool(page, 'Comment').click();          // back to browsing so hovering is plain hovering
  await page.locator('#hubs .hub-row').first().scrollIntoViewIfNeeded();
  await page.locator('#hubs .hub-row h3').first().hover();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.getElementById('hub-cursor').style.getPropertyValue('--s') || '0')).toBe('0');
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-globe', 'playing');
});

test('owner link alone does not open comment mode', async ({ page }) => {
  await useFakeStore(page);
  await openPage(page, '/hero.html?owner=test-owner');
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

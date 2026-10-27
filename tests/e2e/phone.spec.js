import { expect, test } from '@playwright/test';
import { openPage, tool } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const VH = 844;

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await page.locator('#comment-toggle').tap();
  await expect(page.locator('.rv-toolbar')).toBeVisible();
});

// A real one-finger drag, sent as touch input so the page's scrolling rules apply
async function touchDrag(page, from, to) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 6; i++) {
    const p = { x: from.x + (to.x - from.x) * i / 6, y: from.y + (to.y - from.y) * i / 6 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('tools sit in a bottom bar and the sidebar is a sheet', async ({ page }) => {
  const rail = await page.locator('.rv-rail').boundingBox();
  expect(rail.y).toBeGreaterThanOrEqual(VH * 0.8);
  expect(rail.width).toBeGreaterThan(rail.height);
  await expect(page.locator('.rv-sidebar')).not.toBeInViewport();
  const handle = page.locator('.rv-sidebar-tab');
  await expect(handle).toBeVisible();
  await expect(handle).toContainText('0');
  await handle.tap();
  await expect(page.locator('.rv-sidebar')).toBeInViewport();
  const sheet = await page.locator('.rv-sidebar').boundingBox();
  expect(sheet.y).toBeGreaterThanOrEqual(VH * 0.3);
  expect(sheet.width).toBeGreaterThanOrEqual(380);
});

test('tap places a comment', async ({ page }) => {
  await page.locator('.hero-lead').tap();
  const composer = page.locator('.rv-composer');
  await expect(composer).toBeVisible();
  await expect(composer).toBeInViewport();
  await expect(page.locator('.rv-sidebar')).toBeInViewport();
  await composer.getByLabel('Your name').fill('Ana');
  await composer.getByLabel('Comment').fill('Shorter on phones');
  await composer.getByRole('button', { name: 'Post comment' }).tap();
  await expect(page.locator('.rv-card')).toHaveCount(1);
});

test('drag draws an arrow by touch', async ({ page }) => {
  await tool(page, 'Arrow').tap();
  await touchDrag(page, { x: 60, y: 420 }, { x: 320, y: 560 });
  const composer = page.locator('.rv-composer-arrow');
  await expect(composer).toBeVisible();
  await composer.getByLabel('Your name').fill('Ana');
  await composer.getByRole('button', { name: 'Post arrow' }).tap();
  await expect(page.locator('.rv-arrow:not(.rv-draft)')).toHaveCount(1);
});

test('an old box highlight still shows on a phone', async ({ page }) => {
  await page.evaluate(async () => {
    while (!window.__reviewFake) await new Promise(r => setTimeout(r, 20));
    await window.__reviewFake.create({
      page: 'home', kind: 'highlight', author: 'Bo', deviceId: 'someone-else',
      from: { path: '#story', fx: 0.1, fy: 0.1, vw: 1440 }, to: { path: '#story', fx: 0.5, fy: 0.3, vw: 1440 },
    });
  });
  await expect(page.locator('.rv-highlight')).toHaveCount(1);
  await page.locator('.rv-highlight').scrollIntoViewIfNeeded();
  await expect(page.locator('.rv-highlight')).toBeVisible();
});

test('one finger scrolls while browsing', async ({ page }) => {
  await tool(page, 'Comment').tap();          // back to browsing
  await expect(tool(page, 'Comment')).toHaveAttribute('aria-pressed', 'false');
  const before = await page.evaluate(() => scrollY);
  await touchDrag(page, { x: 200, y: 600 }, { x: 200, y: 200 });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  await expect(page.locator('.rv-composer')).toHaveCount(0);
});

test("the page's header sits below the toolbar", async ({ page }) => {
  const bar = await page.locator('.rv-toolbar').boundingBox();
  const brand = await page.locator('.site-header .brand').boundingBox();
  expect(brand.y).toBeGreaterThanOrEqual(bar.y + bar.height);
});

test('toolbar fits', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const bar = await page.locator('.rv-toolbar').boundingBox();
  expect(bar.x + bar.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Share review' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leave comment mode' })).toBeVisible();
});

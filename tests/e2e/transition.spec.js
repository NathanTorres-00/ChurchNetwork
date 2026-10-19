// The glide into and out of comment mode: the page shrinks into its column, then the panels slide in.
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

// Count page transitions, and keep each panel's position over time
async function watch(page) {
  await page.addInitScript(() => {
    window.__glides = 0;
    const real = document.startViewTransition?.bind(document);
    if (real) document.startViewTransition = cb => { window.__glides++; return real(cb); };
  });
}
const box = (page, sel) => page.locator(sel).boundingBox();

// Records, every frame, the highest the toolbar got (offscreen is negative) and whether the page was
// still in comment mode's column at that moment
async function sampleToolbar(page) {
  await page.evaluate(() => {
    window.__toolbar = { minY: Infinity, offscreenWhileOpen: false };
    const tick = () => {
      const t = document.querySelector('.rv-toolbar');
      if (t) {
        const y = t.getBoundingClientRect().y;
        window.__toolbar.minY = Math.min(window.__toolbar.minY, y);
        if (y < 0 && document.documentElement.classList.contains('review-open')) window.__toolbar.offscreenWhileOpen = true;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
const sampled = page => page.evaluate(() => window.__toolbar);

test('entering glides the page in and then slides the panels in', async ({ page }) => {
  await watch(page);
  await openPage(page);
  await sampleToolbar(page);
  await page.locator('#comment-toggle').click();
  // the panels land where comment mode puts them…
  await expect.poll(async () => (await box(page, '.rv-toolbar'))?.y, { timeout: 8000 }).toBe(16);
  // …having started offscreen, after one page transition
  expect((await sampled(page)).minY).toBeLessThan(0);
  expect(await page.evaluate(() => window.__glides)).toBe(1);
  await expect.poll(async () => (await box(page, '.rv-rail')).x).toBe(24);
  await expect.poll(async () => { const b = await box(page, '.rv-sidebar'); return Math.round(b.x + b.width); }).toBe(1440 - 24);
  await expect(page.locator('html')).not.toHaveClass(/rv-gliding/);
});

test('leaving takes the panels out first, then the page grows back', async ({ page }) => {
  await watch(page);
  await openPage(page);
  await page.locator('#comment-toggle').click();
  await expect.poll(async () => (await box(page, '.rv-toolbar'))?.y, { timeout: 8000 }).toBe(16);
  await sampleToolbar(page);
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  // the page comes back to full size…
  await expect(page.locator('html')).not.toHaveClass(/review-open/, { timeout: 8000 });
  // …after the panels had left while it was still in its column
  expect((await sampled(page)).offscreenWhileOpen).toBe(true);
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__glides)).toBe(2);
});

test('reduced motion skips the glide', async ({ page }) => {
  await watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page);
  await sampleToolbar(page);
  await page.locator('#comment-toggle').click();
  await expect.poll(async () => (await box(page, '.rv-toolbar'))?.y, { timeout: 8000 }).toBe(16);
  expect(await page.evaluate(() => window.__glides)).toBe(0);
  expect((await sampled(page)).minY).toBe(16);           // never slid in from offscreen
});

test('clicking Comment twice quickly ends cleanly out of comment mode', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await openPage(page);
  await page.evaluate(async () => {
    const button = document.getElementById('comment-toggle');
    button.click();
    await new Promise(r => setTimeout(r, 200));
    button.click();
  });
  await expect(page.locator('html')).not.toHaveClass(/review-open/, { timeout: 6000 });
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(page.locator('html')).not.toHaveClass(/review-open/);
  expect(errors).toEqual([]);
});

test("entering from the top keeps the page's header in view", async ({ page }) => {
  await openPage(page);
  await page.locator('#comment-toggle').click();
  await expect.poll(async () => (await box(page, '.rv-toolbar'))?.y, { timeout: 8000 }).toBe(16);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const bar = await box(page, '.rv-toolbar');
  const brand = await box(page, '.site-header .brand');
  expect(brand.y).toBeGreaterThanOrEqual(bar.y + bar.height);
});

test('what you were reading stays in view', async ({ page }) => {
  await openPage(page);
  await page.locator('#story h2').scrollIntoViewIfNeeded();
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo('#story', { immediate: true }) : document.getElementById('story').scrollIntoView()));
  await page.waitForTimeout(300);
  await page.locator('#comment-toggle').evaluate(b => b.click());
  await expect.poll(async () => (await box(page, '.rv-toolbar'))?.y, { timeout: 8000 }).toBe(16);
  await expect(page.locator('#story h2')).toBeInViewport();
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(page.locator('html')).not.toHaveClass(/review-open/, { timeout: 8000 });
  await expect(page.locator('#story h2')).toBeInViewport();
});

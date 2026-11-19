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

test('Home has its sections in the order the old Home page had them', async ({ page }) => {
  await openPage(page, '/');
  expect(await page.locator('main > section').evaluateAll(els => els.map(el => el.id)))
    .toEqual(['top', 'church-network', 'what-we-do', 'how', 'testimony', 'app', 'hubs', 'story']);
  await expect(page.locator('#hubs')).toBeHidden();              // Find a hub is off unless turned on
  await expect(page.locator('#testimony blockquote')).toContainText('pour into others');
  await expect(page.locator('#story h3')).toHaveText(['One local church', 'Disciples became leaders', 'Groups became churches', 'Network sent missionaries']);
});

test('Home does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('/embed/globe shows only the globe', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/embed/globe?controls=0&smoothScroll=0&heroArt=pins&showPins=1');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('.site-footer')).toHaveCount(0);
  await expect(page.locator('#loader')).toHaveCount(0);
  await expect(page.locator('.hero-copy')).toBeHidden();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(errors).toEqual([]);
});

test('the footer globe takes the footer colours from its address', async ({ page }) => {
  await page.goto('/embed/globe?embed=globe&controls=0&smoothScroll=0&heroArt=pins&showPins=1&bg=1f1f23');
  await expect(page.locator('html')).toHaveClass(/embed-globe/);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(31, 31, 35)');
});

test('Jesus Disciple has its wordmark as the heading', async ({ page }) => {
  await openPage(page, '/');
  const heading = page.locator('#app h2').first();
  await heading.scrollIntoViewIfNeeded();
  const logo = heading.locator('img[alt="Jesus Disciple"]');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  await expect(heading).toContainText('A Four-Stage Ministry tool');
});

test('the panel\'s Page settings still reach the sections', async ({ page }) => {
  await openPage(page, '/?sectionSpace=200&radius=8&contentWidth=1000&bodySize=20&controls=0');
  const how = page.locator('#how');
  expect(await how.evaluate(el => getComputedStyle(el).paddingTop)).toBe('200px');
  expect(await page.locator('#intro-video').evaluate(el => getComputedStyle(el).borderTopLeftRadius)).toBe('8px');
  expect(await page.locator('#how .container').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(952);
  expect(await page.locator('#story .story-stage_text').first().evaluate(el => getComputedStyle(el).fontSize)).toBe('19px');   // the stages sit 1px under body text
});

test('Home keeps 128px between sections on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, '/');
  expect(await page.locator('#how').evaluate(el => getComputedStyle(el).paddingTop)).toBe('128px');
});

test('/#app scrolls the Jesus Disciple section into view', async ({ page }) => {
  await page.goto('/groups');
  await page.goto('/#app');
  await expect(page.locator('#app')).toBeInViewport({ timeout: 10_000 });
});

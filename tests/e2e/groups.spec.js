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

test('the Network Video shows its YouTube thumbnail and plays in place', async ({ page }) => {
  await page.route('**/youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>player</p>' }));
  await page.goto('/groups.html');
  const box = page.locator('#network-video');
  await expect(box.locator('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/qo52gy0Gq74/maxresdefault.jpg');
  await box.locator('.play').click();
  const frame = box.locator('iframe');
  await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/qo52gy0Gq74\?autoplay=1/);
  await expect(box.locator('.play')).toHaveCount(0);
});

test('the Adjust panel switches the hero to the Pins globe and back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/groups.html');
  await expect(page.locator('#hero-globe iframe')).toHaveCount(0);           // the globe loads only when chosen
  await page.locator('#adjust').click();
  await page.locator('.seg[data-key="heroArt"] [data-value="globe"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-art', 'globe');
  const frame = page.locator('#hero-globe iframe');
  await expect(frame).toHaveAttribute('src', /hero\.html\?embed=globe/);
  // the embedded page shows only its globe, with no loading screen
  const inner = page.frameLocator('#hero-globe iframe');
  await expect(inner.locator('#canvas')).toBeVisible();
  await expect(inner.locator('.hero-copy')).toBeHidden();
  await expect(inner.locator('#loader')).toHaveCount(0);
  await page.locator('.seg[data-key="heroShape"] [data-value="full"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-shape', 'full');
  await page.locator('.seg[data-key="heroArt"] [data-value="photo"]').click();
  await expect(frame).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('page load style and the page transition come from the panel', async ({ page }) => {
  await page.goto('/groups.html?loadStyle=fade');
  await expect(page.locator('html')).toHaveAttribute('data-load', 'fade');
  await page.locator('#adjust').click();
  await page.locator('.seg[data-key="loadStyle"] [data-value="reveal"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-load', 'reveal');
  await page.locator('.seg[data-transition-key="style"] [data-value="slide"]').click();
  // kept for every page of the site
  await page.goto('/hero.html');
  await expect(page.locator('html')).toHaveAttribute('data-transition', 'slide');
});

test('arriving at Home from Groups skips the loading screen', async ({ page }) => {
  await page.goto('/groups.html');
  await page.locator('.site-nav a', { hasText: 'Our story' }).click();
  await expect(page).toHaveURL(/hero\.html#story$/);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/, { timeout: 2000 });
  await expect(page.locator('#story')).toBeInViewport();
});

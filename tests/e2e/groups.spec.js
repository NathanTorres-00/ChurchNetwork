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
  await page.goto('/groups');
  // the sections built so far (Task 5 adds #video, #story and #team)
  expect(await page.locator('main > section').evaluateAll(els => els.map(el => el.id))).toEqual(['top', 'what']);
  await expect(page.locator('main h1')).toHaveText('Church Groups');
  await expect(page.locator('#what h2')).toHaveText('What are Rock Network Groups?');
  await expect(page.locator('.group-card_wrap h3')).toHaveText(['Church Groups', 'Discipleship Groups']);
  await expect(page.locator('.group-card_wrap').first().locator('.group-card_item')).toHaveCount(4);
  await expect(page.locator('.group-card_wrap').nth(1).locator('.group-card_item')).toHaveCount(3);
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

test('Full width ends in the Home hero arc, set from Bottom curve', async ({ page }) => {
  await page.goto('/groups.html?heroShape=full');
  const card = page.locator('.hero-card');
  expect(await card.evaluate(el => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain('radial-gradient');
  const curve = () => card.evaluate(el => parseFloat(getComputedStyle(el).marginBottom));
  expect(await curve()).toBeLessThan(-40);                      // 5vw at 1280px wide = 64px of dip
  await page.locator('#adjust').click();
  await page.locator('#c-heroCurve').fill('0');
  expect(await curve()).toBe(0);
  // the card shape keeps its straight, rounded edge
  await page.locator('.seg[data-key="heroShape"] [data-value="card"]').click();
  expect(await card.evaluate(el => getComputedStyle(el).maskImage)).toBe('none');
});

test('footer logo can be clipped from the panel, and Home keeps the choice', async ({ page }) => {
  await page.goto('/groups.html');
  const mark = page.locator('.footer-mark');
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="mark"] [data-value="full"]').click();
  const full = await mark.evaluate(el => el.getBoundingClientRect().height);
  await page.locator('[data-footer-key="mark"] [data-value="clip"]').click();
  await page.locator('#c-footerShift').fill('0');
  const clipped = await mark.evaluate(el => el.getBoundingClientRect().height);
  expect(clipped).toBeLessThan(full * 0.7);
  // the copyright comes before the clipped wordmark
  const order = await page.evaluate(() => document.querySelector('.footer-bottom').getBoundingClientRect().top < document.querySelector('.footer-mark').getBoundingClientRect().top);
  expect(order).toBe(true);
  // Position moves the clipped logo down inside its box
  const top = () => page.locator('.footer-mark .logo').evaluate(el => el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top);
  expect(await top()).toBeCloseTo(0, 0);
  await page.locator('#c-footerShift').fill('0.2');
  expect(await top()).toBeGreaterThan(20);
  // the transition style isn't touched by the footer buttons
  expect(await page.evaluate(() => window.rnPageTransition.get().style)).toBe('rise');
  await page.goto('/hero.html');
  await expect(page.locator('html')).toHaveAttribute('data-footer-mark', 'clip');
});

test('footer slides out from under the last section, and can be inverted', async ({ page }) => {
  await page.goto('/groups.html');
  const y = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.site-footer')).transform).m42);
  // with the footer's top just coming into view, it's still tucked up under the section above
  await page.evaluate(() => scrollTo(0, document.querySelector('main').getBoundingClientRect().bottom + scrollY - innerHeight + 40));
  await expect.poll(y).toBeLessThan(-100);
  // at the bottom of the page it has landed
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect.poll(y).toBeCloseTo(0, 0);
  // the footer sits under the page, and the page covers it
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('main')).zIndex)).toBe('1');
  // Off puts it back in place everywhere
  await page.evaluate(() => window.rnFooter.set({ reveal: 'off' }));
  await page.evaluate(() => scrollTo(0, 0));
  expect(await y()).toBe(0);
  // Inverted turns it dark
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="theme"] [data-value="dark"]').click();
  expect(await page.locator('.site-footer').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(31, 31, 35)');
});

test('Curved puts the hero\'s arc on the bottom of the last section, with the footer under it', async ({ page }) => {
  await page.goto('/groups.html');
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="edge"] [data-value="curve"]').click();
  const team = page.locator('#team');
  await expect(team).toHaveClass(/footer-above/);
  expect(await team.evaluate(el => getComputedStyle(el).maskImage)).toContain('radial-gradient');
  // the page overlaps the footer by the curve's depth, so the footer shows past the arc's sides
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main')).marginBottom))).toBeLessThan(-20);
  // at the bottom of the page the footer has fully landed: no gap under it
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => Math.round(innerHeight - document.querySelector('.site-footer').getBoundingClientRect().bottom))).toBe(0);
  await page.locator('[data-footer-key="edge"] [data-value="flat"]').click();
  await expect(team).not.toHaveClass(/footer-above/);
  expect(await team.evaluate(el => getComputedStyle(el).maskImage)).toBe('none');
});

test('footer can be grey, and plays the Pins globe behind it when it comes into view', async ({ page }) => {
  await page.goto('/groups.html');
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="theme"] [data-value="grey"]').click();
  await page.locator('#c-footerGrey').fill('0.4');
  await expect(page.locator('html')).toHaveAttribute('data-footer-ink', 'light');   // dark grey: light text
  await page.locator('#close').click();
  // the globe loads only once the footer is near the screen, on the footer's grey
  await expect(page.locator('.footer-anim iframe')).toHaveCount(0);
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  const frame = page.locator('.footer-anim iframe');
  await expect(frame).toHaveCount(1);
  const src = await frame.getAttribute('src');
  expect(src).toContain('embed=globe');
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--footer-bg').trim());
  expect(src).toContain('bg=' + bg.slice(1));
  // its pins keep clear of the footer's text
  const rects = await page.evaluate(() => window.rnHeroTextRects(document.querySelector('.footer-anim iframe')));
  expect(rects.length).toBeGreaterThan(5);
  // Off removes it
  await page.evaluate(() => window.rnFooter.set({ anim: 'off' }));
  await expect(page.locator('.footer-anim iframe')).toHaveCount(0);
});

test('Home nav links to the Groups page', async ({ page }) => {
  await page.goto('/hero.html');
  await expect(page.locator('.site-nav a', { hasText: 'Groups' })).toHaveAttribute('href', 'groups.html');
});

// The Groups page, reached from the home page's "Start a group".
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

test('the Groups page has its sections in order and no errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/groups');
  expect(await page.locator('main > section').evaluateAll(els => els.map(el => el.id))).toEqual(['top', 'what', 'video', 'story', 'team']);
  const headings = await page.locator('main h1, main h2').allTextContents();
  expect(headings).toEqual(['Church Groups', 'What are Rock Network Groups?', 'Network Video', 'Rock Groups Leadership Team']);
  await expect(page.locator('.group-card_wrap h3')).toHaveText(['Church Groups', 'Discipleship Groups']);
  await expect(page.locator('.group-card_wrap').first().locator('.group-card_item')).toHaveCount(4);
  await expect(page.locator('.group-card_wrap').nth(1).locator('.group-card_item')).toHaveCount(3);
  await expect(page.getByText('Already a part of a group?')).toBeVisible();
  await expect(page.locator('#story blockquote')).toContainText('closest thing to family');
  const storyPhoto = page.getByRole('img', { name: 'A house church group gathered in a living room' });
  await expect(storyPhoto).toHaveAttribute('src', '/assets/network-photos/globe/house-church-living-room.webp');
  await storyPhoto.scrollIntoViewIfNeeded();
  await expect.poll(() => storyPhoto.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#team .team-member_wrap')).toHaveCount(4);   // four leaders (main 5f3b046)

  // the hero's Start a group and both kinds of group start on the Jesus Way page in the Jesus Disciple App
  const jesusWay = 'https://app.jesusdisciple.com/jesus-way';
  await expect(page.locator('.hero-card').getByRole('link', { name: 'Start a group' })).toHaveAttribute('href', jesusWay);
  for (const name of ['Start a church group', 'Start a discipleship group'])
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', jesusWay);

  const resources = page.getByRole('link', { name: 'Find resources for you' });
  await resources.click();
  const dialog = page.getByRole('dialog', { name: 'Coming soon' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(resources).toBeFocused();
  await expect(page).toHaveURL(/\/groups$/);
  expect(errors).toEqual([]);
});

test('the Network Video shows its YouTube thumbnail and plays in place', async ({ page }) => {
  await page.route('**/youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>player</p>' }));
  await page.goto('/groups');
  const box = page.locator('#network-video');
  await expect(box.locator('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/P0oEK8HicGM/hqdefault.jpg');
  await box.locator('.play').click();
  const frame = box.locator('iframe');
  await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/P0oEK8HicGM\?autoplay=1/);
  await expect(box.locator('.play')).toHaveCount(0);
});

test('page load style and the page transition come from the panel', async ({ page }) => {
  await page.goto('/groups?loadStyle=fade');
  await expect(page.locator('html')).toHaveAttribute('data-load', 'fade');
  await page.locator('#adjust').click();
  await page.locator('.seg[data-key="loadStyle"] [data-value="reveal"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-load', 'reveal');
  await page.locator('.seg[data-transition-key="style"] [data-value="slide"]').click();
  // kept for every page of the site
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-transition', 'slide');
});

test('Full width ends in the Home hero arc, set from Bottom curve', async ({ page }) => {
  await page.goto('/groups?heroShape=full');
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
  await page.goto('/groups');
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
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-footer-mark', 'clip');
});

test('footer slides out from under the last section, and can be inverted', async ({ page }) => {
  await page.goto('/groups');
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
  await page.goto('/groups');
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="edge"] [data-value="curve"]').click();
  const team = page.locator('#team');
  await expect(team).toHaveClass(/footer-above/);
  expect(await team.evaluate(el => getComputedStyle(el).maskImage)).toContain('radial-gradient');
  // the page overlaps the footer by the curve's depth, so the footer shows past the arc's sides
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main')).marginBottom))).toBeLessThan(-20);
  // at the bottom of the page the footer has fully landed: no gap under it
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => Math.abs(innerHeight - document.querySelector('.site-footer').getBoundingClientRect().bottom))).toBeLessThan(1);
  await page.locator('[data-footer-key="edge"] [data-value="flat"]').click();
  await expect(team).not.toHaveClass(/footer-above/);
  expect(await team.evaluate(el => getComputedStyle(el).maskImage)).toBe('none');
});

test('footer can be grey, and plays the Pins globe behind it when it comes into view', async ({ page }) => {
  await page.goto('/groups');
  await page.locator('#adjust').click();
  await page.locator('[data-footer-key="theme"] [data-value="grey"]').click();
  await page.locator('#c-footerGrey').fill('0.4');
  await expect(page.locator('html')).toHaveAttribute('data-footer-ink', 'light');   // dark grey: light text
  await page.locator('#close').click();
  // the globe loads ahead of time (once the page is idle), on the footer's grey, at 1x so it stays light
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  const frame = page.locator('.footer-anim iframe');
  await expect(frame).toHaveCount(1);
  const bgNow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--footer-bg').trim());
  await expect(frame).toHaveAttribute('src', new RegExp('bg=' + bgNow.slice(1)));   // rebuilt on the grey
  // coming back to the footer replays the same frame instead of reloading it
  const handle = await frame.elementHandle();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  expect(await handle.evaluate(el => el.isConnected)).toBe(true);
  const src = await frame.getAttribute('src');
  expect(src).toContain('embed=globe');
  expect(src).toContain('dpr=1');
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--footer-bg').trim());
  expect(src).toContain('bg=' + bg.slice(1));
  // its pins keep clear of the footer's text
  const rects = await page.evaluate(() => window.rnHeroTextRects(document.querySelector('.footer-anim iframe')));
  expect(rects.length).toBeGreaterThan(5);
  // Off removes it
  await page.evaluate(() => window.rnFooter.set({ anim: 'off' }));
  await expect(page.locator('.footer-anim iframe')).toHaveCount(0);
});

test('garbage in saved settings falls back to defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rn:footer', '{not json');
    localStorage.setItem('rn:pageTransition', 'banana');
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/groups');
  await expect(page.locator('h1')).toHaveText('Church Groups');
  await expect(page.locator('html')).toHaveAttribute('data-footer-mark', 'clip');
  await expect(page.locator('html')).toHaveAttribute('data-transition', 'rise');
  expect(errors).toEqual([]);
});

test('Groups does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/groups');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('?controls=0 hides the Adjust panel', async ({ page }) => {
  await page.goto('/groups?controls=0');
  await expect(page.locator('h1')).toHaveText('Church Groups');
  await expect(page.locator('#adjust')).toHaveCount(0);
  await expect(page.locator('#panel')).toHaveCount(0);
});

test('sections rise in as they scroll into view', async ({ page }) => {
  await page.goto('/groups');
  const team = page.locator('#team .reveal').first();
  await expect(team).not.toHaveClass(/is-in/);
  await team.scrollIntoViewIfNeeded();
  await expect(team).toHaveClass(/is-in/);
});

test('Start a group on the home page opens the Groups page', async ({ page }) => {
  await openPage(page);
  await page.locator('.hero-actions').getByRole('link', { name: 'Start a group' }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Church Groups');
});

test('the Adjust panel switches the hero to the Pins globe and back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/groups');
  await expect(page.locator('#hero-globe iframe')).toHaveCount(0);           // the globe loads only when chosen
  await page.locator('#adjust').click();
  await page.locator('.seg[data-key="heroArt"] [data-value="globe"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-art', 'globe');
  const frame = page.locator('#hero-globe iframe');
  await expect(frame).toHaveAttribute('src', /^\/embed\/globe\?/);
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

test('arriving at Home from Groups skips the loading screen', async ({ page }) => {
  await page.goto('/groups');
  await page.locator('.site-nav_brand').click();
  await page.locator('.site-nav a', { hasText: 'Our story' }).click();
  await expect(page).toHaveURL(/\/#story$/);
  await expect(page.locator('html')).not.toHaveClass(/is-loading/, { timeout: 2000 });
  await expect(page.locator('#story')).toBeInViewport();
});

test('the footer globe shows a canvas inside its frame', async ({ page }) => {
  await page.goto('/groups');
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  const inner = page.frameLocator('.footer-anim iframe');
  await expect(inner.locator('#canvas')).toBeVisible({ timeout: 15_000 });
  await expect(inner.locator('.site-footer')).toHaveCount(0);
});

test('the What lead keeps its 58-character measure alongside its scroll-in delay', async ({ page }) => {
  await page.goto('/groups');
  const lead = page.locator('#what .text');
  expect(await lead.evaluate(el => getComputedStyle(el).maxWidth)).not.toBe('none');
  expect(await lead.evaluate(el => getComputedStyle(el).getPropertyValue('--i').trim())).toBe('2');
});

test('the Rock Groups Leadership Team shows each person with their role (main 49ae49e)', async ({ page }) => {
  await page.goto('/groups');
  const team = page.locator('#team .team-member_wrap');
  await expect(team.locator('h3')).toHaveText(['Jerry Dirmann', 'Tina Shubin', 'Eryne Nevarez', 'Crissy Shubin']);
  await expect(team.locator('.team-member_role')).toHaveText(['Director', 'Asst. Director', 'Operations', 'Admin Asst.']);
});

// The group cards' outline trace (ported from the live folder's groups.html)
test('a group card traces its outline from where the pointer comes in, and on keyboard focus', async ({ page }) => {
  await page.goto('/groups');
  const card = page.locator('.group-card_wrap').first();
  const path = card.locator('.group-card_trace path');
  await card.scrollIntoViewIfNeeded();
  const dash = () => path.evaluate(el => {
    const [on] = getComputedStyle(el).strokeDasharray.split(/[ ,]+/).map(parseFloat);
    return { on: on || 0, length: el.getTotalLength() };
  });
  await expect.poll(async () => (await dash()).on).toBe(0);

  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await expect.poll(async () => { const d = await dash(); return Math.round(d.on - d.length); }).toBe(0);
  await page.mouse.move(box.x + box.width / 2, box.y - 200);
  await expect.poll(async () => (await dash()).on).toBe(0);

  await card.getByRole('link').focus();
  await expect.poll(async () => { const d = await dash(); return Math.round(d.on - d.length); }).toBe(0);
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(async () => { const d = await dash(); return Math.round(d.on - d.length); }).toBe(0);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect.poll(async () => (await dash()).on).toBe(0);
});

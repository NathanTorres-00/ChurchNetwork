import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

// Option B: open at the top on wide screens, a pill while reading, never opened by scrolling
const navOf = page => {
  const nav = page.getByRole('navigation', { name: 'Site navigation' });
  return { nav, brand: nav.getByRole('button', { name: 'The Rock Network menu' }) };
};
const scrollTo = async (page, top) => {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(top);
};
// Scroll down past the top, then up a little: the pill shows, closed
const toPill = async page => {
  const nav = page.locator('.site-nav');
  await scrollTo(page, 400);
  await expect(nav).toHaveClass(/is-scroll-hidden/); // let the scroll handler see the way down first
  await scrollTo(page, 300);
  await expect(nav).not.toHaveClass(/is-scroll-hidden/);
  await expect.poll(() => nav.evaluate(el => el.getAnimations().length)).toBe(0); // done sliding back in
};

for (const path of ['home', 'groups', 'leadership']) {
  test(`${path} is open at the top and opens from the pill by keyboard`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (path === 'home') await openPage(page);
    else await page.goto(`/${path}`, { waitUntil: 'domcontentloaded' });
    const { nav, brand } = navOf(page);
    const logo = brand.locator('img');

    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await brand.click();
    await expect(brand).toHaveAttribute('aria-expanded', 'true');

    await toPill(page);
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link')).toHaveCount(0);
    await expect(nav).toHaveCSS('opacity', '1');
    expect(await logo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const pillBox = await nav.boundingBox();
    const logoBox = await logo.boundingBox();
    expect(pillBox.width - logoBox.width).toBeCloseTo(42, 0);
    expect(pillBox.height - logoBox.height).toBeCloseTo(34, 0);
    expect(logoBox.width).toBeCloseTo(169, 0);

    await brand.focus();
    await brand.press('Enter');
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    expect(parseFloat(await nav.evaluate(el => getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
    expect((await logo.boundingBox()).x).toBeCloseTo(logoBox.x, 0);
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(brand).toBeFocused();
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
  });
}

test('hover opens the pill mid-page', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await toPill(page);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  const pill = await nav.boundingBox();
  await page.mouse.move(pill.x + 8, pill.y + pill.height / 2);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(50, 600);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
});

test('the pill scrolling back in under a resting mouse stays closed', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  const bar = await nav.boundingBox();
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await toPill(page);
  await page.waitForTimeout(500); // Chrome sends its after-scroll mouse move within this
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
});

test('scrolling shrinks, hides and returns the pill without opening it', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await scrollTo(page, 200);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveCSS('opacity', '0');
  await expect(nav).toHaveClass(/is-scroll-hidden/);
  await expect(nav).toHaveCSS('pointer-events', 'none');
  await scrollTo(page, 150);
  await expect(nav).toHaveCSS('opacity', '1');
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await scrollTo(page, 0);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeInViewport();
});

test('scrolling closes a menu opened by click', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { brand } = navOf(page);
  await toPill(page);
  await brand.click();
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await scrollTo(page, 700);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
});

test('picking a link closes the menu', async ({ page }) => {
  await openPage(page);
  const { nav, brand } = navOf(page);
  await toPill(page);
  await brand.click();
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await nav.getByRole('link', { name: 'Our story' }).click();
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect
    .poll(() => page.evaluate(() => Math.abs(document.querySelector('#story').getBoundingClientRect().top)))
    .toBeLessThan(200);
});

test('keyboard focus reveals the nav after it has scrolled out of view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await scrollTo(page, 100);
  await expect(nav).toHaveCSS('opacity', '0');
  await brand.focus();
  await expect(nav).toHaveCSS('opacity', '1');
  await expect(brand).toBeInViewport();
  await brand.press('Enter');
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
});

test('resizing across the breakpoint updates the menu state', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('link')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('the menu opens on tap, closes on scroll and links to the real pages', async ({ page }) => {
    await page.goto('/leadership', { waitUntil: 'domcontentloaded' });
    const { nav, brand } = navOf(page);
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
    await brand.tap();
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Leadership' })).toHaveAttribute('aria-current', 'page');
    await scrollTo(page, 300);
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
    await scrollTo(page, 0);
    await brand.tap();
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    await nav.getByRole('link', { name: 'Groups' }).tap();
    await expect(page).toHaveURL(/\/groups\/?$/);
    await expect(navOf(page).brand).toHaveAttribute('aria-expanded', 'false');
  });
});

test('a page restored mid-scroll shows the pill without animating', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  await scrollTo(page, 900);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  const { nav, brand } = navOf(page);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  expect(await nav.evaluate(el => el.getAnimations().length)).toBe(0);
});

test('the nav holds still while changing pages', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', async event => {
      if (!event.viewTransition) return;
      await event.viewTransition.ready;
      window.__navAnims = document
        .getAnimations()
        .filter(animation => String(animation.effect?.pseudoElement).includes('site-header')).length;
    });
  });
  await openPage(page);
  await navOf(page).nav.getByRole('link', { name: 'Groups' }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect.poll(() => page.evaluate(() => window.__navAnims)).toBe(0);
});

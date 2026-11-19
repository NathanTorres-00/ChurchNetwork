import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

for (const path of ['home', 'groups', 'leadership']) {
  test(`${path} opens the floating navigation by keyboard`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (path === 'home') await openPage(page);
    else await page.goto(`/${path}`, { waitUntil: 'domcontentloaded' });

    const nav = page.getByRole('navigation', { name: 'Site navigation' });
    const brand = nav.getByRole('button', { name: 'The Rock Network menu' });
    const logo = brand.locator('img');
    await expect(brand).toBeVisible();
    expect(await logo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link')).toHaveCount(0);
    const pillBox = await nav.boundingBox();
    const logoBox = await logo.boundingBox();
    expect(pillBox.width - logoBox.width).toBeCloseTo(42, 0);
    expect(pillBox.height - logoBox.height).toBeCloseTo(34, 0);
    expect(logoBox.width).toBeCloseTo(169, 0);

    await brand.focus();
    await brand.press('Enter');
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    expect(parseFloat(await nav.evaluate(el => getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
    const openLogo = await logo.boundingBox();
    expect(openLogo.x).toBeCloseTo(logoBox.x, 0);
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(brand).toBeFocused();
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
  });
}

test('the pill opens on hover at the top of the page', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Site navigation' });
  const brand = nav.getByRole('button', { name: 'The Rock Network menu' });
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  const pill = await nav.boundingBox();
  await page.mouse.move(pill.x + 8, pill.y + pill.height / 2);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(50, 400);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
});

test('scrolling down hides the pill and scrolling up brings it back open', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Site navigation' });
  const brand = nav.getByRole('button', { name: 'The Rock Network menu' });
  await brand.hover();
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => window.scrollTo({ top: 10, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(10);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => window.scrollTo({ top: 18, behavior: 'instant' }));
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveCSS('opacity', '0');
  await expect(nav).toHaveCSS('pointer-events', 'none');
  const hiddenPill = await nav.boundingBox();
  expect(hiddenPill.y + hiddenPill.height).toBeLessThan(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toHaveCSS('opacity', '1');
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeInViewport();
});

test('keyboard focus reveals the nav after it has scrolled out of view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Site navigation' });
  const brand = nav.getByRole('button', { name: 'The Rock Network menu' });
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }));
  await expect(nav).toHaveCSS('opacity', '0');
  await brand.focus();
  await expect(nav).toHaveCSS('opacity', '1');
  await expect(brand).toBeInViewport();
  await brand.press('Enter');
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('the menu opens on tap and links to the real pages', async ({ page }) => {
    await page.goto('/leadership', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: 'Site navigation' });
    const brand = nav.getByRole('button', { name: 'The Rock Network menu' });
    await brand.tap();
    await expect(brand).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Leadership' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Groups' }).tap();
    await expect(page).toHaveURL(/\/groups\/?$/);
    await expect(brand).toHaveAttribute('aria-expanded', 'false');
  });
});

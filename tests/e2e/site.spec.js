// The site as a whole: Astro builds and serves it, and the standalone Wix demos still load as single files.
import { expect, test } from '@playwright/test';

test('the site builds and serves Home', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
});

for (const demo of ['network-multiply', 'network-globe', 'network-globe-pins', 'network-gallery']) {
  test(`${demo} still loads as a standalone file with no errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/${demo}.html`);
    await expect(page.locator('canvas').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

// The floating nav's links, as the live folder's floating nav has them (Home also has a hidden Find a hub)
const NAV = {
  '/': ['Home', 'What we do', 'How we do it', 'Our story', 'Groups', 'Leadership', 'App', 'Find a hub'],
  '/groups': ['Home', 'What we do', 'How we do it', 'Our story', 'Groups', 'Leadership', 'App'],
  '/leadership': ['Home', 'What we do', 'How we do it', 'Our story', 'Groups', 'Leadership', 'App'],
};

for (const [path, links] of Object.entries(NAV)) {
  test(`${path} has the site nav with its links in order`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.site-header .site-nav a')).toHaveText(links);
  });

  test(`${path} has the site footer: tagline, columns and wordmark`, async ({ page }) => {
    await page.goto(path);
    const footer = page.locator('footer.site-footer');
    await expect(footer.locator('.footer-tagline')).toHaveText('A New Testament Church Network returning to the original model.');
    await expect(footer.locator('.footer-cols h2')).toHaveText(['Explore', 'Connect', 'Policy']);
    await expect(footer.locator('.footer-mark .logo')).toBeVisible();
    await expect(footer.locator('.footer-bottom')).toHaveText('© 2026 The Rock Network');
  });
}

test('a placeholder link goes nowhere', async ({ page }) => {
  await page.goto('/groups');
  const before = page.url();
  await page.locator('.site-footer a[data-placeholder]').filter({ visible: true }).first().click();
  await page.waitForTimeout(300);
  expect(page.url()).toBe(before);
});

test('the site is set in Geist', async ({ page }) => {
  await page.goto('/groups');
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(/^"?Geist/);
});

test('Groups links back to Home from the header, and Home links to Groups', async ({ page }) => {
  await page.goto('/groups');
  await expect(page.locator('.site-header .site-nav a', { hasText: 'Groups' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.site-nav a', { hasText: 'Home' })).toHaveAttribute('href', '/');
  await page.goto('/');
  await expect(page.locator('.site-header .site-nav a', { hasText: 'Groups' })).toHaveAttribute('href', '/groups');
});

test('the footer\'s social links are hidden for now (main 722c2bf)', async ({ page }) => {
  await page.goto('/groups');
  await expect(page.locator('.footer-social')).toBeHidden();
});

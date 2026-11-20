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

test('closing the pill under the mouse keeps it closed until the mouse leaves', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await toPill(page);
  const pill = await nav.boundingBox();
  const x = pill.x + pill.width / 2;
  const y = pill.y + pill.height / 2;
  await page.mouse.move(x, y);
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await brand.click(); // pins it open
  await brand.click(); // closes it
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.move(x + 3, y);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.move(x + 3, y + 300); // leave
  await page.mouse.move(x, y); // and come back
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
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

test('resizing across the breakpoint swaps the bar for the phone bar', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  const menu = nav.getByRole('button', { name: 'Menu', exact: true });
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeHidden();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(brand).toBeHidden();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeHidden();
});

test('a narrow window never opens the old pill on hover', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav } = navOf(page);
  const box = await nav.boundingBox();
  const width = box.width;
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  expect((await nav.boundingBox()).width).toBeCloseTo(width, 0);
  await expect(nav.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

// Phones: the logo goes Home and a Menu button on the right opens one list from that side
test.describe('phone menu', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const phone = page => {
    const bar = page.getByRole('navigation', { name: 'Site navigation' });
    return {
      bar,
      toggle: bar.getByRole('button', { name: 'Menu', exact: true }),
      card: page.getByRole('navigation', { name: 'Menu', exact: true }),
    };
  };

  test('the phone bar has the logo home and a Menu button on the right', async ({ page }) => {
    await page.goto('/groups', { waitUntil: 'domcontentloaded' });
    const { bar, toggle, card } = phone(page);
    await expect(bar.getByRole('link', { name: 'The Rock Network home' })).toHaveAttribute('href', '/');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const box = await toggle.boundingBox();
    expect(390 - (box.x + box.width)).toBeLessThan(24);
    await expect(card).toBeHidden();
  });

  test('Menu opens one list from the right, pages first', async ({ page }) => {
    await page.goto('/leadership', { waitUntil: 'domcontentloaded' });
    const { toggle, card } = phone(page);
    await toggle.tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(card.getByRole('link')).toHaveText([
      'Home', 'Groups', 'Leadership', 'Videos', 'What we do', 'How we do it', 'Our story', 'App', 'Give',
    ]);
    await expect(card.getByRole('link', { name: 'Leadership' })).toHaveAttribute('aria-current', 'page');
    // Give is the green button across the bottom of the card
    const give = card.getByRole('link', { name: 'Give' });
    await expect(give).toHaveCSS('background-color', 'rgb(47, 125, 109)');
    const [giveBox, appBox] = [await give.boundingBox(), await card.getByRole('link', { name: 'App' }).boundingBox()];
    expect(giveBox.y).toBeGreaterThan(appBox.y);
    await expect.poll(async () => {
      const box = await card.boundingBox();
      return Boolean(box) && 390 - (box.x + box.width) < 24 && box.width > 200 && box.width < 300;
    }).toBe(true);
  });

  test('the close button restores focus from a menu link', async ({ page }) => {
    await page.goto('/groups', { waitUntil: 'domcontentloaded' });
    const { toggle, card } = phone(page);
    await toggle.tap();
    await card.getByRole('link', { name: 'Videos' }).focus();
    // Some browsers dispatch the click without focusing the button.
    await toggle.dispatchEvent('click');
    await expect(card).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('the menu closes on the dim, Escape, scrolling and a link', async ({ page }) => {
    await page.goto('/leadership', { waitUntil: 'domcontentloaded' });
    const { toggle, card } = phone(page);
    await toggle.tap();
    await expect(card).toBeVisible();
    await page.touchscreen.tap(30, 600);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(card).toBeHidden();

    await toggle.tap();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();

    await toggle.tap();
    await scrollTo(page, 300);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await scrollTo(page, 0);
    await toggle.tap();
    await card.getByRole('link', { name: 'Groups' }).tap();
    await expect(page).toHaveURL(/\/groups$/);
    await expect(phone(page).toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

test('a page restored mid-scroll shows the pill without animating', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  await scrollTo(page, 900);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  const { nav, brand } = navOf(page);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  expect(await nav.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});

// Playwright's Chromium runs without the back/forward cache, so the restore event is sent by hand
test('a back/forward restore mid-page redraws the pill without animating', async ({ page }) => {
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav, brand } = navOf(page);
  await toPill(page);
  await brand.click();
  await expect(brand).toHaveAttribute('aria-expanded', 'true');
  await scrollTo(page, 900);
  await expect(nav).toHaveClass(/is-scroll-hidden/);
  await nav.evaluate(el => el.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  // Read the state in the same task as the restore, before transitions switch back on
  const restored = await nav.evaluate(el => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return { classes: el.className, animations: el.getAnimations({ subtree: true }).length };
  });
  expect(restored.animations).toBe(0);
  expect(restored.classes).not.toMatch(/is-ready|is-scroll-hidden|is-open/);
  await expect(brand).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toHaveClass(/is-ready/);
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

test('Give is the green button at the right end of the open bar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/groups', { waitUntil: 'domcontentloaded' });
  const { nav } = navOf(page);
  const give = nav.getByRole('link', { name: 'Give' });
  await expect(give).toBeVisible();
  await expect(give).toHaveCSS('background-color', 'rgb(47, 125, 109)');
  await expect(give).toHaveCSS('color', 'rgb(255, 255, 255)');
  const [giveBox, appBox] = [await give.boundingBox(), await nav.getByRole('link', { name: 'App' }).boundingBox()];
  expect(giveBox.x).toBeGreaterThan(appBox.x);
});

// Find a hub: hovering a row fills it with the hub's color and ring-dots, and the hub cursor's three styles.
// How we do it reuses the same rows and cursor for its four points.
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

const HUBS = '/hero.html?showHubs=1';           // the section is hidden unless turned on

const fill = row => row.evaluate(el => getComputedStyle(el, '::before').opacity);
const ball = page => page.locator('#hub-cursor .ball');

async function hoverHub(page, n) {
  const row = page.locator('#hubs .hub-row').nth(n);
  await row.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await row.locator('h3').hover();
  return row;
}

test('Find a hub is hidden until turned on in the Adjust panel', async ({ page }) => {
  await openPage(page);
  await expect(page.locator('#hubs')).toBeHidden();
  await expect(page.locator('.site-nav a[href="#hubs"]')).toBeHidden();
  await page.locator('#adjust').click();
  await page.locator('#c-showHubs').check();
  await expect(page.locator('#hubs')).toBeVisible();
  await expect(page.locator('.site-nav a[href="#hubs"]')).toBeVisible();
});

test('hovering a hub fills it with its color and shows the ring-dots', async ({ page }) => {
  await openPage(page, HUBS);
  const row = await hoverHub(page, 1);
  await expect.poll(() => fill(row)).toBe('1');
  expect(await row.evaluate(el => getComputedStyle(el, '::before').backgroundColor)).toBe('rgb(194, 134, 26)');   // Leaders gold
  await expect(row.locator('h3')).toHaveCSS('color', 'rgb(245, 245, 246)');
  // a 4-row grid of dots beside the name, fully shown
  const dots = row.locator('.hub-dots i');
  expect((await dots.count()) % 4).toBe(0);
  expect(await dots.count()).toBeGreaterThanOrEqual(16);
  await expect.poll(() => dots.last().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  // the other rows stay plain
  expect(await fill(page.locator('#hubs .hub-row').nth(0))).toBe('0');
});

test('the dots never reach the name, and hide when there is no room', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await openPage(page, HUBS);
  for (const row of await page.locator('#hubs .hub-row').all()) {
    const dots = row.locator('.hub-dots');
    if (await dots.evaluate(el => el.hidden)) continue;
    const name = await row.locator('h3').evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().right; });
    const first = await dots.evaluate(el => el.getBoundingClientRect().left);
    expect(first).toBeGreaterThan(name);
  }
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(page.locator('#hubs .hub-dots').first()).toBeHidden();
});

test('the default hub cursor is a white circle with the arrow in the hub color', async ({ page }) => {
  await openPage(page, HUBS);
  await hoverHub(page, 0);
  await expect(ball(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(ball(page).locator('svg')).toHaveCSS('stroke', 'rgb(47, 125, 109)');
});

test('the ringed circle keeps the hub color with a white ring', async ({ page }) => {
  await openPage(page, HUBS + '&hubCursor=ring');
  await hoverHub(page, 2);
  await expect(ball(page)).toHaveCSS('background-color', 'rgb(63, 85, 168)');
  await expect(ball(page).locator('svg')).toHaveCSS('stroke', 'rgb(255, 255, 255)');
});

test('the photo cursor shows the hub photo instead of the circle and pin', async ({ page }) => {
  await openPage(page, HUBS + '&hubCursor=photo');
  const row = await hoverHub(page, 3);
  await expect(ball(page)).toBeHidden();
  await expect(page.locator('#hub-cursor .pin')).toBeHidden();
  const photo = page.locator('#hub-cursor .photo');
  await expect(photo).toBeVisible();
  const id = await row.getAttribute('data-photo');
  await expect.poll(() => photo.locator('img').evaluateAll((imgs, id) => imgs.some(i => i.src.includes(id) && getComputedStyle(i).opacity === '1'), id)).toBe(true);
});

test('the Adjust panel switches the hub cursor', async ({ page }) => {
  await openPage(page, HUBS);
  await expect(page.locator('html')).toHaveAttribute('data-hub-cursor', 'circle');
  await page.locator('#adjust').click();
  await page.locator('#c-hubCursor').selectOption('photo');
  await expect(page.locator('html')).toHaveAttribute('data-hub-cursor', 'photo');
});

test('How we do it shows its four points with the same rows and cursor', async ({ page }) => {
  await openPage(page);                           // on by default, unlike Find a hub
  const rows = page.locator('#how .hub-row');
  await expect(rows.locator('h3')).toHaveText(['Process', 'Tools', 'Training', 'Coaching']);
  const row = rows.nth(2);
  await row.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await row.locator('h3').hover();
  await expect.poll(() => fill(row)).toBe('1');
  expect(await row.evaluate(el => getComputedStyle(el, '::before').backgroundColor)).toBe('rgb(63, 85, 168)');   // Churches blue
  await expect.poll(() => row.locator('.hub-dots i').last().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await expect(ball(page).locator('svg')).toHaveCSS('stroke', 'rgb(63, 85, 168)');
  await expect.poll(() => page.locator('#hub-cursor').evaluate(el => el.style.getPropertyValue('--s'))).toBe('1');
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('rows stay plain', async ({ page }) => {
    await openPage(page, HUBS);
    const row = page.locator('#hubs .hub-row').first();
    await row.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await row.locator('h3').tap();
    expect(await fill(row)).toBe('0');
  });
});

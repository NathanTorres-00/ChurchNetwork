import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage, tool } from './helpers.js';

const center = b => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const composer = page => page.locator('.rv-composer');
const cards = page => page.locator('.rv-card');
const stat = (page, label) => page.locator('.rv-stat').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');

async function clickOn(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const p = center(await el.boundingBox());
  await page.mouse.click(p.x, p.y);
  return p;
}

async function post(page, text, { name } = {}) {
  await expect(composer(page)).toBeVisible();
  if (name) await composer(page).getByLabel('Your name').fill(name);
  if (text) await composer(page).getByLabel(/Comment|Note/).fill(text);
  await composer(page).getByRole('button', { name: /^Post/ }).click();
}

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

const seed = async (page, mark) => page.evaluate(async m => {
  while (!window.__reviewFake) await new Promise(r => setTimeout(r, 20));
  return window.__reviewFake.create(m);
}, {
  page: 'home', kind: 'comment', text: 'Seeded', author: 'Bo', deviceId: 'someone-else',
  at: { path: '#story', fx: 0.5, fy: 0.2, vw: 1440 }, ...mark,
});

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
});

test('places a comment on the headline', async ({ page }) => {
  const p = await clickOn(page, '.hero-title');
  await post(page, 'Make the cursor easier to see', { name: 'Ana' });
  const dot = page.locator('.rv-pin:not(.rv-draft) .rv-pin-dot');
  await expect(dot).toHaveCount(1);
  const d = center(await dot.boundingBox());
  expect(Math.abs(d.x - p.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(d.y - p.y)).toBeLessThanOrEqual(4);
  const card = cards(page).first();
  await expect(card).toContainText('Ana');
  await expect(card).toContainText('Make the cursor easier to see');
  await expect(card.locator('.rv-tag')).toHaveText('Comment');
  await expect(card).toContainText('just now');
  await expect(stat(page, 'Comments')).toHaveText('1');
  await expect(composer(page)).toHaveCount(0);
});

test('name is asked only once', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await post(page, 'First', { name: 'Ana' });
  await clickOn(page, '#story h2');
  await expect(composer(page)).toBeVisible();
  await expect(composer(page).getByLabel('Your name')).toHaveCount(0);
  await expect(composer(page)).toContainText('Posting as Ana');
  await post(page, 'Second');
  await expect(cards(page)).toHaveCount(2);
});

test('a name is required before posting', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await post(page, 'No name yet');
  await expect(composer(page).getByRole('alert')).toContainText('name');
  await expect(cards(page)).toHaveCount(0);
});

test('draws an arrow; an old box highlight still shows', async ({ page }) => {
  await tool(page, 'Arrow').click();
  await drag(page, { x: 400, y: 760 }, { x: 560, y: 690 });
  await post(page, '', { name: 'Ana' });
  await expect(page.locator('.rv-arrow:not(.rv-draft)')).toHaveCount(1);

  // the Highlight tool is gone, but highlights posted before the marker keep showing
  await seed(page, {
    kind: 'highlight', text: 'This area feels empty', at: undefined,
    from: { path: '#story', fx: 0.1, fy: 0.1, vw: 1440 }, to: { path: '#story', fx: 0.5, fy: 0.3, vw: 1440 },
  });
  await expect(page.locator('.rv-highlight:not(.rv-draft)')).toHaveCount(1);

  await expect(cards(page)).toHaveCount(2);
  await expect(stat(page, 'Arrows')).toHaveText('1');
  await expect(stat(page, 'Drawings')).toHaveText('1');
  await expect(cards(page).locator('.rv-tag')).toHaveText(['Arrow', 'Highlight']);
});

test('a short click with the arrow tool places nothing', async ({ page }) => {
  await tool(page, 'Arrow').click();
  await page.mouse.click(500, 500);
  await expect(composer(page)).toHaveCount(0);
});

test('marks stay on target at another width', async ({ page }) => {
  await clickOn(page, '#story .step:nth-child(3) h3');
  await post(page, 'Timeline step', { name: 'Ana' });
  await page.setViewportSize({ width: 1024, height: 800 });
  const h3 = page.locator('#story .step:nth-child(3) h3');
  await h3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await h3.boundingBox();
  const d = center(await page.locator('.rv-pin .rv-pin-dot').boundingBox());
  expect(d.x).toBeGreaterThanOrEqual(box.x);
  expect(d.x).toBeLessThanOrEqual(box.x + box.width);
  expect(d.y).toBeGreaterThanOrEqual(box.y);
  expect(d.y).toBeLessThanOrEqual(box.y + box.height);
});

test('clicking a card scrolls to its mark and selects it', async ({ page }) => {
  await clickOn(page, '#app .section-title');
  await post(page, 'App heading size', { name: 'Ana' });
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)));
  await expect(page.locator('.rv-pin')).not.toBeInViewport();
  await cards(page).first().click();
  await expect(page.locator('.rv-pin.rv-selected')).toBeInViewport();
  await expect(cards(page).first()).toHaveClass(/rv-card-selected/);
});

test('clicking a mark selects its card', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await post(page, 'One', { name: 'Ana' });
  await clickOn(page, '.hero-actions');
  await post(page, 'Two');
  await page.locator('.rv-pin').first().click();
  await expect(cards(page).nth(0)).toHaveClass(/rv-card-selected/);
  await expect(cards(page).nth(1)).not.toHaveClass(/rv-card-selected/);
});

test('failed post keeps the draft and retries', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await page.evaluate(() => window.__reviewFake.failNext('NETWORK'));
  await post(page, 'Try this twice', { name: 'Ana' });
  await expect(composer(page).getByRole('alert')).toContainText("Couldn't post");
  await expect(composer(page).getByLabel('Comment')).toHaveValue('Try this twice');
  await composer(page).getByRole('button', { name: /^Post/ }).click();
  await expect(cards(page)).toHaveCount(1);
});

test('exit with an unsent draft asks first', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByLabel('Comment').fill('Not sent yet');
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(composer(page).getByLabel('Comment')).toHaveValue('Not sent yet');
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

test('Esc with a draft asks before closing the composer', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByLabel('Comment').fill('Half written');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-toolbar')).toBeVisible();
});

test('owner can resolve and delete; resolved hide by default', async ({ page }) => {
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await page.goto('/hero.html?owner=test-owner&comment');
  await page.waitForFunction(() => window.__revealed === true);
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  await seed(page, { text: 'From an overseer' });
  const card = cards(page).filter({ hasText: 'From an overseer' });
  await expect(card).toHaveCount(1);
  await expect(page.locator('.rv-pin')).toHaveCount(1);

  await card.getByRole('button', { name: 'Resolve' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('.rv-pin')).toHaveCount(0);
  await expect(stat(page, 'Comments')).toHaveText('0');

  await page.getByRole('checkbox', { name: /Show resolved/ }).check();
  await expect(card).toHaveClass(/rv-resolved/);
  await card.getByRole('button', { name: 'Delete' }).click();
  await card.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(cards(page)).toHaveCount(0);
});

test('reviewers can delete only their own marks and cannot resolve', async ({ page }) => {
  await seed(page, { text: 'Someone else' });
  await clickOn(page, '.hero-sub');
  await post(page, 'Mine', { name: 'Ana' });
  const theirs = cards(page).filter({ hasText: 'Someone else' });
  const mine = cards(page).filter({ hasText: 'Mine' });
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(0);
  await expect(theirs.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  await mine.getByRole('button', { name: 'Delete' }).click();
  await mine.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(mine).toHaveCount(0);
});

test('moved mark is listed but not drawn', async ({ page }) => {
  await seed(page, { text: 'Lost', at: { path: '#nope > div:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 } });
  const card = cards(page).filter({ hasText: 'Lost' });
  await expect(card).toContainText('Moved');
  await expect(page.locator('.rv-pin:visible')).toHaveCount(0);
});

test('live updates arrive without refresh', async ({ page }) => {
  await expect(cards(page)).toHaveCount(0);
  await seed(page, { text: 'Arrived live' });
  await expect(cards(page).filter({ hasText: 'Arrived live' })).toHaveCount(1);
  await expect(page.locator('.rv-pin')).toHaveCount(1);
});

test("links don't navigate while placing", async ({ page }) => {
  await clickOn(page, '.hero-actions .button-primary');
  expect(await page.evaluate(() => location.hash)).toBe('');
  await expect(composer(page)).toBeVisible();
});

test('nothing remains after exit', async ({ page }) => {
  await clickOn(page, '.hero-sub');
  await post(page, 'Pin', { name: 'Ana' });
  await tool(page, 'Arrow').click();
  await drag(page, { x: 400, y: 760 }, { x: 560, y: 690 });
  await post(page, '');
  await expect(page.locator('.rv-arrow')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(page.locator('.rv-marks, .rv-pin, .rv-arrow, .rv-highlight, .rv-drawing')).toHaveCount(0);
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

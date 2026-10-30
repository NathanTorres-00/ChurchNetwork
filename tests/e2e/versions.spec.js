import { expect, test } from '@playwright/test';
import { intersects, openPage } from './helpers.js';

// The Versions panel reads /versions.json, which only the static build writes; each test serves a fixture list
// whose old builds are local pages, so the frame loads without the network.
const OLD = 'http://127.0.0.1:8792/network-multiply.html';
const FIXTURE = {
  available: true,
  versions: [
    { sha: 'c', href: 'http://127.0.0.1:8792/hero.html', createdAt: Date.UTC(2026, 9, 28, 18, 24), summary: 'Globe dots take the headline colors', current: true },
    { sha: 'b', href: OLD, createdAt: Date.UTC(2026, 9, 20, 21, 52), summary: 'Find a hub rows fill on hover', current: false },
    { sha: 'a', href: OLD, createdAt: Date.UTC(2026, 9, 16, 22, 0), summary: 'First build', current: false },
  ],
};

const panel = page => page.locator('#versions-panel');
const rows = page => page.locator('.versions-row');
const stage = page => page.locator('.versions-stage');
const frame = page => page.locator('.versions-frame');

async function serveList(page, reply = r => r.fulfill({ json: FIXTURE })) {
  await page.route('**/versions.json', reply);
}

test.describe('desktop', () => {
  test.beforeEach(async ({ page }) => {
    await serveList(page);
    await openPage(page);
  });

  test('pill opens and closes the panel', async ({ page }) => {
    await page.locator('#versions-toggle').click();
    await expect(panel(page)).toHaveClass(/is-open/);
    await expect(page.locator('.versions-status')).toHaveText(/^3 builds since Oct 1[56]$/);
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).first()).toContainText('Current');
    await page.locator('.versions-close').click();
    await expect(panel(page)).not.toHaveClass(/is-open/);
  });

  test('clicking an old version swaps it into the stage', async ({ page }) => {
    await page.locator('#versions-toggle').click();
    await rows(page).nth(1).click();
    await expect(stage(page)).toBeVisible();
    await expect(frame(page)).toHaveAttribute('src', /network-multiply\.html\?framed=versions$/);
    await expect(page.locator('.versions-bar')).toContainText('Viewing the');
    await expect(rows(page).nth(1)).toHaveClass(/is-viewing/);
    await expect(rows(page).nth(1)).toContainText('Viewing');
    await expect(page.locator('html')).toHaveAttribute('data-globe', 'paused');
  });

  test('back to current restores the live page', async ({ page }) => {
    await page.locator('#versions-toggle').click();
    await rows(page).nth(1).click();
    await expect(stage(page)).toBeVisible();
    await page.locator('.versions-back').click();
    await expect(stage(page)).toBeHidden();
    await expect(frame(page)).toHaveAttribute('src', 'about:blank');
    await expect(page.locator('html')).toHaveAttribute('data-globe', 'playing');
  });

  test('clicking the current row returns to the live page', async ({ page }) => {
    await page.locator('#versions-toggle').click();
    await rows(page).nth(2).click();
    await expect(stage(page)).toBeVisible();
    await rows(page).first().click();
    await expect(stage(page)).toBeHidden();
  });

  test('Esc closes the panel and returns to current', async ({ page }) => {
    await page.locator('#versions-toggle').click();
    await rows(page).nth(1).click();
    await expect(stage(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel(page)).not.toHaveClass(/is-open/);
    await expect(stage(page)).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-globe', 'playing');
  });
});

test('comment mode puts the live page back and hides Versions', async ({ page }) => {
  await serveList(page);
  await openPage(page);
  await page.locator('#versions-toggle').click();
  await rows(page).nth(1).click();
  await expect(stage(page)).toBeVisible();
  // the stage covers the header, so this is the keyboard's way in (or anything else that opens comment mode)
  await page.locator('#comment-toggle').dispatchEvent('click');
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  await expect(stage(page)).toBeHidden();
  await expect(panel(page)).toBeHidden();
  await expect(page.locator('#versions-toggle')).toBeHidden();
  // leaving comment mode lets the globe fly again: the two pauses don't trip over each other
  await expect(page.locator('html')).not.toHaveClass(/rv-gliding/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(page.locator('html')).not.toHaveClass(/review-open/, { timeout: 8000 });
  await expect(page.locator('html')).toHaveAttribute('data-globe', 'playing');
  await expect(page.locator('#versions-toggle')).toBeVisible();
});

test('Esc pressed inside a newer framed build returns to current', async ({ page }) => {
  const framedHero = { ...FIXTURE, versions: FIXTURE.versions.map((v, i) => (i === 1 ? { ...v, href: 'http://127.0.0.1:8792/hero.html' } : v)) };
  await serveList(page, r => r.fulfill({ json: framedHero }));
  await openPage(page);
  await page.locator('#versions-toggle').click();
  await rows(page).nth(1).click();
  await expect(stage(page)).toBeVisible();
  const inner = page.frameLocator('.versions-frame');
  await expect(inner.locator('body')).toBeVisible();
  await page.waitForFunction(() => document.querySelector('.versions-frame').contentWindow.__versionsFramed === true);
  await inner.locator('body').press('Escape');
  await expect(stage(page)).toBeHidden();
  await expect(panel(page)).not.toHaveClass(/is-open/);
});

test('missing list shows the note', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await serveList(page, r => r.fulfill({ status: 404, body: 'nope' }));
  await openPage(page);
  await page.locator('#versions-toggle').click();
  await expect(page.locator('.versions-status')).toHaveText("Version history isn't available right now");
  await expect(rows(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('framed builds hide the pill', async ({ page }) => {
  await serveList(page);
  await openPage(page, '/hero.html?framed=versions');
  await expect(page.locator('#versions-toggle')).toHaveCount(0);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await serveList(page);
    await openPage(page);
    await page.locator('#versions-toggle').tap();
    await expect(panel(page)).toHaveClass(/is-open/);
    await expect(rows(page)).toHaveCount(3);
  });

  test('phone: tapping a version shows it full screen', async ({ page }) => {
    await rows(page).nth(1).tap();
    await expect(panel(page)).not.toHaveClass(/is-open/);
    await expect(stage(page)).toBeVisible();
    const box = await stage(page).boundingBox();
    expect(box.x).toBe(0);
    expect(box.width).toBe(390);
    await expect(page.locator('.versions-reopen')).toBeVisible();
  });

  test('phone: Versions in the bar reopens the panel', async ({ page }) => {
    await rows(page).nth(1).tap();
    await expect(panel(page)).not.toHaveClass(/is-open/);
    await page.locator('.versions-reopen').tap();
    await expect(panel(page)).toHaveClass(/is-open/);
    await expect(stage(page)).toBeVisible();
  });

  test('phone: pill clears Adjust and the hero buttons', async ({ page }) => {
    await page.locator('.versions-close').tap();
    await expect(panel(page)).not.toHaveClass(/is-open/);
    await expect(page.locator('#versions-toggle')).toBeVisible();
    const pill = await page.locator('#versions-toggle').boundingBox();
    const others = page.locator('#adjust, .hero .button-primary, .hero .button-secondary');
    const count = await others.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await others.nth(i).boundingBox();
      if (box) expect(intersects(pill, box)).toBe(false);
    }
  });
});

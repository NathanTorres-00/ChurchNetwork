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

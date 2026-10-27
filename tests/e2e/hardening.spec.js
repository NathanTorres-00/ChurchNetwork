// Failure paths found in review: the mic left on, late or offline posts, and a lost connection.
import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage, tool } from './helpers.js';

const composer = page => page.locator('.rv-composer');
const cards = page => page.locator('.rv-card');

async function clickOn(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

// The mic prompt takes 1.5 s to answer, and every stream the page opens is kept for inspection
async function slowMic(page) {
  await page.addInitScript(() => {
    window.__streams = [];
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      await new Promise(r => setTimeout(r, 1500));
      const stream = await real(constraints);
      window.__streams.push(stream);
      return stream;
    };
  });
}
const liveTracks = page => page.evaluate(() => window.__streams.flatMap(s => s.getTracks()).filter(t => t.readyState === 'live').length);

async function startVoiceMemo(page) {
  await tool(page, 'Voice memo').click();
  await clickOn(page, '#story h2');
  await expect(page.locator('.rv-composer-voice')).toBeVisible();
  await composer(page).getByLabel('Your name').fill('Ana');
}

test.describe('the mic', () => {
  test.beforeEach(async ({ page }) => {
    await slowMic(page);
    await openPage(page);
    await enterCommentMode(page);
    await startVoiceMemo(page);
  });

  test('leaving while the mic prompt is up leaves no mic on', async ({ page }) => {
    await composer(page).getByRole('button', { name: 'Record' }).click();
    await page.getByRole('button', { name: 'Leave comment mode' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
    await expect(page.locator('[data-review-ui]')).toHaveCount(0);
    await page.waitForTimeout(2500);
    expect(await liveTracks(page)).toBe(0);
  });

  test('discarding while the mic prompt is up leaves no mic on', async ({ page }) => {
    await composer(page).getByRole('button', { name: 'Record' }).click();
    await composer(page).getByRole('button', { name: 'Discard' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
    await expect(composer(page)).toHaveCount(0);
    await page.waitForTimeout(2500);
    expect(await liveTracks(page)).toBe(0);
  });

  test('double-clicking Record opens the mic once', async ({ page }) => {
    await composer(page).getByRole('button', { name: 'Record' }).dblclick();
    await expect(composer(page).getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.__streams.length)).toBe(1);
    await composer(page).getByRole('button', { name: 'Stop' }).click();
    await expect(composer(page).locator('.rv-player')).toBeVisible();
    expect(await liveTracks(page)).toBe(0);
  });
});

test.describe('posting', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await enterCommentMode(page);
  });

  test('discarding a recorded memo asks first', async ({ page }) => {
    await startVoiceMemo(page);
    await composer(page).getByRole('button', { name: 'Record' }).click();
    await page.waitForTimeout(1200);
    await composer(page).getByRole('button', { name: 'Stop' }).click();
    await expect(composer(page).locator('.rv-player')).toBeVisible();
    await composer(page).getByRole('button', { name: 'Discard' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Keep editing' }).click();
    await expect(composer(page).locator('.rv-player')).toBeVisible();
  });

  test('a post that answers late does not close a newer draft', async ({ page }) => {
    await clickOn(page, '.hero-lead');
    await composer(page).getByLabel('Your name').fill('Ana');
    await composer(page).getByLabel('Comment').fill('First, held');
    await page.evaluate(() => window.__reviewFake.holdNext());
    await composer(page).getByRole('button', { name: 'Post comment' }).click();
    await composer(page).getByRole('button', { name: 'Cancel' }).click();
    await clickOn(page, '#story h2');
    await composer(page).getByLabel('Comment').fill('Second, still typing');
    await page.evaluate(() => window.__reviewFake.release());
    await expect(cards(page)).toHaveCount(1);
    await expect(composer(page).getByLabel('Comment')).toHaveValue('Second, still typing');
    await expect(page.locator('.rv-pin.rv-draft')).toHaveCount(1);
  });

  test('an offline post says so and can be tried again', async ({ page }) => {
    await clickOn(page, '.hero-lead');
    await composer(page).getByLabel('Your name').fill('Ana');
    await composer(page).getByLabel('Comment').fill('Sent while offline');
    await page.evaluate(() => window.__reviewFake.failNext('TIMEOUT'));
    await composer(page).getByRole('button', { name: 'Post comment' }).click();
    await expect(composer(page).getByRole('alert')).toContainText('offline');
    await composer(page).getByRole('button', { name: 'Post comment' }).click();
    await expect(cards(page)).toHaveCount(1);
  });
});

test('"Link copied" stays when the connection finishes after Share review', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // the connection waits until the test lets it through
  await page.addInitScript(() => { window.__reviewFakeConnectGate = new Promise(r => { window.__openGate = r; }); });
  await openPage(page);
  await enterCommentMode(page);
  await page.getByRole('button', { name: 'Share review' }).click();
  await expect(page.locator('.rv-status')).toHaveText('Link copied');
  await page.evaluate(() => window.__openGate());                     // now it connects
  await expect.poll(() => page.evaluate(() => !!window.__reviewFake)).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator('.rv-status')).toHaveText('Link copied');  // well inside its 2.4 s
});

test('posting recovers when the connection comes back', async ({ page }) => {
  await page.addInitScript(() => { window.__reviewFakeFailConnect = 1; });
  await openPage(page);
  await enterCommentMode(page);
  await expect(page.locator('.rv-status')).toContainText("Can't reach");
  await clickOn(page, '.hero-lead');
  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByLabel('Comment').fill('After reconnecting');
  await composer(page).getByRole('button', { name: 'Post comment' }).click();
  await expect(cards(page)).toHaveCount(1);
});

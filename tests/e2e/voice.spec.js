import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage, tool } from './helpers.js';

const composer = page => page.locator('.rv-composer');
const cards = page => page.locator('.rv-card');

async function startVoiceMemo(page, name = 'Ana') {
  await tool(page, 'Voice memo').click();
  const timeline = page.locator('#story .timeline');
  await timeline.scrollIntoViewIfNeeded();
  const b = await timeline.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + 20);
  await expect(page.locator('.rv-composer-voice')).toBeVisible();
  if (name) await composer(page).getByLabel('Your name').fill(name);
}

async function record(page, ms = 1600) {
  await composer(page).getByRole('button', { name: 'Record' }).click();
  await expect(composer(page).getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.waitForTimeout(ms);
  await composer(page).getByRole('button', { name: 'Stop' }).click();
  await expect(composer(page).locator('.rv-player')).toBeVisible();
}

test.describe('with a microphone', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
    await enterCommentMode(page);
  });

  test('records and posts a voice memo', async ({ page }) => {
    await startVoiceMemo(page);
    await composer(page).getByRole('button', { name: 'Record' }).click();
    const timer = composer(page).locator('.rv-rec-time');
    await expect(timer).toHaveText('0:00');
    await expect(timer).toHaveText('0:01', { timeout: 3000 });
    await page.waitForTimeout(600);
    const seconds = text => { const [m, s] = text.split(':').map(Number); return m * 60 + s; };
    // read the timer and press Stop in the same moment, so a slow click under load can't skew the comparison
    const atStop = seconds(await page.evaluate(() => {
      const shown = document.querySelector('.rv-composer .rv-rec-time').textContent;
      document.querySelector('.rv-composer .rv-stop').click();
      return shown;
    }));
    const preview = composer(page).locator('.rv-player');
    await expect(preview.getByRole('button', { name: 'Play voice memo' })).toBeVisible();
    // the memo's length matches what the timer showed when Stop was pressed (give or take a second)
    const length = await preview.locator('.rv-duration').textContent();
    expect(Math.abs(seconds(length) - atStop)).toBeLessThanOrEqual(1);
    await composer(page).getByLabel('Title (optional)').fill('About the timeline');
    await composer(page).getByRole('button', { name: 'Post voice memo' }).click();

    const card = cards(page).first();
    await expect(card.locator('.rv-tag')).toHaveText('Voice memo');
    await expect(card).toContainText('About the timeline');
    await expect(card.locator('.rv-duration')).toHaveText(length);
    await expect(page.locator('.rv-pin-voice:not(.rv-draft)')).toHaveCount(1);
    await expect(page.locator('.rv-stat').filter({ hasText: 'Voice memos' }).locator('dd')).toHaveText('1');
    await card.getByRole('button', { name: 'Play voice memo' }).click();
    await expect.poll(() => card.locator('audio').evaluate(a => a.paused)).toBe(false);
    await expect(card.getByRole('button', { name: 'Pause voice memo' })).toBeVisible();
  });

  test('re-record and discard', async ({ page }) => {
    await startVoiceMemo(page);
    await record(page);
    await composer(page).getByRole('button', { name: 'Re-record' }).click();
    await expect(composer(page).locator('.rv-player')).toHaveCount(0);
    await expect(composer(page).getByRole('button', { name: 'Stop' })).toBeVisible();
    await composer(page).getByRole('button', { name: 'Stop' }).click();
    await composer(page).getByRole('button', { name: 'Discard' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
    await expect(composer(page)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(0);
  });

  test('a memo must be recorded before posting', async ({ page }) => {
    await startVoiceMemo(page);
    await composer(page).getByRole('button', { name: 'Post voice memo' }).click();
    await expect(composer(page).getByRole('alert')).toContainText('Record');
    await expect(cards(page)).toHaveCount(0);
  });

  test('exit while recording asks first', async ({ page }) => {
    await startVoiceMemo(page);
    await composer(page).getByRole('button', { name: 'Record' }).click();
    await expect(composer(page).getByRole('button', { name: 'Stop' })).toBeVisible();
    await page.getByRole('button', { name: 'Leave comment mode' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Keep editing' }).click();
    await expect(composer(page).getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(composer(page).locator('.rv-rec-time')).not.toHaveText('0:00', { timeout: 3000 });
  });

  test('failed upload keeps the recording', async ({ page }) => {
    await startVoiceMemo(page);
    await record(page);
    await page.evaluate(() => window.__reviewFake.failNext('NETWORK'));
    await composer(page).getByRole('button', { name: 'Post voice memo' }).click();
    await expect(composer(page).getByRole('alert')).toContainText("Couldn't post");
    await expect(composer(page).locator('.rv-player')).toBeVisible();
    await composer(page).getByRole('button', { name: 'Post voice memo' }).click();
    await expect(cards(page)).toHaveCount(1);
  });
});

test('stops at the limit', async ({ page }) => {
  await page.addInitScript(() => { window.__reviewMaxVoiceMs = 1500; });
  await openPage(page);
  await enterCommentMode(page);
  await startVoiceMemo(page);
  await composer(page).getByRole('button', { name: 'Record' }).click();
  await expect(composer(page).locator('.rv-player')).toBeVisible({ timeout: 5000 });
  await expect(composer(page)).toContainText('Memos can be up to 3 minutes');
});

test('mic denied shows a message', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await openPage(page);
  await enterCommentMode(page);
  await startVoiceMemo(page);
  await composer(page).getByRole('button', { name: 'Record' }).click();
  await expect(composer(page)).toContainText('microphone is blocked');
  const pin = await page.locator('.rv-pin.rv-draft .rv-pin-dot').boundingBox();
  await composer(page).getByRole('button', { name: 'Type a comment instead' }).click();
  await expect(page.locator('.rv-composer-comment')).toBeVisible();
  await expect(tool(page, 'Comment')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.rv-pin.rv-draft .rv-pin-dot').boundingBox()).toEqual(pin);
});

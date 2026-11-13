// What is a New Testament Church Network?: the welcome video, poster first, playing on the play button.
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

test('the welcome video shows its poster and starts on the play button', async ({ page }) => {
  await openPage(page);
  const box = page.locator('#intro-video');
  const video = box.locator('video');
  await expect(video).toHaveAttribute('src', 'assets/welcome-to-the-rock-network.mp4');
  await expect(video).toHaveAttribute('poster', 'assets/welcome-to-the-rock-network.jpg');
  expect(await video.evaluate(v => v.controls)).toBe(false);
  const poster = await page.request.get('/assets/welcome-to-the-rock-network.jpg');
  expect(poster.ok()).toBe(true);
  const file = await page.request.head('/assets/welcome-to-the-rock-network.mp4');
  expect(file.ok()).toBe(true);

  await box.scrollIntoViewIfNeeded();
  await box.locator('.play').click();
  await expect(box).toHaveClass(/is-started/);
  expect(await video.evaluate(v => v.controls)).toBe(true);
  await expect(box.locator('.play')).toHaveCSS('opacity', '0');
});

// Jesus Disciple's Vision and How-to cards play their Vimeo videos in a dialog
import { expect, test } from '@playwright/test';
import { openPage } from './helpers.js';

const VIDEOS = {
  'Vision video: Multiplication Matters': '1248454493',
  'Vision video: Think Small': '1248454430',
  'Vision video: New Testament Networks': '1248457128',
  'Vision video: Prayer and Persons of Peace': '1248454393',
  'Vision video: Healing and Miracles': '1248457129',
  "Vision video: It's Your Turn": '1248454477',
  'How to use Jesus Disciple: What is it?': '1248454398',
  'How to use Jesus Disciple: Why use it?': '1248454392',
  'How to use Jesus Disciple: How it works': '1248454391',
};

test('every Vision and How-to card opens its Vimeo video, and closing stops it', async ({ page }) => {
  await page.route('**/player.vimeo.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>player</p>' }));
  await openPage(page);
  const app = page.locator('#app');
  for (const [name, id] of Object.entries(VIDEOS))
    await expect(app.getByRole('link', { name, exact: true })).toHaveAttribute('href', new RegExp(`player\\.vimeo\\.com/video/${id}\\?`));

  const card = app.getByRole('link', { name: 'Vision video: Healing and Miracles', exact: true });
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const player = page.locator('.video-player_wrap');
  await expect(player).toHaveAttribute('open', '');
  await expect(player.locator('iframe')).toHaveAttribute('src', /video\/1248457129\?.*autoplay=1/);
  // the video fills the box, and a small close button sits outside its top-right corner
  const screen = await player.locator('.video-player_screen').boundingBox();
  const frame = await player.locator('iframe').boundingBox();
  expect(frame).toEqual(screen);
  const close = player.getByRole('button', { name: 'Close video' });
  const button = await close.boundingBox();
  expect(button.y + button.height).toBeLessThanOrEqual(screen.y);
  expect(button.x + button.width).toBeCloseTo(screen.x + screen.width, 0);
  await page.keyboard.press('Escape');
  await expect(player).not.toHaveAttribute('open', '');
  await card.click();
  await expect(player).toHaveAttribute('open', '');
  await close.click();
  await expect(player).not.toHaveAttribute('open', '');
  await expect(player.locator('iframe')).toHaveCount(0);
  await expect(card).toBeFocused();
});

test('the Stories series plays all five videos in the widescreen Vimeo player on Home and Videos', async ({ page }) => {
  const stories = [
    ['Helen Horton & Leslie Bley', '1248517411'],
    ['Anita and Jose', '1248517413'],
    ['Anastasia Brownbridge', '1248517412'],
    ['Jose Serrano', '1248517417'],
    ['Brandon and Rocco', '1248517488'],
  ];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/player.vimeo.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>player</p>' }));

  for (const path of ['/', '/videos']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('list', { name: 'Jesus Disciple Stories' }).or(
      page.getByRole('region', { name: 'Jesus Disciple Stories' }),
    );
    await expect(row.getByRole('link')).toHaveCount(5);
    for (const [name, id] of stories) {
      const card = row.getByRole('link', { name: `Jesus Disciple story: ${name}`, exact: true });
      await card.focus();
      await page.keyboard.press('Enter');
      const player = page.getByRole('dialog', { name: `Jesus Disciple story: ${name}` });
      const frame = player.locator('iframe');
      await expect(frame).toHaveAttribute('src', new RegExp(`/video/${id}\\?.*autoplay=1`));
      const box = await frame.boundingBox();
      expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
      await player.getByRole('button', { name: 'Close video' }).click();
      await expect(card).toBeFocused();
    }
  }
});

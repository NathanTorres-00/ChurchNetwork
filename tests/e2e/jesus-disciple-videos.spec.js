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
  const player = page.locator('.jesus-disciple_player');
  await expect(player).toHaveAttribute('open', '');
  await expect(player.locator('iframe')).toHaveAttribute('src', /video\/1248457129\?.*autoplay=1/);
  await page.keyboard.press('Escape');
  await expect(player).not.toHaveAttribute('open', '');
  await expect(player.locator('iframe')).toHaveCount(0);
  await expect(card).toBeFocused();
});

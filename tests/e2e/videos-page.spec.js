// The Videos page: a featured hero and a row per series, all playing in the shared video player
import { expect, test } from '@playwright/test';

const stubVimeo = page =>
  page.route('**/player.vimeo.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>player</p>' }));

test('the Videos page lists every Jesus Disciple video by series, from the nav', async ({ page }) => {
  await page.goto('/groups');
  await page.getByRole('navigation', { name: 'Site navigation' }).getByRole('link', { name: 'Videos' }).click();
  await expect(page).toHaveURL(/\/videos$/);
  await expect(page).toHaveTitle(/Videos/);
  await expect(page.getByRole('heading', { level: 1, name: 'Videos' })).toBeAttached();

  const vision = page.getByRole('region', { name: 'Vision Videos' });
  await expect(vision.getByRole('link')).toHaveCount(6);
  await expect(vision.getByRole('link', { name: 'Vision video: Healing and Miracles' })).toHaveAttribute('href', /video\/1248457129\?/);
  const howTo = page.getByRole('region', { name: 'How to use Jesus Disciple' });
  await expect(howTo.getByRole('link')).toHaveCount(3);
  await expect(howTo.locator('.video-row_length').first()).toHaveText('5:11');
});

test('the hero features one video at a time and plays it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // keeps it from moving on by itself
  await stubVimeo(page);
  await page.route('**/youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>player</p>' }));
  await page.goto('/videos');
  const hero = page.getByRole('region', { name: 'Featured videos' });
  const current = hero.locator('.videos-hero_slide.is-on');
  await expect(current.getByRole('heading', { level: 2 })).toHaveText('Weekly Church Group Video | November 13 - 19, 2026');
  const player = page.locator('.video-player_wrap');
  await current.getByRole('link', { name: 'Play' }).click();
  await expect(player.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/P0oEK8HicGM\?.*autoplay=1/);
  await page.keyboard.press('Escape');
  await expect(player.locator('iframe')).toHaveCount(0);

  await hero.getByRole('button', { name: 'Next featured video' }).click();
  await expect(current.getByRole('heading', { level: 2 })).toHaveText('Multiplication Matters');
  await expect(current.locator('.videos-hero_meta')).toHaveText('3 min 46 sec');

  await hero.getByRole('button', { name: 'Next featured video' }).click();
  await expect(current.getByRole('heading', { level: 2 })).toHaveText('What is it?');
  await hero.getByRole('button', { name: 'Show Think Small' }).click();
  await expect(current.getByRole('heading', { level: 2 })).toHaveText('Think Small');
  await expect(hero.getByRole('button', { name: 'Show Think Small' })).toHaveAttribute('aria-current', 'true');
  await expect(hero.locator('.videos-hero_slide[inert]')).toHaveCount(4);

  await current.getByRole('link', { name: 'Play' }).click();
  await expect(player).toHaveAttribute('open', '');
  await expect(player).toHaveAttribute('aria-label', 'Vision video: Think Small');
  await expect(player.locator('iframe')).toHaveAttribute('src', /video\/1248454430\?.*autoplay=1/);
  await page.keyboard.press('Escape');
  await expect(player.locator('iframe')).toHaveCount(0);
});

test('the hero moves on by itself until someone chooses', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-20T12:01:00Z'));
  await page.goto('/videos');
  await page.mouse.move(5, 890); // away from the hero
  const title = page.locator('.videos-hero_slide.is-on h2');
  await expect(title).toHaveText('Weekly Church Group Video | November 13 - 19, 2026');
  await page.clock.runFor(9000);
  await expect(title).toHaveText('Weekly Church Group Video | November 13 - 19, 2026');
  await page.clock.runFor(1100);
  await expect(title).toHaveText('Multiplication Matters');
  await page.getByRole('button', { name: 'Show Think Small' }).click();
  await page.mouse.move(5, 890);
  await page.clock.runFor(20000);
  await expect(title).toHaveText('Think Small');
});

test('a series row plays its videos and its arrows scroll it', async ({ page }) => {
  await stubVimeo(page);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/videos');
  const vision = page.getByRole('region', { name: 'Vision Videos' });
  const list = vision.locator('.video-row_list');
  await vision.scrollIntoViewIfNeeded();
  await expect(vision.getByRole('button', { name: 'Scroll Vision Videos back' })).toBeDisabled();
  await vision.getByRole('button', { name: 'Scroll Vision Videos forward' }).click();
  await expect.poll(() => list.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);

  const tile = vision.getByRole('link', { name: "Vision video: It's Your Turn" });
  await tile.click();
  const player = page.locator('.video-player_wrap');
  await expect(player.locator('iframe')).toHaveAttribute('src', /video\/1248454477\?/);
  await player.getByRole('button', { name: 'Close video' }).click();
  await expect(tile).toBeFocused();
});


test('Vimeo previews start promptly and resume without waiting for video dimensions', async ({ page }) => {
  await page.route('**/player.vimeo.com/**', route => route.fulfill({
    contentType: 'text/html',
    body: `<script>
      parent.postMessage({ event: 'ready' }, new URL(document.referrer).origin);
      addEventListener('message', event => {
        const { method } = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const send = message => parent.postMessage(message, event.origin);
        if (method === 'ping') send({ method });
        if (method === 'play') {
          send({ method });
          send({ event: 'timeupdate', data: { seconds: 4.5 } });
        }
      });
    </script>`,
  }));
  await page.goto('/videos');
  const hero = page.getByRole('region', { name: 'Featured videos' });
  await expect(hero.locator('iframe')).toHaveCount(0);
  const current = hero.locator('.videos-hero_slide.is-on');
  for (const id of ['1248454493', '1248454398', '1248454430', '1248454477']) {
    await hero.getByRole('button', { name: 'Next featured video' }).click();
    await expect(current.locator('iframe')).toHaveAttribute('src', new RegExp(`/video/${id}.*background=1.*muted=1`), { timeout: 1000 });
    await expect(current.locator('iframe')).toHaveCSS('opacity', '1');
    await expect(hero.locator('iframe')).toHaveCount(1);
  }
  await current.getByRole('link', { name: 'Play' }).click();
  await expect(page.locator('.video-player_wrap iframe')).toHaveAttribute('src', /autoplay=1#t=4s$/);
  await expect(hero.locator('iframe')).toHaveCount(0);
});

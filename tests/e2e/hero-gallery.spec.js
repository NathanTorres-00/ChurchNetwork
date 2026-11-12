// The hero's Art option: the Pins globe (default) or the Gallery, with a quiet centre around the copy.
import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage } from './helpers.js';

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return errors;
}
const group = (page, name) => page.locator('#groups section.group', { has: page.locator('h2', { hasText: name }) });
const galleryState = page => page.evaluate(() => window.__heroGallery && { playing: window.__heroGallery.playing, running: window.__heroGallery.running });

async function chooseArt(page, art) {
  if (!(await page.locator('#panel').evaluate(el => el.classList.contains('is-open')))) await page.locator('#adjust').click();
  await page.locator(`.layout-picker [data-art="${art}"]`).click();
}

test('pins is the default art', async ({ page }) => {
  const engine = [];
  page.on('request', r => { if (r.url().endsWith('/assets/network-gallery.js')) engine.push(r.url()); });
  await openPage(page);
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  await page.waitForTimeout(3000);
  expect(engine).toEqual([]);
  await expect(page.locator('#c-gallerySpin')).toHaveCount(0);
});

test('switching art to Gallery and back works without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await openPage(page);
  await chooseArt(page, 'gallery');
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'gallery');
  await expect(page.locator('#gallery-canvas')).toBeVisible();
  await expect(page.locator('#canvas')).toBeHidden();
  await expect(page.locator('#pins')).toBeHidden();
  await expect(page.locator('.hero-scrim')).toBeHidden();
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
  await expect(group(page, 'Gallery: camera')).toBeVisible();
  await expect(group(page, 'Globe: flight')).toBeHidden();

  await chooseArt(page, 'pins');
  await expect(page.locator('#gallery-canvas')).toBeHidden();
  await expect(page.locator('#canvas')).toBeVisible();
  expect((await galleryState(page)).running).toBe(false);
  await expect(group(page, 'Globe: flight')).toBeVisible();
  await expect(group(page, 'Gallery: camera')).toBeHidden();
  expect(errors).toEqual([]);
});

test('switching art quickly leaves one art running', async ({ page }) => {
  await openPage(page);
  await page.locator('#adjust').click();
  await page.evaluate(() => {
    const b = a => document.querySelector(`.layout-picker [data-art="${a}"]`);
    b('gallery').click(); b('pins').click(); b('gallery').click(); b('pins').click();
  });
  await page.waitForTimeout(1500);
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  const g = await galleryState(page);
  expect(g ? g.running : false).toBe(false);
  await expect(page.locator('#canvas')).toBeVisible();
});

test('gallery starts from the address without the panel', async ({ page }) => {
  await openPage(page, '/hero.html?heroArt=gallery&controls=0');
  await expect.poll(() => galleryState(page), { timeout: 5000 }).toEqual({ playing: true, running: true });
  await expect(page.locator('#gallery-canvas')).toBeVisible();
});

test('Pause globe and Restart globe act on the gallery', async ({ page }) => {
  await openPage(page, '/hero.html?heroArt=gallery');
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
  await page.locator('#adjust').click();
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Play globe');
  expect((await galleryState(page)).playing).toBe(false);
  await page.locator('#restart').click();
  await expect(page.locator('#play')).toHaveText('Pause globe');
  expect((await galleryState(page)).playing).toBe(true);
});

test('comment mode holds the gallery still', async ({ page }) => {
  await openPage(page, '/hero.html?heroArt=gallery');
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
  await enterCommentMode(page);
  expect((await galleryState(page)).playing).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('data-globe', 'paused');
});

test('reset returns to the pins globe', async ({ page }) => {
  const errors = watchErrors(page);
  await openPage(page);
  await chooseArt(page, 'gallery');
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
  await page.locator('#reset').click();
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  await expect(page.locator('#canvas')).toBeVisible();
  expect((await galleryState(page)).running).toBe(false);
  expect(errors).toEqual([]);
});

test('Copy settings includes the gallery keys', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPage(page);
  await page.locator('#adjust').click();
  await page.locator('#copy').click();
  await expect(page.locator('#copy')).toHaveText('Copied');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('"heroArt"');
  expect(text).toContain('"gallerySpin"');
  expect(text).toContain('"galleryQuietSoftness"');
});

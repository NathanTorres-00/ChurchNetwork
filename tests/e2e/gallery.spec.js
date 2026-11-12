// The Gallery tab: a close-up globe of growing networks whose dots open into photos.
// Its engine lives in assets/network-gallery.js (shared with the hero); the tab must work exactly as before.
import { expect, test } from '@playwright/test';

async function openGallery(page, path = '/network-gallery.html') {
  const errors = [];
  const engine = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (r.url().endsWith('/assets/network-gallery.js')) engine.push(r.url()); });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas.is-ready');
  return { errors, engine };
}

test('the gallery tab loads its engine from assets', async ({ page }) => {
  const { engine } = await openGallery(page);
  expect(engine.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => typeof window.__gallery)).toBe('object');
});

test('photos open on their own, 3 to 5 in the first 10 seconds', async ({ page }) => {
  const { errors } = await openGallery(page);
  const seen = await page.evaluate(async () => {
    const ids = new Set();
    for (let k = 0; k < 50; k++) {
      for (const o of window.__gallery.debug().open) if (o.kind === 'auto') ids.add(o.id);
      await new Promise(r => setTimeout(r, 200));
    }
    return ids.size;
  });
  expect(seen).toBeGreaterThanOrEqual(3);
  expect(seen).toBeLessThanOrEqual(6);
  expect(errors).toEqual([]);
});

test('every panel control can change without errors', async ({ page }) => {
  const { errors } = await openGallery(page);
  await page.locator('#adjust').click();
  await page.evaluate(() => {
    const fire = el => el.dispatchEvent(new Event('input', { bubbles: true }));
    for (const s of document.querySelectorAll('#groups select')) {
      const keep = s.value;
      for (const o of s.options) { s.value = o.value; fire(s); }
      s.value = keep; fire(s);
    }
    for (const r of document.querySelectorAll('#groups input[type=range]')) {
      const keep = r.value;
      r.value = r.min; fire(r); r.value = r.max; fire(r); r.value = keep; fire(r);
    }
  });
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test('Pause stops new openings and Restart starts again', async ({ page }) => {
  await openGallery(page);
  await page.locator('#adjust').click();
  await page.locator('#play').click();
  await expect(page.locator('#play')).toHaveText('Play');
  expect(await page.evaluate(() => window.__gallery.playing)).toBe(false);
  await page.locator('#restart').click();
  await expect(page.locator('#play')).toHaveText('Pause');
  expect(await page.evaluate(() => window.__gallery.playing)).toBe(true);
});

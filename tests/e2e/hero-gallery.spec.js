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

test('the pins globe is the default art', async ({ page }) => {
  await openPage(page);
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('#gallery-canvas')).toBeHidden();
});

test('the pins globe never loads the gallery engine', async ({ page }) => {
  const engine = [];
  page.on('request', r => { if (r.url().endsWith('/assets/network-gallery.js')) engine.push(r.url()); });
  await openPage(page, '/hero.html?heroArt=pins');
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  await page.waitForTimeout(3000);
  expect(engine).toEqual([]);
  await expect(page.locator('#c-gallerySpin')).toHaveCount(0);
});

test('switching art to Gallery and back works without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await openPage(page, '/hero.html?heroArt=pins');
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
  await openPage(page, '/hero.html?heroArt=pins');
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

test('reset returns to the default art, the pins globe', async ({ page }) => {
  const errors = watchErrors(page);
  await openPage(page);
  await chooseArt(page, 'gallery');
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
  await page.locator('#reset').click();
  await expect(page.locator('.hero')).toHaveAttribute('data-art', 'pins');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(async () => (await galleryState(page)).running).toBe(false);
  expect(errors).toEqual([]);
});

test('Copy settings includes the gallery keys', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPage(page);
  await page.locator('#adjust').click();
  await page.locator('#copy').click();
  // the clipboard, not the button's brief "Copied", which can come and go between polls on a busy machine
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 15_000 }).toContain('"heroArt"');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('"heroArt"');
  expect(text).toContain('"gallerySpin"');
  expect(text).toContain('"galleryQuietSoftness"');
});

/* ---------- The Gallery behind the copy ---------- */

const NO_PHOTOS = page => page.route('**/images.unsplash.com/**', r => r.abort());   // keeps the canvas readable

async function openHeroGallery(page, extra = '') {
  await page.addInitScript(() => {
    window.__words = [];
    document.addEventListener('heroword', e => {
      window.__words.push({ ...e.detail, at: performance.now(), opened: !document.documentElement.classList.contains('is-loading') });
      if (e.detail.phase === 'shown' && !document.documentElement.classList.contains('is-loading') && window.__firstShown == null) window.__firstShown = performance.now();
    });
  });
  await openPage(page, '/hero.html?heroArt=gallery' + extra);
  await expect.poll(() => galleryState(page)).toEqual({ playing: true, running: true });
}

// Every 200 ms for `ms`, the quiet centre and the automatic openings, in canvas px
function sampleOpenings(page, ms) {
  return page.evaluate(async ms => {
    const out = [];
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const q = window.__heroQuiet();
      for (const o of window.__heroGallery.debug().open) if (o.kind === 'auto') out.push({ ...o, q, at: performance.now() });
      await new Promise(r => setTimeout(r, 200));
    }
    return out;
  }, ms);
}
const touchesQuiet = ({ x, y, R, q }) => ((x - q.cx) / (q.rx + R)) ** 2 + ((y - q.cy) / (q.ry + R)) ** 2 < 0.98;

test('no photo opens inside the quiet centre or below the straight edge', async ({ page }) => {
  test.setTimeout(90_000);
  await openHeroGallery(page);
  const heroH = await page.locator('.hero').evaluate(el => el.offsetHeight);
  const open = await sampleOpenings(page, 15_000);
  expect(new Set(open.map(o => o.id)).size).toBeGreaterThan(0);
  expect(open.filter(touchesQuiet)).toEqual([]);
  // Openings start at least galleryEdgeRoom (40) above the straight edge; the turning globe may carry them a little lower
  const firsts = [...new Map(open.map(o => [o.id, o])).values()];
  expect(firsts.filter(o => o.y + o.R > heroH - 40 + 1)).toEqual([]);
});

test('the headline announces each word', async ({ page }) => {
  test.setTimeout(60_000);
  await openHeroGallery(page);
  // Only what the headline says once the page has opened (it cycles quietly behind the loading screen)
  await expect.poll(() => page.evaluate(() => window.__words.some(w => w.opened && w.index === 1)), { timeout: 20_000 }).toBe(true);
  const words = await page.evaluate(() => window.__words.filter(w => w.opened));
  const first = words.filter(w => w.index === 0);
  expect(first.some(w => w.phase === 'typing')).toBe(true);
  expect(first.some(w => w.phase === 'shown')).toBe(true);
  expect(first[0].color).toMatch(/^#2f7d6d$/i);   // Disciples
});

test('lines take the word colour while drawing', async ({ page }) => {
  await NO_PHOTOS(page);
  await openHeroGallery(page, '&galleryGrowStart=edge&galleryNetLineWidth=3');
  const found = await page.evaluate(async () => {
    const c = document.getElementById('gallery-canvas'), ctx = c.getContext('2d');
    const near = (d, r, g, b) => { for (let i = 0; i < d.length; i += 4) if (Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b) < 40) return true; return false; };
    for (let k = 0; k < 20; k++) {
      const words = window.__words.filter(w => w.phase === 'typing');
      const hex = (words.length ? words[words.length - 1].color : '#2F7D6D').slice(1);
      const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
      if (near(ctx.getImageData(0, 0, c.width, c.height).data, r, g, b)) return true;
      await new Promise(res => setTimeout(res, 200));
    }
    return false;
  });
  expect(found).toBe(true);
});

test('the first photo waits for the first word', async ({ page }) => {
  test.setTimeout(60_000);
  await openHeroGallery(page);
  const firstAuto = await page.evaluate(async () => {
    while (true) {
      if (window.__heroGallery.debug().open.some(o => o.kind === 'auto')) return performance.now();
      await new Promise(r => setTimeout(r, 50));
    }
  });
  const firstShown = await page.evaluate(() => window.__firstShown);
  expect(firstShown).not.toBeUndefined();
  expect(firstAuto).toBeGreaterThan(firstShown);
});

test('quiet centre follows the copy after resize and align change', async ({ page }) => {
  await openHeroGallery(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.locator('#adjust').click();
  await page.locator('.layout-picker [data-align="left"]').click();
  await page.locator('#close').click();
  await expect.poll(async () => (await page.evaluate(() => window.__heroQuiet())).cx).toBeLessThan(500);
  const { q, c } = await page.evaluate(() => {
    const b = document.getElementById('hero-copy').getBoundingClientRect(), g = document.getElementById('gallery-canvas').getBoundingClientRect();
    return { q: window.__heroQuiet(), c: { x: (b.left + b.right) / 2 - g.left, y: (b.top + b.bottom) / 2 - g.top } };
  });
  expect(((c.x - q.cx) / q.rx) ** 2 + ((c.y - q.cy) / q.ry) ** 2).toBeLessThan(1);
});

test('hovering the copy never opens a photo', async ({ page }) => {
  await openHeroGallery(page);
  const spots = await page.evaluate(() => {
    const t = document.querySelector('.hero-title').getBoundingClientRect();
    const [a, b] = [...document.querySelectorAll('.hero-actions .button')].map(el => el.getBoundingClientRect());
    return [[(t.left + t.right) / 2, (t.top + t.bottom) / 2], [(a.right + b.left) / 2, (a.top + a.bottom) / 2]];
  });
  for (const [x, y] of spots) {
    await page.mouse.move(x, y);
    for (let k = 0; k < 5; k++) {
      await page.waitForTimeout(200);
      expect((await page.evaluate(() => window.__heroGallery.debug().open)).filter(o => o.kind === 'hover')).toEqual([]);
    }
  }
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('photos open only above and below the text', async ({ page }) => {
    test.setTimeout(60_000);
    await openHeroGallery(page);
    const open = await sampleOpenings(page, 12_000);
    expect(open.filter(({ y, R, q }) => !(y + R <= q.cy - q.ry || y - R >= q.cy + q.ry))).toEqual([]);
  });

  test('openings can be turned off', async ({ page }) => {
    await openHeroGallery(page, '&galleryPhoneOpenings=off');
    const open = await sampleOpenings(page, 8000);
    expect(open).toEqual([]);
  });
});

test('reduced motion shows a still gallery', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page, '/hero.html?heroArt=gallery');
  await expect.poll(() => page.evaluate(() => !!window.__heroGallery?.running)).toBe(true);
  await page.waitForTimeout(5000);
  expect((await galleryState(page)).playing).toBe(false);
  expect((await page.evaluate(() => window.__heroGallery.debug().open)).filter(o => o.kind === 'auto')).toEqual([]);
  // hovering a dot away from the copy still opens it
  const spot = await page.evaluate(() => {
    const q = window.__heroQuiet(), g = document.getElementById('gallery-canvas').getBoundingClientRect();
    const d = window.__heroGallery.debug().dots
      .filter(d => d.r > 12 && d.y > 120 && d.y < g.height - 120 && d.x > 40 && d.x < g.width - 40)
      .find(d => ((d.x - q.cx) / (q.rx + d.r)) ** 2 + ((d.y - q.cy) / (q.ry + d.r)) ** 2 > 1.2);
    return d && { x: d.x + g.left, y: d.y + g.top };
  });
  expect(spot).toBeTruthy();
  await page.mouse.move(spot.x, spot.y);
  await expect.poll(async () => (await page.evaluate(() => window.__heroGallery.debug().open)).some(o => o.kind === 'hover')).toBe(true);
});

test('hovering a dot next to the copy never grows a photo over it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });          // a still view, so the dot stays put
  await openPage(page, '/hero.html?heroArt=gallery');
  await expect.poll(() => page.evaluate(() => !!window.__heroGallery?.running)).toBe(true);
  await page.waitForTimeout(500);
  const spot = await page.evaluate(() => {
    const q = window.__heroQuiet(), g = document.getElementById('gallery-canvas').getBoundingClientRect();
    const hover = 2.9;                                               // galleryHoverSize
    const d = window.__heroGallery.debug().dots.filter(d => d.y > 110 && d.r > 3).find(d => {
      const out = ((d.x - q.cx) / q.rx) ** 2 + ((d.y - q.cy) / q.ry) ** 2 > 1.02;   // the dot itself is outside
      const R = d.r * hover;
      return out && ((d.x - q.cx) / (q.rx + R)) ** 2 + ((d.y - q.cy) / (q.ry + R)) ** 2 < 1;   // its photo would reach in
    });
    return d && { x: d.x + g.left, y: d.y + g.top };
  });
  expect(spot).toBeTruthy();
  await page.mouse.move(spot.x, spot.y);
  await page.waitForTimeout(800);
  expect((await page.evaluate(() => window.__heroGallery.debug().open)).filter(o => o.kind === 'hover')).toEqual([]);
});

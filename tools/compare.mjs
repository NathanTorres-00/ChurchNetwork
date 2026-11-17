#!/usr/bin/env node
// Side-by-side screenshots of the old site and the new one, for checking a port by eye.
//
//   node tools/compare.mjs --old /groups.html --new /groups [--selector '#what']
//
// The old site is served from ../NetworkMultiply on port 8792
//   (cd ../NetworkMultiply && python3 -m http.server 8792 --bind 127.0.0.1)
// and the new one by `npm run dev` or `npm run preview` on port 4321.
// Shots go to test-results/compare/<name>-<width>-old.png and -new.png, with ?controls=0 added
// so the Adjust panels stay out of the picture.
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OLD_ORIGIN = 'http://127.0.0.1:8792';
const NEW_ORIGIN = 'http://127.0.0.1:4321';
const WIDTHS = [390, 768, 1440];
const OUT = 'test-results/compare';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (!key || argv[i + 1] === undefined) throw new Error(`missing value for ${argv[i]}`);
    out[key] = argv[i + 1];
  }
  if (!out.old || !out.new) {
    throw new Error("usage: node tools/compare.mjs --old /groups.html --new /groups [--selector '#what']");
  }
  return out;
}

function withControlsOff(origin, path) {
  const url = new URL(path, origin);
  url.searchParams.set('controls', '0');
  return url.href;
}

// "groups" from /groups.html, "home" from /, plus the selector when there is one
function shotName(path, selector) {
  const base = path.replace(/^\//, '').replace(/\.html$/, '').replace(/[^\w-]+/g, '-') || 'home';
  const part = selector ? '-' + selector.replace(/[^\w-]+/g, '') : '';
  return base + part;
}

async function shoot(browser, url, width, selector, file) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  // pages with a loading screen fire page:revealed; others are ready at load
  await page.addInitScript(() => {
    window.addEventListener('page:revealed', () => { window.__revealed = true; });
  });
  await page.goto(url, { waitUntil: 'load' });
  // Home holds `is-loading` on <html> until its loading screen opens and fires page:revealed
  await page.waitForFunction(
    () => window.__revealed === true || !document.documentElement.classList.contains('is-loading'),
    null, { timeout: 30_000 },
  );
  await page.waitForTimeout(1500); // let entrance animations settle
  if (selector) {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await el.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: true });
  }
  await page.close();
}

const opts = args(process.argv.slice(2));
const name = shotName(opts.old, opts.selector);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    for (const [side, origin, path] of [['old', OLD_ORIGIN, opts.old], ['new', NEW_ORIGIN, opts.new]]) {
      const file = `${OUT}/${name}-${width}-${side}.png`;
      try {
        await shoot(browser, withControlsOff(origin, path), width, opts.selector, file);
        console.log(file);
      } catch (err) {
        console.error(`${side} ${width}: ${err.message.split('\n')[0]}`);
        process.exitCode = 1;
      }
    }
  }
} finally {
  await browser.close();
}

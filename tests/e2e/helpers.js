// Note when the loading screen has opened, then wait for it
export async function openPage(page, path = '/') {
  await page.addInitScript(() => {
    window.addEventListener('page:revealed', () => { window.__revealed = true; });
  });
  // the page is ready when its loading screen opens; waiting for every photo would tie tests to Unsplash's speed
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__revealed === true, null, { timeout: 30_000 });
}

export function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

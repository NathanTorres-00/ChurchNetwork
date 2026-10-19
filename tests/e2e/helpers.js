import { expect } from '@playwright/test';

// Use the in-memory store and note when the loading screen has opened
export async function useFakeStore(page) {
  await page.addInitScript(() => {
    window.__reviewStoreFactory = 'fake';
    window.addEventListener('page:revealed', () => { window.__revealed = true; });
  });
}

export async function openPage(page, path = '/hero.html') {
  await useFakeStore(page);
  // the page is ready when its loading screen opens; waiting for every photo would tie tests to Unsplash's speed
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__revealed === true, null, { timeout: 30_000 });
}

export async function enterCommentMode(page) {
  await page.locator('#comment-toggle').click();
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  // the page has landed in its column (a person clicks the page once it's there, not mid-glide)
  await expect(page.locator('html')).not.toHaveClass(/rv-gliding/, { timeout: 10_000 });
}

export const tool = (page, name) => page.locator('.rv-rail').getByRole('button', { name, exact: true });

export function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

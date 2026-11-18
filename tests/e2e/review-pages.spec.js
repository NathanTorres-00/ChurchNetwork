import { expect, test } from '@playwright/test';
import { enterCommentMode, intersects, tool, useFakeStore } from './helpers.js';

for (const [slug, title, other] of [
  ['groups', 'Groups', 'leadership'],
  ['leadership', 'Leadership', 'groups'],
]) {
  test(`${title} scrolls with the wheel in the desktop review workspace`, async ({ page }) => {
    await useFakeStore(page);
    await page.goto(`/${slug}.html?comment`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rv-toolbar')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/rv-gliding/);

    const scrollPosition = () => page.evaluate(() => window.scrollY);
    const before = await scrollPosition();
    const content = await page.locator('main').boundingBox();
    await page.mouse.move(content.x + content.width / 2, 450);
    await page.mouse.wheel(0, 500);
    await expect.poll(scrollPosition).toBeGreaterThan(before + 200);
  });

  test(`${title} follows a two-finger scroll while the Marker is selected`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    try {
      await useFakeStore(page);
      await page.goto(`/${slug}.html?comment`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.rv-toolbar')).toBeVisible();
      await expect(page.locator('html')).not.toHaveClass(/rv-gliding/);
      await tool(page, 'Marker').tap();

      const scrollPosition = () => page.evaluate(() => window.scrollY);
      const before = await scrollPosition();
      const cdp = await page.context().newCDPSession(page);
      const sendTouch = (type, height) => cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: height == null ? [] : [150, 240].map((x, id) => ({ x, y: height, id })),
      });
      await sendTouch('touchStart', 600);
      for (let height = 550; height >= 250; height -= 50) await sendTouch('touchMove', height);
      await sendTouch('touchEnd');
      await expect.poll(scrollPosition).toBeGreaterThan(before + 250);
      await expect(page.locator('.rv-drawing.rv-draft')).toHaveCount(0);
    } finally {
      await page.close();
    }
  });

  test(`${title} has its own review thread and share link`, async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await useFakeStore(page);
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(`/${slug}.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Comment', exact: true })).toBeVisible();
    expect(requests.filter(url => url.includes('/review/'))).toEqual([]);

    await enterCommentMode(page);
    await expect(page.locator('.rv-reviewing')).toHaveText(`Reviewing Church Network — ${title}`);
    await page.setViewportSize({ width: 1280, height: 900 });
    const button = page.locator('#comment-toggle');
    const bounds = await page.locator('.site-header .wrap').boundingBox();
    const buttonBounds = await button.boundingBox();
    expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width - 24);
    expect(intersects(await page.locator('.site-header .brand').boundingBox(), await page.locator('.site-nav').boundingBox())).toBe(false);
    const heading = page.locator('main h1');
    await heading.scrollIntoViewIfNeeded();
    const box = await heading.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const composer = page.locator('.rv-composer');
    await composer.getByLabel('Your name').fill('Ana');
    await composer.getByLabel('Comment', { exact: true }).fill('Review this heading');
    await composer.getByRole('button', { name: /^Post/ }).click();
    await expect(page.locator('.rv-card')).toContainText('Review this heading');
    expect(await page.evaluate(() => window.__reviewFake.marks.map(mark => ({
      page: mark.page, anchoredToHeading: document.querySelector(mark.at.path) === document.querySelector('main h1'),
    })))).toEqual([{ page: slug, anchoredToHeading: true }]);

    const readClipboard = () => page.evaluate(() => navigator.clipboard.readText());
    await page.getByRole('button', { name: 'Copy for agent' }).click();
    await expect.poll(readClipboard).toContain(`Church Network — ${title}`);
    expect(await readClipboard()).toContain(`${slug}.html`);
    await page.getByRole('button', { name: 'Share review' }).click();
    await expect.poll(readClipboard).toBe(new URL(`/${slug}.html?comment`, page.url()).href);

    await page.getByRole('button', { name: 'Leave comment mode' }).click();
    await expect(page.locator('.rv-toolbar')).toHaveCount(0);
    await enterCommentMode(page);
    await expect(page.locator('.rv-card')).toContainText('Review this heading');
    await tool(page, 'Comment').click();
    await page.locator(`.site-nav a[href="${other}.html"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${other}\\.html$`));
    await expect(page.locator('#comment-toggle')).toBeVisible();

    await page.goto(`/${other}.html?comment`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.rv-toolbar')).toBeVisible();
    await expect(page.locator('.rv-card')).toHaveCount(0);

    await page.getByRole('button', { name: 'Leave comment mode' }).click();
    await expect(page.locator('.rv-toolbar')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await enterCommentMode(page);
    await expect(page.locator('.rv-rail')).toBeInViewport();
  });
}

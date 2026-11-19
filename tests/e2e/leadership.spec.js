// Leadership page: the network's leaders and its group leaders, as lists and as ring-dots on two orbits.
// Ported from main 5f3b046. Local and preview builds show it; production leaves it out (tests/unit/leadership.test.js).
import { expect, test } from '@playwright/test';

test('lists every leader once per list, with a photo and a name, and no errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/leadership');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leadership');
  await expect(page.locator('.people-network .person')).toHaveCount(9);
  await expect(page.locator('.people-group .person')).toHaveCount(18);
  for (const img of await page.locator('.person img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator('.people-network')).toContainText("Jose & Isabel O'Neill");
  expect(errors).toEqual([]);
});

test('the orbits hold each person once, network leaders inside, and link to their place in the list', async ({ page }) => {
  await page.goto('/leadership');
  await expect(page.locator('.node.is-network')).toHaveCount(9);
  await expect(page.locator('.node.is-group')).toHaveCount(15);   // the three who are both sit on the inner orbit
  const names = await page.locator('.node').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label')));
  expect(new Set(names).size).toBe(names.length);
  // inner orbit is closer to the center than the outer one, once the leaders have finished growing out from it
  await page.waitForFunction(() => document.querySelector('.orbit.is-growing') && document.getAnimations().every(a => a.playState !== 'running'));
  const dist = sel => page.locator(sel).first().evaluate(n => {
    const o = n.parentElement.getBoundingClientRect(), r = n.getBoundingClientRect();
    return Math.hypot(r.x + r.width / 2 - (o.x + o.width / 2), r.y + r.height / 2 - (o.y + o.height / 2)) / o.width;
  });
  expect(await dist('.node.is-network')).toBeLessThan(await dist('.node.is-group'));
  const node = page.locator('.node', { hasText: 'Corey Theetge' });
  await node.hover();
  await expect(node.locator('.node-name')).toBeVisible();
  await node.click();
  await expect(page).toHaveURL(/#p-corey-theetge$/);
  await expect(page.locator('#p-corey-theetge')).toBeInViewport();
});

test('Groups shows four leaders and links to the Leadership page, which every page links to', async ({ page }) => {
  await page.goto('/groups');
  await expect(page.locator('#team .team-member_wrap')).toHaveCount(4);
  await page.locator('#team').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('#team .team-member_photo').first().evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  const box = await page.locator('#team .team-member_photo').first().boundingBox();
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);   // round, not stretched
  await expect(page.getByRole('link', { name: 'See all our leaders' })).toHaveAttribute('href', '/leadership');
  for (const path of ['/', '/groups']) {
    await page.goto(path);
    await expect(page.locator('.site-nav a', { hasText: 'Leadership' })).toHaveAttribute('href', '/leadership');
  }
});

test('Leadership does not scroll sideways on a phone or a tablet', async ({ page }) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/leadership');
    await expect(page.locator('.node')).toHaveCount(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

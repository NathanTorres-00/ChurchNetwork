// Leadership page: the network's leaders and its group leaders, as lists and as ring-dots on two orbits.
// Ported from main 5f3b046. Local and preview builds show it; production leaves it out (tests/unit/leadership.test.js).
import { expect, test } from '@playwright/test';

test('shows the leadership team with roles, the overseers by region, ministry and sub-network, and no errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/leadership');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leadership');
  const team = page.locator('#groups-leadership .people-team .person');
  await expect(team).toHaveCount(4);
  await expect(team.locator('.person-role')).toHaveText(['Director', 'Asst. Director', 'Operations', 'Admin Asst.']);
  await expect(page.locator('#group-leaders h3')).toHaveText(['By Region', 'By Ministry & Online', 'Sub-Networks']);
  await expect(page.locator('#group-leaders h4')).toHaveCount(13);
  await expect(page.locator('#network-leaders')).toHaveCount(0);   // The Rock Leaders is hidden (main 77af76e)
  for (const img of await page.locator('.person img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Sub-Networks' }).click();
  await expect(page.locator('#sub-networks')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('the orbit holds each person once and links to their place in the list', async ({ page }) => {
  await page.goto('/leadership');
  await expect(page.locator('.node.is-group')).toHaveCount(20);
  await expect(page.locator('.node.is-network')).toHaveCount(0);
  const names = await page.locator('.node').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label')));
  expect(new Set(names).size).toBe(names.length);
  expect(names[0]).toBe('Jerry Dirmann');
  const node = page.locator('.node', { hasText: 'Helen Horton' });
  await node.hover();
  await expect(node.locator('.node-name')).toBeVisible();
  await node.click();
  await expect(page).toHaveURL(/#p-helen$/);
  await expect(page.locator('#p-helen')).toBeInViewport();
});

test('the hero dots ripple near the pointer', async ({ page }) => {
  await page.goto('/leadership');
  const canvas = page.locator('.lead-hero_field');
  const sample = () => canvas.evaluate(c => c.toDataURL());
  const still = await sample();
  const box = await page.locator('.lead-hero').boundingBox();
  await page.mouse.move(box.x + 200, box.y + 300);
  await page.mouse.move(box.x + 220, box.y + 320);
  await expect.poll(sample).not.toBe(still);
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
    await expect(page.locator('.node')).toHaveCount(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

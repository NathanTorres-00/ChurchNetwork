// Leadership page: a directory by assignment and a Groups leadership orbit.
import { expect, test } from '@playwright/test';

test('lists leaders by team, assignment, and sub-network, with working portraits', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/leadership.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leadership');
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Rock Groups Leadership Team', 'Regional Overseers', 'Lead a group with us',
  ]);
  await expect(page.locator('#network-leaders')).toBeHidden();
  await expect(page.getByRole('link', { name: 'The Rock Leaders', exact: true })).toHaveCount(0);
  await expect(page.locator('.orbit-key')).not.toContainText('The Rock Leaders');
  await expect(page.locator('#groups-leadership .person')).toHaveText([
    /Jerry Dirmann\s*Director/, /Tina Shubin\s*Asst\. Director/,
    /Eryne Nevarez\s*Operations/, /Crissy Shubin\s*Admin Asst\./,
  ]);
  await expect(page.locator('#groups-leadership img[src$="tina-shubin.jpg"]')).toHaveCount(1);
  for (const [assignment, names] of [
    ['Los Angeles & Orange County', ['Jerry Dirmann', 'David & Roxy Crosby', 'David & Paulina Cadena']],
    ['The Rock West', ['Manny & Andrea Orozco']],
    ['Western U.S.', ['Helen Horton']],
    ['Eastern U.S.', ['Misti Osmialowski', 'Mary Lee Zawrotny']],
    ['San Bernardino/Riverside Counties', ['Christy Mireles']],
    ['Online', ['Ben Flores']],
    ['Abide Youth', ['Alex Sierra', 'Michael Gomez']],
    ['Beyond Young Adults', ['Jared Nitzel']],
    ['Jesus Clubs', ['Nicole Nitzel']],
    ['The Rock Anaheim Men’s Ministry', ['Brian Palacios', 'Michael Jaimes']],
    ['Iglesia Mi Ciudad', ["Jose & Isabel O'Neill"]],
    ['To Serve Mankind', ['Jeff & Jennifer Little']],
    ['Backyard Revival', ['Nicole Nitzel']],
  ]) {
    const card = page.getByRole('region', { name: assignment, exact: true });
    await expect(card.locator('.person-name')).toHaveText(names);
  }
  await expect(page.locator('#sub-networks .person')).toHaveCount(3);
  for (const img of await page.locator('.person img:visible').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('the Groups orbit excludes The Rock Leaders except for Jerry and links to his Director card', async ({ page }) => {
  await page.goto('/leadership.html');
  await expect(page.locator('#orbit circle')).toHaveCount(1);
  await expect(page.locator('#orbit .node')).toHaveCount(18);
  const names = await page.locator('#orbit .node').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  expect(names).toEqual(expect.arrayContaining(['Jerry Dirmann', 'Tina Shubin', 'Ben Flores']));
  expect(new Set(names).size).toBe(names.length);
  for (const name of [
    'Kimberly Dirmann', 'Jonathan Dirmann', 'Carl McAulay', 'Corey Theetge', 'Jim Scott',
    "Jose & Isabel O'Neill", 'Manny & Andrea Orozco', 'Tristan Fenholt',
  ]) expect(names).not.toContain(name);
  const linksResolve = await page.locator('.node').evaluateAll(nodes => nodes.every(node =>
    document.getElementById(node.hash.slice(1))?.querySelector('.person-name').textContent === node.getAttribute('aria-label')
  ));
  expect(linksResolve).toBe(true);
  const node = page.locator('#orbit').getByRole('link', { name: 'Jerry Dirmann', exact: true });
  await node.hover();
  await expect(node.locator('.node-name')).toBeVisible();
  await node.click();
  await expect(page).toHaveURL(/#p-jerry-dirmann$/);
  await expect(page.locator('#groups-leadership #p-jerry-dirmann')).toBeInViewport();
});

test('the regional directory fits a narrow screen and can be reached from the hero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/leadership.html');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Regional Overseers' }).click();
  await expect(page).toHaveURL(/#group-leaders$/);
  await expect(page.getByRole('heading', { name: 'Regional Overseers', exact: true })).toBeInViewport();
  expect(await page.locator('body').evaluate(body => body.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Groups features the Rock Groups Leadership Team and links to the full directory', async ({ page }) => {
  await page.goto('/groups.html');
  const team = page.locator('#team');
  await expect(team.getByRole('heading', { level: 2 })).toHaveText('Rock Groups Leadership Team');
  await expect(team.locator('.member')).toHaveText([
    /Jerry Dirmann\s*Director/, /Tina Shubin\s*Asst\. Director/,
    /Eryne Nevarez\s*Operations/, /Crissy Shubin\s*Admin Asst\./,
  ]);
  for (const portrait of await team.locator('.member img').all()) {
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth)).toBeGreaterThan(0);
    const box = await portrait.boundingBox();
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  }
  await expect(page.getByRole('link', { name: 'See all our leaders' })).toHaveAttribute('href', 'leadership.html');
  for (const path of ['/hero.html', '/groups.html']) {
    await page.goto(path);
    await expect(page.locator('.site-nav a', { hasText: 'Leadership' })).toHaveAttribute('href', 'leadership.html');
  }
});

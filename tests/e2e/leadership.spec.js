// Leadership page: a directory by assignment and two orbits with one dot per roster entry.
import { expect, test } from '@playwright/test';

test('lists leaders by team, assignment, and sub-network, with working portraits', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/leadership.html');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leadership');
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
    'Rock Groups Leadership Team', 'Regional Overseers', 'The Rock Leaders', 'Lead a group with us',
  ]);
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
  await expect(page.locator('.people-network .person')).toHaveCount(9);
  for (const img of await page.locator('.person img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator('.people-network')).toContainText("Jose & Isabel O'Neill");
  expect(errors).toEqual([]);
});

test('the orbits hold each person once, network leaders inside, and link to their place in the list', async ({ page }) => {
  await page.goto('/leadership.html');
  await expect(page.locator('.node.is-network')).toHaveCount(9);
  await expect(page.locator('.node.is-group')).toHaveCount(17);
  const names = await page.locator('.node').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label')));
  expect(new Set(names).size).toBe(names.length);
  const linksResolve = await page.locator('.node').evaluateAll(nodes => nodes.every(node =>
    document.getElementById(node.hash.slice(1))?.querySelector('.person-name').textContent === node.getAttribute('aria-label')
  ));
  expect(linksResolve).toBe(true);
  // inner orbit is closer to the center than the outer one
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

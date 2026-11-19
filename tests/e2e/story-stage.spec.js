// How we got started: the Story stage (ported from main dc5b9f5)
import { expect, test } from '@playwright/test';

const on = page => page.locator('#story .story-stage_step.is-on h3');

test('the stages play by themselves, hold while hovered, and stop once one is chosen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('#story .story-stage_wrap');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveClass(/is-in/);
  await expect(on(page)).toHaveText('One local church');
  await expect(page.locator('#story .story-stage_scene')).toHaveCount(4);
  await expect(page.locator('#story .story-stage_scene.is-on')).toHaveCount(1);

  await page.clock.runFor(6100);
  await expect(on(page)).toHaveText('Disciples became leaders');
  await expect(page.locator('#story .story-stage_caption span')).toHaveText('Disciples became leaders', { timeout: 3000 });

  await page.locator('#story .story-stage_steps').hover();
  await expect(stage).toHaveClass(/is-holding/);
  await page.clock.runFor(8000);
  await expect(on(page)).toHaveText('Disciples became leaders');

  await page.locator('#story .story-stage_step').nth(3).click();
  await expect(stage).toHaveClass(/is-manual/);
  await expect(on(page)).toHaveText('Network sent missionaries');
  await expect(page.locator('#story .story-stage_step').nth(3).getByRole('button')).toHaveAttribute('aria-current', 'step');
  await page.mouse.move(5, 5);
  await page.clock.runFor(12000);
  await expect(on(page)).toHaveText('Network sent missionaries');
});

test('a stage can be chosen from the keyboard', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('#story .story-stage_wrap');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveClass(/is-in/);
  await page.getByRole('button', { name: 'Groups became churches' }).focus();
  await page.keyboard.press('Enter');
  await expect(on(page)).toHaveText('Groups became churches');
});

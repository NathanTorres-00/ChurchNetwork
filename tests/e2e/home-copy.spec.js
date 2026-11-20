// Ported from main 722c2bf.
import { expect, test } from '@playwright/test';

test('Jesus Disciple shows the pastor heading, bold subheadings and updated JDU copy', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const app = page.locator('#app');
  await expect(app.locator('h2 + h3')).toHaveText('Are you a Pastor?');
  for (const name of ['Are you a Pastor?', 'Vision Videos', 'How to use Jesus Disciple', 'Jesus Disciple Stories', 'Jesus Disciple University']) {
    await expect(app.getByRole('heading', { name, level: 3, exact: true })).toHaveCSS('font-weight', '700');
  }
  await expect(app.getByRole('link', { name: 'Use the Jesus Disciple App to Launch your own New Testament Network' }))
    .toHaveAttribute('href', 'https://www.jesusdisciple.com/ministryleaders');
  await expect(app.locator('.jdu').getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', 'https://www.jesusdisciple.com/jdu');
  await expect(app.locator('.jdu-text')).toHaveText('JDU provides online training for disciple-makers, leaders, pastors, and missionaries from churches and ministries globally.');
});

test('How we got started tells the four stages of multiplication', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#story h2')).toHaveText('How we got started:from one local church to a global movement.');
  await expect(page.locator('#story .story-stage_step')).toHaveText([
    'Multiplied disciples One local church began making disciples who make disciples',
    'Multiplied leaders Disciples became leaders that started new groups',
    'Multiplied churches Groups became churches forming a network',
    'Multiplied movements Network sent missionaries to repeat the process',
  ], { useInnerText: true });   // the rendered text: the build drops the whitespace between the step's paragraphs
});

test('the updated sections fit on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  for (const selector of ['.jd-heading', '#app .jesus-disciple_subtitle', '.reel-head', '.jdu-body', '.story-stage_steps', '.story-stage_title']) {
    for (const element of await page.locator(selector).all()) {
      expect(await element.evaluate(item => item.scrollWidth)).toBeLessThanOrEqual(await element.evaluate(item => item.clientWidth));
    }
  }
});

test('the four How we do it cards open a Coming soon dialog', async ({ page }) => {
  await page.goto('/?smoothScroll=0');
  const cards = page.locator('#how-list').getByRole('link', { name: /Learn more/ });
  const dialog = page.getByRole('dialog', { name: 'Coming soon' });
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) {
    await card.getByText('Learn more').click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  }
  await expect(page).toHaveURL(/\/\?smoothScroll=0$/);
});

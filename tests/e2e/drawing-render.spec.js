import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage, tool } from './helpers.js';

// Drawings are seeded into the fake store with strokes built in the page by /review/stroke-anchor.js around
// real text and element rects. Each page.evaluate scrolls its target into view and measures in one go, so
// smooth scrolling can't move the page between measuring and anchoring.

const cards = page => page.locator('.rv-card');
const stat = (page, label) => page.locator('.rv-stat').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
  await page.evaluate(() => {
    // shared helpers for the evaluate calls below
    window.__dr = {
      mod: () => import('/review/stroke-anchor.js'),
      show(el) {
        const r = el.getBoundingClientRect();
        const y = window.scrollY + r.top + r.height / 2 - innerHeight / 2;
        if (window.__lenis) window.__lenis.scrollTo(Math.max(0, y), { immediate: true, force: true });
        else window.scrollTo(0, Math.max(0, y));
      },
      // a hand-drawn loop around a rect: an ellipse that overshoots its start a little
      loop(r, pad = 6) {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const rx = r.width / 2 + pad, ry = r.height / 2 + pad;
        const pts = [];
        for (let i = 0; i <= 52; i++) {
          const a = -Math.PI / 2 + (i / 48) * Math.PI * 2;
          pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
        }
        return { pts, center: [cx, cy], left: [cx - rx, cy] };
      },
      // a nearly flat stroke from x1 to x2 at y, wobbling by a pixel
      line(x1, x2, y) {
        const pts = [];
        for (let x = x1; x < x2; x += 4) pts.push([x, y + Math.sin(x / 9)]);
        pts.push([x2, y]);
        return pts;
      },
      wordRect(el, word) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const i = n.data.indexOf(word);
          if (i < 0) continue;
          const range = document.createRange();
          range.setStart(n, i);
          range.setEnd(n, i + word.length);
          return range.getBoundingClientRect();
        }
        return null;
      },
      // a loop in the pen around a word of #story h2
      async storyLoop(word = 'started') {
        const { anchorStroke } = await __dr.mod();
        const h2 = document.querySelector('#story h2');
        __dr.show(h2);
        const loop = __dr.loop(__dr.wordRect(h2, word));
        return { stroke: anchorStroke(loop.pts, 'pen'), center: loop.center, left: loop.left };
      },
      async seed(mark) {
        while (!window.__reviewFake) await new Promise(r => setTimeout(r, 20));
        return window.__reviewFake.create({ page: 'home', kind: 'drawing', author: 'Bo', deviceId: 'someone-else', ...mark });
      },
    };
  });
});

async function resize(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
}

test('a posted drawing shows as ink with no box', async ({ page }) => {
  await page.evaluate(async () => {
    const { stroke } = await __dr.storyLoop();
    await __dr.seed({ strokes: [stroke], text: 'This word' });
  });
  const drawing = page.locator('.rv-drawing');
  await expect(drawing).toHaveCount(1);
  await expect(drawing).toBeVisible();
  await expect(drawing).toHaveCSS('border-style', 'none');
  await expect(drawing).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(drawing.locator('.rv-pin-dot')).toHaveCount(0);
  await expect(drawing.locator('.rv-stroke.rv-stroke-pen')).toHaveCount(1);
  await expect(drawing.locator('.rv-stroke-hit')).toHaveCount(1);
});

test('clicking the ink selects its card, clicking inside a circle does not', async ({ page }) => {
  await tool(page, 'Comment').click();          // back to browsing
  await expect(tool(page, 'Comment')).toHaveAttribute('aria-pressed', 'false');
  const at = await page.evaluate(async () => {
    const { stroke, center, left } = await __dr.storyLoop();
    await __dr.seed({ strokes: [stroke], text: 'Circled' });
    return { center, left };
  });
  await expect(page.locator('.rv-drawing')).toBeVisible();
  await page.mouse.click(...at.center);
  await expect(page.locator('.rv-card-selected')).toHaveCount(0);
  await page.mouse.click(...at.left);
  await expect(cards(page).filter({ hasText: 'Circled' })).toHaveClass(/rv-card-selected/);
});

test('a selected drawing glows', async ({ page }) => {
  await page.evaluate(async () => {
    const { stroke } = await __dr.storyLoop();
    await __dr.seed({ strokes: [stroke], text: 'Glow' });
  });
  // the glow is on the drawing's ink (its SVGs), so the drawing itself stays unisolated and its highlighter blends
  await expect(page.locator('.rv-drawing svg').first()).not.toHaveCSS('filter', /drop-shadow/);
  await cards(page).filter({ hasText: 'Glow' }).click();
  await expect(page.locator('.rv-drawing.rv-selected')).toHaveCount(1);
  for (const svg of await page.locator('.rv-drawing.rv-selected svg').all()) await expect(svg).toHaveCSS('filter', /drop-shadow/);
});

test('the card shows a sketch, the Drawing tag and the Drawings count', async ({ page }) => {
  await page.evaluate(async () => {
    const { stroke } = await __dr.storyLoop();
    await __dr.seed({ strokes: [stroke], text: 'Sketched' });
  });
  const card = cards(page).filter({ hasText: 'Sketched' });
  await expect(card.locator('.rv-sketch svg')).toHaveCount(1);
  await expect(card.locator('.rv-sketch svg path')).toHaveCount(1);
  await expect(card.locator('.rv-tag')).toHaveText('Drawing');
  await expect(stat(page, 'Drawings')).toHaveText('1');
});

test('a highlighter along a line of text is drawn as a band, blended with the page', async ({ page }) => {
  await page.evaluate(async () => {
    const { anchorStroke } = await __dr.mod();
    const lead = document.querySelector('#app .lead');
    __dr.show(lead);
    const r = __dr.wordRect(lead, lead.textContent.trim().split(/\s+/).slice(0, 3).join(' '));
    const stroke = anchorStroke(__dr.line(r.left - 2, r.right + 2, (r.top + r.bottom) / 2), 'highlighter');
    await __dr.seed({ strokes: [stroke], text: 'Highlighted' });
  });
  const group = page.locator('.rv-drawing .rv-stroke-highlighter');
  await expect(group).toHaveCount(1);
  await expect(group).toHaveCSS('mix-blend-mode', 'multiply');
  await expect(group.locator('path:not(.rv-stroke-hit)')).toHaveCount(1);
  // it blends with the page itself: its SVG multiplies, and nothing around it is a stacking context
  await expect(page.locator('.rv-drawing .rv-ink-highlighter')).toHaveCSS('mix-blend-mode', 'multiply');
  for (const sel of ['.rv-marks', '.rv-drawing']) await expect(page.locator(sel)).toHaveCSS('z-index', 'auto');
});

test('old box highlights still show and count as Drawings', async ({ page }) => {
  await page.evaluate(() => __dr.seed({
    kind: 'highlight', text: 'Old box',
    from: { path: '#story', fx: 0.1, fy: 0.1, vw: 1440 }, to: { path: '#story', fx: 0.5, fy: 0.3, vw: 1440 },
  }));
  await expect(page.locator('.rv-highlight')).toBeVisible();
  await expect(cards(page).filter({ hasText: 'Old box' }).locator('.rv-tag')).toHaveText('Highlight');
  await expect(stat(page, 'Drawings')).toHaveText('1');
});

test('the rail has Marker and no Highlight', async ({ page }) => {
  await expect(tool(page, 'Marker')).toBeVisible();
  await expect(tool(page, 'Highlight')).toHaveCount(0);
});

test('picking Marker shows the Pen and Highlighter switch, and the choice is kept', async ({ page }) => {
  const inks = page.locator('.rv-rail .rv-inks');
  await expect(inks).toBeHidden();
  await tool(page, 'Marker').click();
  await expect(inks).toBeVisible();
  await expect(inks.getByRole('button', { name: 'Pen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await inks.getByRole('button', { name: 'Highlighter', exact: true }).click();
  await expect(inks.getByRole('button', { name: 'Highlighter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(inks.getByRole('button', { name: 'Pen', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('rv-ink'))).toBe('highlighter');
  // it doesn't switch the tool off or reach the page
  await expect(tool(page, 'Marker')).toHaveAttribute('aria-pressed', 'true');
});

test('a drawing whose element is gone is listed as Moved', async ({ page }) => {
  await page.evaluate(async () => {
    const { stroke } = await __dr.storyLoop();
    const { char, inside, ...rest } = stroke;
    await __dr.seed({ strokes: [{ ...rest, at: { ...rest.at, path: '#nope > div:nth-of-type(1)' } }], text: 'Lost' });
  });
  await expect(cards(page).filter({ hasText: 'Lost' })).toContainText('Moved');
  await expect(page.locator('.rv-drawing:visible')).toHaveCount(0);
});

test('a drawing with one lost stroke still draws the rest and says Moved', async ({ page }) => {
  await page.evaluate(async () => {
    const { stroke } = await __dr.storyLoop();
    const { char, inside, ...rest } = stroke;
    await __dr.seed({ strokes: [stroke, { ...rest, at: { ...rest.at, path: '#nope' } }], text: 'Half lost' });
  });
  await expect(cards(page).filter({ hasText: 'Half lost' })).toContainText('Moved');
  await expect(page.locator('.rv-drawing')).toBeVisible();
  await expect(page.locator('.rv-drawing .rv-stroke')).toHaveCount(1);
});

test('a split drawing says Drawn on a wider screen', async ({ page }) => {
  const stroke = await page.evaluate(async () => {
    const { anchorStroke } = await __dr.mod();
    const split = document.querySelector('#what-we-do .split');
    __dr.show(split);
    return anchorStroke(__dr.loop(split.getBoundingClientRect(), 12).pts, 'pen');
  });
  expect(stroke.at.vw).toBe(1440);
  expect(stroke.inside.length).toBeGreaterThanOrEqual(2);
  await resize(page, 390);
  await page.evaluate(s => __dr.seed({ strokes: [s], text: 'Both columns' }), stroke);
  const card = cards(page).filter({ hasText: 'Both columns' });
  await expect(card).toContainText('Drawn on a wider screen');
  await expect(card).not.toContainText('Moved');
});

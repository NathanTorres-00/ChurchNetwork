// Drawing with the Marker by touch: one finger draws, two fingers scroll, a stylus draws while fingers scroll,
// and below 1280px the drawing is made from a slim bar at the bottom instead of the sidebar.
import { expect, test } from '@playwright/test';
import { openPage, tool } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const bar = page => page.locator('.rv-drawbar');
const draftStrokes = page => page.locator('.rv-drawing.rv-draft .rv-stroke');
const scrollY = page => page.evaluate(() => window.scrollY);

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await page.locator('#comment-toggle').tap();
  await expect(page.locator('.rv-toolbar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/rv-gliding/, { timeout: 10_000 });
});

// The client rect of a word in an element, after scrolling the element to the middle of the window at once
async function wordRect(page, selector, word) {
  return page.evaluate(([sel, w]) => {
    const el = document.querySelector(sel);
    const box = el.getBoundingClientRect();
    const y = Math.max(0, window.scrollY + box.top + box.height / 2 - innerHeight / 2);
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = n.data.indexOf(w);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + w.length);
      const r = range.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return null;
  }, [selector, word]);
}

// Real touch input, sent through CDP so the page's touch-action rules apply. Each step lists every finger down.
async function touches(page, steps) {
  const cdp = await page.context().newCDPSession(page);
  const points = fingers => fingers.map(([x, y], id) => ({ x, y, id }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(steps[0]) });
  for (const fingers of steps.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(fingers) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
const between = (a, b, t) => [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];

// One finger from one point to another
async function touchDrag(page, from, to, steps = 6) {
  await touches(page, Array.from({ length: steps + 1 }, (_, i) => [between(from, to, i / steps)]));
}

// Two fingers side by side, moving together
async function twoFingerDrag(page, from, to, steps = 8) {
  await touches(page, Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = between(from, to, i / steps);
    return [[x - 45, y], [x + 45, y]];
  }));
}

// A loop drawn with one finger round a rect
async function touchLoop(page, r, pad = 8) {
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const rx = r.width / 2 + pad, ry = r.height / 2 + pad;
  await touches(page, Array.from({ length: 25 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 22) * Math.PI * 2;
    return [[cx + rx * Math.cos(a), cy + ry * Math.sin(a)]];
  }));
}

// A flat line just under a rect, drawn with one finger in small steps
async function touchUnderline(page, r) {
  const y = r.y + r.height + 4;
  await touchDrag(page, { x: r.x - 2, y }, { x: r.x + r.width + 2, y }, 20);
}

test('one finger draws and the sheet stays closed', async ({ page }) => {
  await tool(page, 'Marker').tap();
  await expect(bar(page).getByRole('button', { name: 'Pen', exact: true })).toBeVisible();
  await expect(bar(page).getByRole('button', { name: 'Highlighter', exact: true })).toBeVisible();
  await expect(bar(page).getByRole('button', { name: 'Post drawing' })).toHaveCount(0);

  await touchLoop(page, await wordRect(page, '#story h2', 'How'));
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(page.locator('.rv-sidebar')).not.toBeInViewport();
  for (const name of ['Undo', 'Add note', 'Post drawing', 'Cancel']) {
    await expect(bar(page).getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(bar(page)).toBeInViewport();
  // the bar sits above the tool bar
  const b = await bar(page).boundingBox();
  const rail = await page.locator('.rv-rail').boundingBox();
  expect(b.y + b.height).toBeLessThanOrEqual(rail.y);
});

test('two fingers scroll and don\'t draw', async ({ page }) => {
  await tool(page, 'Marker').tap();
  await touchLoop(page, await wordRect(page, '#story h2', 'How'));
  await expect(draftStrokes(page)).toHaveCount(1);
  const before = await scrollY(page);
  await twoFingerDrag(page, { x: 195, y: 600 }, { x: 195, y: 200 });
  await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 100);
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(page.locator('.rv-live')).toHaveCount(0);
});

test('draw, scroll, draw again, add a note, post', async ({ page }) => {
  await tool(page, 'Marker').tap();
  await touchLoop(page, await wordRect(page, '#story h2', 'How'));
  await expect(draftStrokes(page)).toHaveCount(1);
  const before = await scrollY(page);
  await twoFingerDrag(page, { x: 195, y: 560 }, { x: 195, y: 260 });
  await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 100);
  await touchDrag(page, { x: 60, y: 400 }, { x: 320, y: 404 }, 12);
  await expect(draftStrokes(page)).toHaveCount(2);

  await bar(page).getByRole('button', { name: 'Add note' }).tap();
  await bar(page).getByLabel('Note (optional)').fill('Both of these');
  await bar(page).getByRole('button', { name: 'Post drawing' }).tap();
  await expect(bar(page).getByRole('alert')).toHaveText('Add your name so everyone knows who this is from.');
  await bar(page).getByLabel('Your name').fill('Ana');
  await bar(page).getByRole('button', { name: 'Post drawing' }).tap();

  await expect(page.locator('.rv-card')).toHaveCount(1);
  await expect(page.locator('.rv-card')).toContainText('Both of these');
  expect(await page.evaluate(() => window.__reviewFake.marks.map(m => m.strokes.length))).toEqual([2]);
  await expect(bar(page).locator('.rv-composer')).toHaveCount(0);
  await expect(page.locator('.rv-sidebar')).not.toBeInViewport();
});

test('strokes are thicker on a phone', async ({ page }) => {
  await tool(page, 'Marker').tap();
  await touchUnderline(page, await wordRect(page, '#story h2', 'started'));
  await expect(draftStrokes(page)).toHaveCount(1);
  const height = () => page.locator('.rv-drawing.rv-draft .rv-stroke-pen path:not(.rv-stroke-hit)').evaluate(p => p.getBBox().height);
  const phone = await height();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
  const wide = await height();
  expect(phone).toBeGreaterThan(wide * 1.3);
});

// A stroke under a rect drawn with a stylus: synthetic pen pointer events with pressure. On iPadOS a Pencil's
// touches also say touchType 'stylus'; with `stylusTouch` a touchstart saying so follows the pointerdown, as there.
// Resolves whether that touchstart was kept from scrolling.
async function penStroke(page, r, { stylusTouch = false } = {}) {
  return page.evaluate(({ x1, x2, y, stylusTouch }) => {
    const target = document.elementFromPoint(x1, y);
    const fire = (type, x) => target.dispatchEvent(new PointerEvent(type, {
      pointerId: 9, pointerType: 'pen', isPrimary: true, pressure: type === 'pointerup' ? 0 : 0.5,
      clientX: x, clientY: y, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1,
      bubbles: true, cancelable: true, composed: true,
    }));
    fire('pointerdown', x1);
    const prevented = stylusTouch ? window.__touchStart(target, x1, y, 'stylus') : null;
    for (let i = 1; i <= 10; i++) fire('pointermove', x1 + (x2 - x1) * i / 10);
    fire('pointerup', x2);
    return prevented;
  }, { x1: r.x, x2: r.x + r.width, y: r.y + r.height + 4, stylusTouch });
}

// A touchstart whose touch says what touched ('stylus' or 'direct'). Chromium has no Touch.touchType (Safari does),
// so the event carries plain touches that say so. True when it was kept from scrolling.
async function addTouchStart(page) {
  await page.evaluate(() => {
    window.__touchStart = (target, x, y, touchType) => {
      const e = new TouchEvent('touchstart', { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(e, 'changedTouches', { value: [{ identifier: 1, target, clientX: x, clientY: y, touchType }] });
      return !target.dispatchEvent(e);
    };
  });
}
const bodyTouchAction = page => page.evaluate(() => getComputedStyle(document.body).touchAction);

test('a stylus draws and a finger scrolls', async ({ page }) => {
  await addTouchStart(page);
  await tool(page, 'Marker').tap();
  const r = await wordRect(page, '#story h2', 'started');
  // iPadOS: the Pencil's touches say they're a stylus, and are kept from scrolling
  expect(await penStroke(page, r, { stylusTouch: true })).toBe(true);
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(page.locator('html')).toHaveClass(/\brv-stylus\b/);
  expect(await bodyTouchAction(page)).toBe('auto');
  // a finger's touches aren't
  expect(await page.evaluate(({ x, y }) => window.__touchStart(document.elementFromPoint(x, y), x, y, 'direct'),
    { x: r.x, y: r.y + r.height + 4 })).toBe(false);

  const before = await scrollY(page);
  await touchDrag(page, { x: 200, y: 600 }, { x: 200, y: 200 });
  await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 100);
  await expect(draftStrokes(page)).toHaveCount(1);
});

test('a stylus whose touches don\'t say so keeps drawing, and fingers don\'t draw', async ({ page }) => {
  await tool(page, 'Marker').tap();
  await penStroke(page, await wordRect(page, '#story h2', 'started'));
  await expect(draftStrokes(page)).toHaveCount(1);
  // the page keeps touch-action none, or the pen would pan it (Chromium, Firefox)
  await expect(page.locator('html')).not.toHaveClass(/\brv-stylus\b/);
  expect(await bodyTouchAction(page)).toBe('none');
  await penStroke(page, await wordRect(page, '#story h2', 'How'));
  await expect(draftStrokes(page)).toHaveCount(2);

  await touchDrag(page, { x: 60, y: 400 }, { x: 320, y: 404 }, 12);
  await page.waitForTimeout(300);
  await expect(draftStrokes(page)).toHaveCount(2);
  // two fingers still scroll
  const before = await scrollY(page);
  await twoFingerDrag(page, { x: 195, y: 600 }, { x: 195, y: 200 });
  await expect.poll(() => scrollY(page)).toBeGreaterThan(before + 100);
  await expect(draftStrokes(page)).toHaveCount(2);
});

test.describe('on a tablet', () => {
  test.use({ viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true });

  test('on a tablet the bar is used, not the sidebar', async ({ page }) => {
    await tool(page, 'Marker').tap();
    await expect(bar(page).getByRole('button', { name: 'Pen', exact: true })).toBeVisible();
    await touchLoop(page, await wordRect(page, '#story h2', 'How'));
    await expect(draftStrokes(page)).toHaveCount(1);
    await expect(bar(page).getByRole('button', { name: 'Post drawing' })).toBeVisible();
    await expect(page.locator('.rv-sidebar')).not.toBeInViewport();
    // at the bottom of the screen, in the middle
    const b = await bar(page).boundingBox();
    expect(b.y + b.height).toBeGreaterThan(1366 - 80);
    expect(Math.abs(b.x + b.width / 2 - 512)).toBeLessThan(4);
  });

  // (on a phone the open sheet covers the tool bar, so Marker can't be picked while it's open)
  test('picking Marker closes the sidebar', async ({ page }) => {
    await page.locator('.rv-sidebar-tab').tap();
    await expect(page.locator('.rv-sidebar')).toBeInViewport();
    await tool(page, 'Marker').tap();
    await expect(page.locator('.rv-sidebar')).not.toBeInViewport();
    await expect(bar(page).getByRole('button', { name: 'Pen', exact: true })).toBeVisible();
    await expect(bar(page).getByRole('button', { name: 'Highlighter', exact: true })).toBeVisible();
  });
});

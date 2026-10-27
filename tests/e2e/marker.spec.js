// Drawing with the Marker on a computer: strokes drawn with the mouse join one draft drawing, which posts with
// one optional note.
import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage, tool } from './helpers.js';

const composer = page => page.locator('.rv-composer');
const cards = page => page.locator('.rv-card');
const draftStrokes = page => page.locator('.rv-drawing.rv-draft .rv-stroke');
const note = page => composer(page).getByLabel('Note (optional)');
const stat = (page, label) => page.locator('.rv-stat').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
const ink = (page, name) => page.locator('.rv-rail .rv-inks').getByRole('button', { name, exact: true });
const discardDialog = page => page.getByRole('alertdialog', { name: 'Discard this drawing?' });

// The client rect of a word in an element, after scrolling the element to the middle of the window at once
// (smooth scrolling would move the page between measuring and drawing)
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

// A hand-drawn loop around a rect: 24 mouse moves round an ellipse that overshoots its start a little
async function drawLoop(page, r, pad = 8) {
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const rx = r.width / 2 + pad, ry = r.height / 2 + pad;
  const at = i => { const a = -Math.PI / 2 + (i / 22) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
  await page.mouse.move(...at(0));
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) await page.mouse.move(...at(i));
  await page.mouse.up();
}

// A stroke just under a rect, from a little before it to a little after
async function underline(page, r) {
  const y = r.y + r.height + 4;
  await page.mouse.move(r.x - 2, y);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width + 2, y + 1, { steps: 12 });
  await page.mouse.up();
}

async function loopFirstWord(page) {
  await drawLoop(page, await wordRect(page, '#story h2', 'How'));
}

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
});

test('circle, underline, switch ink, add a note, post: one card', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await expect(composer(page).getByRole('heading', { name: 'Add a drawing' })).toBeVisible();
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await ink(page, 'Highlighter').click();
  await underline(page, await wordRect(page, '#story .step:nth-child(1) > p:last-child', 'A few people'));
  await expect(draftStrokes(page)).toHaveCount(3);

  await composer(page).getByLabel('Your name').fill('Ana');
  await note(page).fill('these should match');
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();

  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).locator('.rv-tag')).toHaveText('Drawing');
  await expect(cards(page)).toContainText('these should match');
  const drawing = page.locator('.rv-drawing:not(.rv-draft)');
  await expect(drawing).toHaveCount(1);
  await expect(drawing.locator('.rv-stroke')).toHaveCount(3);
  await expect(drawing.locator('.rv-stroke-highlighter')).toHaveCount(1);
  await expect(stat(page, 'Drawings')).toHaveText('1');
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-draft')).toHaveCount(0);
});

test('undo removes the last stroke only', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await expect(draftStrokes(page)).toHaveCount(2);
  await composer(page).getByRole('button', { name: 'Undo' }).click();
  await expect(draftStrokes(page)).toHaveCount(1);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('ControlOrMeta+z');
  await expect(draftStrokes(page)).toHaveCount(0);
  await expect(composer(page)).toBeVisible();
});

test('Cmd/Ctrl+Z in the note is left to the note; drawing again leaves the note', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await note(page).fill('typed');
  await note(page).press('ControlOrMeta+z');
  await expect(draftStrokes(page)).toHaveCount(1);
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await expect(draftStrokes(page)).toHaveCount(2);
  await expect(note(page)).not.toBeFocused();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(draftStrokes(page)).toHaveCount(1);
});

test('drawing continues while the composer is open', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await note(page).fill('keep this');
  await page.evaluate(() => { document.querySelector('.rv-composer').dataset.first = ''; });
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await expect(draftStrokes(page)).toHaveCount(2);
  await expect(page.locator('.rv-composer[data-first]')).toHaveCount(1);
  await expect(note(page)).toHaveValue('keep this');
});

test('Esc, Cancel and switching tools with strokes ask first', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await expect(draftStrokes(page)).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Keep editing' }).click();
  await expect(draftStrokes(page)).toHaveCount(1);

  await composer(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Keep editing' }).click();
  await expect(draftStrokes(page)).toHaveCount(1);

  await tool(page, 'Comment').click();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Keep editing' }).click();
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(tool(page, 'Marker')).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await discardDialog(page).getByRole('button', { name: 'Discard' }).click();
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-draft')).toHaveCount(0);
});

test('Esc mid-stroke takes back only that stroke', async ({ page }) => {
  await tool(page, 'Marker').click();
  const r = await wordRect(page, '#story h2', 'started');
  await page.mouse.move(r.x, r.y + r.height + 4);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width, r.y + r.height + 6, { steps: 10 });
  await expect(page.locator('.rv-live')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.rv-live')).toHaveCount(0);
  await page.mouse.move(r.x + r.width + 40, r.y + r.height + 8, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.rv-live')).toHaveCount(0);
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-draft')).toHaveCount(0);
  await expect(tool(page, 'Marker')).toHaveAttribute('aria-pressed', 'true');
  // the next Esc backs out a step as before
  await page.keyboard.press('Escape');
  await expect(tool(page, 'Marker')).toHaveAttribute('aria-pressed', 'false');
});

test('with no strokes left, Cancel closes without asking', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await composer(page).getByRole('button', { name: 'Undo' }).click();
  await composer(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(composer(page)).toHaveCount(0);
});

test('leaving comment mode with strokes asks first', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await expect(discardDialog(page)).toBeVisible();
  await discardDialog(page).getByRole('button', { name: 'Keep editing' }).click();
  await expect(draftStrokes(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave comment mode' }).click();
  await discardDialog(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('[data-review-ui]')).toHaveCount(0);
});

test('the ink choice is remembered', async ({ page }) => {
  await tool(page, 'Marker').click();
  await ink(page, 'Highlighter').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__revealed === true, null, { timeout: 30_000 });
  await enterCommentMode(page);
  await tool(page, 'Marker').click();
  await expect(ink(page, 'Highlighter')).toHaveAttribute('aria-pressed', 'true');
  await expect(ink(page, 'Pen')).toHaveAttribute('aria-pressed', 'false');
});

test('a stroke starts on existing ink while Marker is on', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await expect(page.locator('.rv-drawing:not(.rv-draft)')).toHaveCount(1);
  await expect(composer(page)).toHaveCount(0);

  // press on the left edge of the posted loop's line and draw away from it
  const b = await page.locator('.rv-drawing:not(.rv-draft) .rv-stroke path:not(.rv-stroke-hit)').boundingBox();
  const from = { x: b.x + 1.5, y: b.y + b.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x - 40, from.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(composer(page).getByRole('heading', { name: 'Add a drawing' })).toBeVisible();
  await expect(page.locator('.rv-card-selected')).toHaveCount(0);
});

test('the stroke is drawn live as it is made', async ({ page }) => {
  await tool(page, 'Marker').click();
  const r = await wordRect(page, '#story h2', 'started');
  await page.mouse.move(r.x, r.y + r.height + 4);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width, r.y + r.height + 6, { steps: 10 });
  const live = page.locator('svg.rv-live');
  await expect(live).toHaveCount(1);
  await expect(live).toHaveCSS('position', 'fixed');
  await expect(live).toHaveCSS('pointer-events', 'none');
  await expect(live.locator('path')).toHaveAttribute('d', /^M[\d.]+ [\d.]+ /);
  await expect(composer(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(live).toHaveCount(0);
  await expect(draftStrokes(page)).toHaveCount(1);
});

test('a click without moving draws nothing', async ({ page }) => {
  await tool(page, 'Marker').click();
  const url = page.url();
  const link = page.locator('.site-header nav a').first();
  const b = await link.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(300);
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-draft')).toHaveCount(0);
  expect(page.url()).toBe(url);
});

test('failed post keeps the strokes and retries once', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await composer(page).getByLabel('Your name').fill('Ana');
  await note(page).fill('Try this twice');
  // every post's clientId, so the retry can be seen to be the same drawing
  await page.evaluate(() => {
    const fake = window.__reviewFake, create = fake.create;
    window.__clientIds = [];
    fake.create = input => { window.__clientIds.push(input.clientId); return create.call(fake, input); };
  });
  await page.evaluate(() => window.__reviewFake.failNext('NETWORK'));
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await expect(composer(page).getByRole('alert')).toContainText("Couldn't post");
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(note(page)).toHaveValue('Try this twice');
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await expect(cards(page)).toHaveCount(1);
  expect(await page.evaluate(() => window.__reviewFake.marks.length)).toBe(1);
  const ids = await page.evaluate(() => window.__clientIds);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBeTruthy();
  expect(ids[1]).toBe(ids[0]);
});

test('a stroke drawn while posting is turned away', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await composer(page).getByLabel('Your name').fill('Ana');
  await note(page).fill('held');
  await page.evaluate(() => window.__reviewFake.holdNext());
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await expect(page.locator('.rv-status')).toHaveText("Posting… draw again once it's posted.");
  await expect(draftStrokes(page)).toHaveCount(1);
  await page.evaluate(() => window.__reviewFake.release());
  await expect(cards(page)).toHaveCount(1);
  await expect(page.locator('.rv-drawing:not(.rv-draft) .rv-stroke')).toHaveCount(1);
  expect(await page.evaluate(() => window.__reviewFake.marks[0].strokes.length)).toBe(1);
  await expect(composer(page)).toHaveCount(0);
});

test('a stroke whose release is lost ends when the mouse moves with no button down', async ({ page }) => {
  await tool(page, 'Marker').click();
  const r = await wordRect(page, '#story h2', 'started');
  const y = r.y + r.height + 4;
  await page.mouse.move(r.x, y);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width, y + 1, { steps: 12 });
  // the stroke is captured on the page itself, so it keeps coming however the page under it changes
  expect(await page.evaluate(() => document.documentElement.hasPointerCapture(1))).toBe(true);
  // the button comes up where the page doesn't hear it, and the mouse comes back with no button down
  await page.evaluate(({ x, y }) => document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('pointermove', {
    pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, button: -1, buttons: 0,
    bubbles: true, cancelable: true, composed: true,
  })), { x: r.x + r.width + 20, y: y + 30 });
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(page.locator('.rv-live')).toHaveCount(0);
  await page.mouse.up();
  await loopFirstWord(page);
  await expect(draftStrokes(page)).toHaveCount(2);
});

test('a live mark arriving keeps the draft', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await underline(page, await wordRect(page, '#story h2', 'started'));
  await note(page).fill('still mine');
  const ink = () => page.locator('.rv-drawing.rv-draft .rv-stroke path:not(.rv-stroke-hit)').evaluateAll(ps => ps.map(p => p.getAttribute('d')));
  const before = await ink();
  await page.evaluate(() => window.__reviewFake.create({
    page: 'home', kind: 'comment', text: 'From another device', author: 'Bo', deviceId: 'someone-else',
    at: { path: '#story', fx: 0.5, fy: 0.2, vw: 1440 },
  }));
  await expect(cards(page).filter({ hasText: 'From another device' })).toHaveCount(1);
  await expect(draftStrokes(page)).toHaveCount(2);
  expect(await ink()).toEqual(before);
  await expect(note(page)).toHaveValue('still mine');
});

test('dragging into the sidebar still ends the stroke', async ({ page }) => {
  await tool(page, 'Marker').click();
  const side = await page.locator('.rv-sidebar').boundingBox();

  // a press that starts on the sidebar draws nothing
  await page.mouse.move(side.x + 40, side.y + 30);
  await page.mouse.down();
  await page.mouse.move(side.x - 200, side.y + 120, { steps: 10 });
  await page.mouse.up();
  await expect(composer(page)).toHaveCount(0);
  await expect(page.locator('.rv-draft')).toHaveCount(0);

  const r = await wordRect(page, '#story h2', 'started');
  await page.mouse.move(r.x, r.y + r.height + 4);
  await page.mouse.down();
  await page.mouse.move(side.x + side.width / 2, side.y + side.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(draftStrokes(page)).toHaveCount(1);
  await expect(page.locator('.rv-live')).toHaveCount(0);

  // the next press on the page starts a new stroke, so the last one really ended
  await loopFirstWord(page);
  await expect(draftStrokes(page)).toHaveCount(2);
});

test('resizing mid-draft keeps strokes on their words', async ({ page }) => {
  await tool(page, 'Marker').click();
  await loopFirstWord(page);
  await expect(draftStrokes(page)).toHaveCount(1);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
  const { word, stroke } = await page.evaluate(() => {
    const h2 = document.querySelector('#story h2');
    const n = h2.firstChild;
    const range = document.createRange();
    range.setStart(n, n.data.indexOf('How'));
    range.setEnd(n, n.data.indexOf('How') + 3);
    const box = r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    return {
      word: box(range.getBoundingClientRect()),
      stroke: box(document.querySelector('.rv-drawing.rv-draft .rv-stroke path:not(.rv-stroke-hit)').getBoundingClientRect()),
    };
  });
  expect(stroke.left).toBeLessThanOrEqual(word.left);
  expect(stroke.right).toBeGreaterThanOrEqual(word.right);
  expect(stroke.top).toBeLessThanOrEqual(word.top);
  expect(stroke.bottom).toBeGreaterThanOrEqual(word.bottom);
});

test('a full drawing says so and drops the stroke', async ({ page }) => {
  await tool(page, 'Marker').click();
  const r = await wordRect(page, '#story h2', 'How');
  const scribble = async i => {
    const x = r.x + (i % 10) * 8, y = r.y + Math.floor(i / 10) * 8;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 6, y + 6, { steps: 3 });
    await page.mouse.up();
  };
  for (let i = 0; i < 40; i++) await scribble(i);
  await expect(draftStrokes(page)).toHaveCount(40);
  await scribble(40);
  await expect(page.locator('.rv-status')).toHaveText('That drawing is full. Post it and start another.');
  await expect(draftStrokes(page)).toHaveCount(40);
  await expect(page.locator('.rv-live')).toHaveCount(0);
});

// Scrolls a rect from wordRect up out of the way of the tool options, which sit beside the rail mid-window
async function clearOfInks(page, r) {
  const dy = await page.evaluate(() => {
    const before = scrollY;
    if (window.__lenis) window.__lenis.scrollTo(before + 200, { immediate: true, force: true });
    else window.scrollTo(0, before + 200);
    return scrollY - before;
  });
  return { ...r, y: r.y - dy };
}

// A straight sweep of the mouse from one point to another
async function sweep(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 8 });
  await page.mouse.up();
}
const dab = (page, at) => sweep(page, at, at);
const undo = page => composer(page).getByRole('button', { name: 'Undo' }).click();
const size = (page, name) => page.locator('.rv-rail').getByRole('slider', { name: `${name} width` });
// Sets a size slider to a share of its tool's usual width (the slider moves on a log scale)
const setSize = (page, name, w) => size(page, name).fill(Math.log(w).toFixed(6));
// The size a slider shows, as a share of its tool's usual width
const sizeOf = async (page, name) => Math.round(Math.exp(+(await size(page, name).inputValue())) * 100) / 100;
// The marks the store holds, as the page posted them
const posted = page => page.evaluate(() => new Promise(resolve => {
  const stop = window.__reviewFake.subscribe({ page: 'home' }, marks => resolve(marks));
  stop();
}));

// A long underline under the headline's first word, clear of the tool options
async function longUnderline(page) {
  const r = await clearOfInks(page, await wordRect(page, '#story h2', 'How'));
  const y = r.y + r.height + 6;
  await sweep(page, [r.x, y], [r.x + 200, y]);
  return { x1: r.x, x2: r.x + 200, y };
}

test('a dab with the eraser rubs out a gap and leaves the rest of the line', async ({ page }) => {
  await tool(page, 'Marker').click();
  const u = await longUnderline(page);
  await expect(draftStrokes(page)).toHaveCount(1);
  await ink(page, 'Eraser').click();
  // just beside the line, out of the eraser's reach: nothing
  await dab(page, [u.x1 + 100, u.y + 14]);
  await expect(draftStrokes(page)).toHaveCount(1);
  await dab(page, [u.x1 + 100, u.y]);
  await expect(draftStrokes(page)).toHaveCount(2);
  const [left, right] = await draftStrokes(page).evaluateAll(gs => gs.map(g => g.getBoundingClientRect()))
    .then(rs => rs.sort((a, b) => a.left - b.left));
  expect(left.right).toBeLessThan(u.x1 + 100);
  expect(right.left).toBeGreaterThan(u.x1 + 100);
  await expect(page.locator('.rv-live')).toHaveCount(0);
  await undo(page);
  await expect(draftStrokes(page)).toHaveCount(1);
});

test('a sweep along a line rubs out that part; one sweep is one step for Undo', async ({ page }) => {
  await tool(page, 'Marker').click();
  const u = await longUnderline(page);
  await ink(page, 'Eraser').click();
  // from past its start to its middle: what's left is the second half, still one stroke
  await sweep(page, [u.x1 - 30, u.y], [u.x1 + 100, u.y]);
  await expect(draftStrokes(page)).toHaveCount(1);
  const inkBox = () => page.locator('.rv-drawing.rv-draft .rv-stroke path:not(.rv-stroke-hit)').first().boundingBox();
  expect((await inkBox()).x).toBeGreaterThan(u.x1 + 100);
  // and along the rest of it, nothing's left
  await sweep(page, [u.x1 + 90, u.y], [u.x2 + 30, u.y]);
  await expect(draftStrokes(page)).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(draftStrokes(page)).toHaveCount(1);
  await undo(page);
  expect((await inkBox()).x).toBeLessThan(u.x1 + 10);
});

test('Esc mid-sweep puts back what the sweep rubbed out', async ({ page }) => {
  await tool(page, 'Marker').click();
  const u = await longUnderline(page);
  await ink(page, 'Eraser').click();
  await page.mouse.move(u.x1 + 100, u.y - 30);
  await page.mouse.down();
  await page.mouse.move(u.x1 + 100, u.y + 30, { steps: 8 });
  await expect(draftStrokes(page)).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(draftStrokes(page)).toHaveCount(1);
  await page.mouse.up();
  // Undo still takes back the underline itself
  await undo(page);
  await expect(draftStrokes(page)).toHaveCount(0);
});

test('the eraser cuts a highlight that follows the text, leaving the words on either side', async ({ page }) => {
  await tool(page, 'Marker').click();
  await ink(page, 'Highlighter').click();
  const r = await clearOfInks(page, await wordRect(page, '#story .step:nth-child(1) > p:last-child', 'A few people'));
  const y = r.y + r.height / 2;
  await sweep(page, [r.x - 2, y], [r.x + r.width + 2, y + 1]);
  await expect(draftStrokes(page)).toHaveCount(1);
  await ink(page, 'Eraser').click();
  await dab(page, [r.x + r.width / 2, y]);
  await expect(draftStrokes(page)).toHaveCount(2);
  await expect(page.locator('.rv-drawing.rv-draft .rv-stroke-highlighter')).toHaveCount(2);
  await sweep(page, [r.x - 30, y], [r.x + r.width + 30, y]);
  await expect(draftStrokes(page)).toHaveCount(0);
});

test('a bigger eraser reaches further', async ({ page }) => {
  await tool(page, 'Marker').click();
  const u = await longUnderline(page);
  await ink(page, 'Eraser').click();
  await dab(page, [u.x1 + 100, u.y + 20]);
  await expect(draftStrokes(page)).toHaveCount(1);
  const small = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--rv-eraser-cursor'));
  await setSize(page, 'Eraser', 4);
  const big = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--rv-eraser-cursor'));
  expect(big).not.toBe(small);
  await dab(page, [u.x1 + 100, u.y + 20]);
  await expect(draftStrokes(page)).toHaveCount(2);
});

test('the eraser leaves posted drawings alone and says why', async ({ page }) => {
  await tool(page, 'Marker').click();
  const u = await longUnderline(page);
  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await expect(cards(page)).toHaveCount(1);

  await ink(page, 'Eraser').click();
  await sweep(page, [u.x1 + 100, u.y - 30], [u.x1 + 100, u.y + 30]);
  await expect(page.locator('.rv-status')).toHaveText("Nothing to erase. The eraser rubs out strokes you haven't posted.");
  await expect(page.locator('.rv-drawing:not(.rv-draft) .rv-stroke')).toHaveCount(1);
  await expect(composer(page)).toHaveCount(0);
});

test('the eraser is not remembered: the ink before it is', async ({ page }) => {
  await tool(page, 'Marker').click();
  await ink(page, 'Highlighter').click();
  await ink(page, 'Eraser').click();
  await expect(ink(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__revealed === true, null, { timeout: 30_000 });
  await enterCommentMode(page);
  await tool(page, 'Marker').click();
  await expect(ink(page, 'Highlighter')).toHaveAttribute('aria-pressed', 'true');
  await expect(ink(page, 'Eraser')).toHaveAttribute('aria-pressed', 'false');
});

test('each ink has its own width, drawn and posted with the stroke and remembered', async ({ page }) => {
  await tool(page, 'Marker').click();
  await expect(size(page, 'Pen')).toBeVisible();
  const height = () => page.locator('.rv-drawing.rv-draft .rv-stroke-pen path:not(.rv-stroke-hit)').last()
    .evaluate(p => p.getBBox().height);
  await longUnderline(page);
  const usual = await height();
  await setSize(page, 'Pen', 4);
  await longUnderline(page);
  const thick = await height();
  expect(thick).toBeGreaterThan(usual * 2.5);

  // the highlighter keeps its own size
  await ink(page, 'Highlighter').click();
  expect(await sizeOf(page, 'Highlighter')).toBe(1);
  await ink(page, 'Pen').click();
  expect(await sizeOf(page, 'Pen')).toBe(4);

  await composer(page).getByLabel('Your name').fill('Ana');
  await composer(page).getByRole('button', { name: 'Post drawing' }).click();
  await expect(cards(page)).toHaveCount(1);
  const [mark] = await posted(page);
  expect(mark.strokes.map(s => s.w)).toEqual([undefined, 4]);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__revealed === true, null, { timeout: 30_000 });
  await enterCommentMode(page);
  await tool(page, 'Marker').click();
  expect(await sizeOf(page, 'Pen')).toBe(4);
});

test('the arrow has a width too, shown while placing and posted with it', async ({ page }) => {
  await tool(page, 'Arrow').click();
  await expect(size(page, 'Arrow')).toBeVisible();
  await setSize(page, 'Arrow', 3);
  const r = await clearOfInks(page, await wordRect(page, '#story h2', 'started'));
  await sweep(page, [r.x + r.width + 80, r.y - 60], [r.x + r.width, r.y]);
  const arrow = page.locator('.rv-arrow.rv-draft');
  await expect(arrow).toHaveCount(1);
  await expect.poll(() => arrow.locator('.rv-arrow-line').evaluate(l => getComputedStyle(l).strokeWidth)).toBe('7.5px');
  // changing the size while its note is open changes the arrow
  await setSize(page, 'Arrow', 2);
  await expect.poll(() => arrow.locator('.rv-arrow-line').evaluate(l => getComputedStyle(l).strokeWidth)).toBe('5px');
  await page.locator('.rv-composer').getByLabel('Your name').fill('Ana');
  await page.locator('.rv-composer').getByRole('button', { name: 'Post arrow' }).click();
  await expect(cards(page)).toHaveCount(1);
  const [mark] = await posted(page);
  expect(mark.w).toBe(2);
  await expect.poll(() => page.locator('.rv-arrow:not(.rv-draft) .rv-arrow-line').evaluate(l => getComputedStyle(l).strokeWidth)).toBe('5px');
});

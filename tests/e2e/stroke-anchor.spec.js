import { expect, test } from '@playwright/test';
import { enterCommentMode, openPage } from './helpers.js';

// Strokes are synthesized in the page (client coordinates) around real text and element rects, then anchored
// and resolved with /review/stroke-anchor.js. Each page.evaluate scrolls its target into view and measures in
// one go, so smooth scrolling can't move the page between measuring and anchoring.

test.beforeEach(async ({ page }) => {
  await openPage(page);
  await enterCommentMode(page);
  await page.evaluate(() => {
    // shared helpers for the evaluate calls below
    window.__sa = {
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
        return pts;
      },
      // a nearly flat stroke from x1 to x2 at y, wobbling by a pixel
      line(x1, x2, y) {
        const pts = [];
        for (let x = x1; x < x2; x += 4) pts.push([x, y + Math.sin(x / 9)]);
        pts.push([x2, y]);
        return pts;
      },
      wordRange(el, word) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const i = n.data.indexOf(word);
          if (i < 0) continue;
          const range = document.createRange();
          range.setStart(n, i);
          range.setEnd(n, i + word.length);
          return range;
        }
        return null;
      },
      pageBounds(points) {
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
      },
    };
  });
});

async function resize(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));
}

test('a loop around a word resolves to where it was drawn', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { anchorStroke, resolveStroke } = await __sa.mod();
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    const word = __sa.wordRange(h2, h2.textContent.trim().split(/\s+/)[0]).getBoundingClientRect();
    const input = __sa.loop(word);
    const stroke = anchorStroke(input, 'pen');
    const out = resolveStroke(stroke);
    const expected = input.map(([x, y]) => [x + scrollX, y + scrollY]);
    return { stroke, points: out.points, expected, scale: out.scale };
  });
  expect(result.stroke.char).toBeTruthy();
  expect(result.scale).toBe(1);
  expect(result.points.length).toBe(result.expected.length);
  result.points.forEach((p, i) => {
    expect(Math.abs(p[0] - result.expected[i][0])).toBeLessThanOrEqual(1);
    expect(Math.abs(p[1] - result.expected[i][1])).toBeLessThanOrEqual(1);
  });
});

test('the loop follows its word to another width and scales with it', async ({ page }) => {
  const drawn = await page.evaluate(async () => {
    const { anchorStroke } = await __sa.mod();
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    const word = __sa.wordRange(h2, h2.textContent.trim().split(/\s+/)[0]).getBoundingClientRect();
    const input = __sa.loop(word);
    const b = __sa.pageBounds(input);
    return { stroke: anchorStroke(input, 'pen'), width: b.right - b.left, font: parseFloat(getComputedStyle(h2).fontSize) };
  });
  expect(drawn.stroke.char).toBeTruthy();

  for (const width of [900, 390]) {
    await resize(page, width);
    const now = await page.evaluate(async stroke => {
      const { resolveStroke } = await __sa.mod();
      const h2 = document.querySelector('#story h2');
      __sa.show(h2);
      const r = __sa.wordRange(h2, h2.textContent.trim().split(/\s+/)[0]).getBoundingClientRect();
      const word = { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY };
      const out = resolveStroke(stroke);
      const b = __sa.pageBounds(out.points);
      return { word, b, width: b.right - b.left, font: parseFloat(getComputedStyle(h2).fontSize) };
    }, drawn.stroke);
    expect(now.b.left).toBeLessThanOrEqual(now.word.left);
    expect(now.b.right).toBeGreaterThanOrEqual(now.word.right);
    expect(now.b.top).toBeLessThanOrEqual(now.word.top);
    expect(now.b.bottom).toBeGreaterThanOrEqual(now.word.bottom);
    const ratio = (now.width / drawn.width) / (now.font / drawn.font);
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  }
  // the font really did change size, so the scaling was exercised
  expect(drawn.font).toBeGreaterThan(40);
});

test('an underline anchors to the text above it', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { anchorStroke } = await __sa.mod();
    const sub = document.querySelector('.hero-sub');
    __sa.show(sub);
    const range = __sa.wordRange(sub, 'network');
    const r = range.getBoundingClientRect();
    const stroke = anchorStroke(__sa.line(r.left - 2, r.right + 2, r.bottom + 6), 'pen');
    return {
      stroke,
      sameElement: !!stroke.char && document.querySelector(stroke.char.path) === sub,
      start: range.startOffset,
      end: range.endOffset,
    };
  });
  expect(result.stroke.char).toBeTruthy();
  expect(result.sameElement).toBe(true);
  expect(result.stroke.char.i).toBe(0);
  expect(result.stroke.char.o).toBeGreaterThanOrEqual(result.start);
  expect(result.stroke.char.o).toBeLessThan(result.end);
});

// .hero-sub keeps the same two lines at 1440 and 390 (34ch at a fixed 22px fits the phone column), so its first
// line never wraps. The app section's lead does: its first line at 1440 breaks across three at 390.
test('a highlighter across a line follows the words when they wrap', async ({ page }) => {
  const drawn = await page.evaluate(async () => {
    const { anchorStroke } = await __sa.mod();
    const lead = document.querySelector('#app .lead');
    __sa.show(lead);
    const text = [...lead.childNodes].find(n => n.nodeType === 3 && n.data.trim());
    const range = document.createRange();
    const charRect = i => { range.setStart(text, i); range.setEnd(text, i + 1); return range.getBoundingClientRect(); };
    // the first line's characters, ending at its last non-space character
    const top = charRect(0).top;
    let last = 0;
    for (let i = 0; i < text.length && Math.abs(charRect(i).top - top) <= 2; i++) if (text.data[i].trim()) last = i;
    range.setStart(text, 0);
    range.setEnd(text, last + 1);
    const line = range.getBoundingClientRect();
    const stroke = anchorStroke(__sa.line(line.left - 4, line.right + 4, (line.top + line.bottom) / 2), 'highlighter');
    return { stroke, end: last + 1, words: text.data.slice(0, last + 1) };
  });
  expect(drawn.stroke.text).toBeTruthy();
  expect(drawn.words.trim().split(/\s+/).length).toBeGreaterThan(1);

  await resize(page, 390);
  const now = await page.evaluate(async ({ stroke, end }) => {
    const { resolveStroke } = await __sa.mod();
    const lead = document.querySelector('#app .lead');
    __sa.show(lead);
    const text = [...lead.childNodes].find(n => n.nodeType === 3 && n.data.trim());
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, end);
    const rects = [...range.getClientRects()].filter(r => r.width > 0)
      .map(r => ({ left: r.left + scrollX, right: r.right + scrollX, mid: (r.top + r.bottom) / 2 + scrollY, h: r.height }));
    return { bands: resolveStroke(stroke).bands, rects };
  }, drawn);
  expect(now.bands.length).toBeGreaterThanOrEqual(2);
  for (const r of now.rects) {
    const band = now.bands.find(b => Math.abs(b.y - r.mid) <= r.h / 2);
    expect(band, `a band on the line at ${r.mid}`).toBeTruthy();
    expect(band.x1).toBeLessThanOrEqual(r.left + 1);
    expect(band.x2).toBeGreaterThanOrEqual(r.right - 1);
  }
});

test('a highlighter loop keeps its shape', async ({ page }) => {
  const stroke = await page.evaluate(async () => {
    const { anchorStroke } = await __sa.mod();
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    return anchorStroke(__sa.loop(__sa.wordRange(h2, 'started').getBoundingClientRect()), 'highlighter');
  });
  expect(stroke.ink).toBe('highlighter');
  expect(stroke.text).toBeUndefined();
});

test('a stroke whose element is gone resolves to null', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { anchorStroke, resolveStroke } = await __sa.mod();
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    const stroke = anchorStroke(__sa.loop(__sa.wordRange(h2, 'How').getBoundingClientRect()), 'pen');
    const before = resolveStroke(stroke) !== null;
    h2.remove();
    return { before, after: resolveStroke(stroke) };
  });
  expect(result.before).toBe(true);
  expect(result.after).toBeNull();
});

test('a loop whose character is lost falls back to its element, where the character was', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { anchorStroke, resolveStroke } = await __sa.mod();
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    const stroke = anchorStroke(__sa.loop(__sa.wordRange(h2, 'started').getBoundingClientRect()), 'pen');
    const drawn = resolveStroke(stroke);
    const lost = resolveStroke({ ...stroke, char: { ...stroke.char, i: 99 } });
    return { atOnH2: document.querySelector(stroke.at.path) === h2, drawn, lost };
  });
  expect(result.atOnH2).toBe(true);
  expect(result.lost.scale).toBe(1);
  // the character's top-left can rise a few px above its element's box, which is as close as the element gets
  result.lost.points.forEach((p, i) => {
    expect(Math.abs(p[0] - result.drawn.points[i][0])).toBeLessThanOrEqual(1);
    expect(Math.abs(p[1] - result.drawn.points[i][1])).toBeLessThanOrEqual(8);
  });
});

test('strokeShifted is true when what a loop surrounded has split apart', async ({ page }) => {
  const drawn = await page.evaluate(async () => {
    const { anchorStroke, resolveStroke, strokeShifted } = await __sa.mod();
    const split = document.querySelector('#what-we-do .split');
    __sa.show(split);
    const stroke = anchorStroke(__sa.loop(split.getBoundingClientRect(), 12), 'pen');
    return { stroke, shifted: strokeShifted(stroke, resolveStroke(stroke)) };
  });
  expect(drawn.stroke.inside.length).toBeGreaterThanOrEqual(2);
  expect(drawn.shifted).toBe(false);

  // still side by side at 900; stacked at 390
  for (const [width, expected] of [[900, false], [390, true]]) {
    await resize(page, width);
    const shifted = await page.evaluate(async stroke => {
      const { resolveStroke, strokeShifted } = await __sa.mod();
      return strokeShifted(stroke, resolveStroke(stroke));
    }, drawn.stroke);
    expect(shifted, `at ${width}`).toBe(expected);
  }
});

test('a stroke over the typed headline survives retyping', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => (document.getElementById('slot')?.textContent.trim().length ?? 0) >= 4);
  const stroke = await page.evaluate(async () => {
    const { anchorStroke } = await __sa.mod();
    return anchorStroke(__sa.loop(document.getElementById('slot').getBoundingClientRect()), 'pen');
  });
  await page.waitForTimeout(4000);
  const result = await page.evaluate(async stroke => {
    const { resolveStroke } = await __sa.mod();
    const inSlot = path => !!document.querySelector(path)?.closest('#slot');
    return {
      resolved: resolveStroke(stroke) !== null,
      atInSlot: inSlot(stroke.at.path),
      charInSlot: stroke.char ? inSlot(stroke.char.path) : false,
    };
  }, stroke);
  expect(result.resolved).toBe(true);
  expect(result.atInSlot).toBe(false);
  expect(result.charInSlot).toBe(false);
});

test('caretAt sees through comment mode\'s interface', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { caretAt } = await import('/review/anchor.js');
    const h2 = document.querySelector('#story h2');
    __sa.show(h2);
    const r = __sa.wordRange(h2, 'started').getBoundingClientRect();
    const cover = document.createElement('div');
    cover.dataset.reviewUi = '';
    cover.textContent = 'interface text';
    Object.assign(cover.style, {
      position: 'fixed', left: `${r.left - 20}px`, top: `${r.top - 20}px`, width: `${r.width + 40}px`,
      height: `${r.height + 40}px`, zIndex: 99999, background: 'white', pointerEvents: 'auto',
    });
    document.body.append(cover);
    const hit = caretAt(r.left + r.width / 2, r.top + r.height / 2);
    return { inH2: !!hit && h2.contains(hit.node), coverStyle: cover.getAttribute('style') };
  });
  expect(result.inH2).toBe(true);
  expect(result.coverStyle).toContain('pointer-events: auto');
});

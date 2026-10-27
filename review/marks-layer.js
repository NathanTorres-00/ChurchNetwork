// Draws comment mode's marks over the page: pins for comments and voice memos, arrows, highlight boxes and
// marker drawings. Each mark is tied to its element by an anchor (a drawing's strokes each by their own), so it
// is repositioned whenever the layout changes.
import { findByPath, resolveAnchor } from './anchor.js';
import { bandHeight, strokeWidth } from './eraser.js';
import { INK, centerline, penOutline } from './ink.js';
import { resolveStroke, strokeShifted } from './stroke-anchor.js';
import { ICONS } from './workspace.js';

const NS = 'http://www.w3.org/2000/svg';
const PAD = 12;
const ARROW_WIDTH = 2.5;          // px, an arrow's usual line width
const HIT = 18;                   // px, the least width of the invisible line that catches clicks on ink
const anchorsOf = m => (m.at ? [m.at] : [m.from, m.to]).filter(Boolean);
// Every element a mark's position depends on: a drawing's strokes sit on a character, an element, the elements
// they were drawn around and the text they highlight
const watchedPaths = m => (m.kind === 'drawing'
  ? (m.strokes ?? []).flatMap(s => [s.at, s.char, ...(s.inside ?? []), s.text?.start, s.text?.end])
  : anchorsOf(m)).filter(Boolean).map(a => a.path);
const r2 = v => Math.round(v * 100) / 100;

export function createMarksLayer() {
  // A child of <html>, so its absolute coordinates are page coordinates even when <body> is offset
  const root = document.createElement('div');
  root.className = 'rv-marks';
  root.dataset.reviewUi = '';
  document.documentElement.appendChild(root);

  let items = [];                 // { mark, el, draft, found }: a drawing's found strokes, as last drawn
  let selectedId = null;
  const selectHandlers = [];
  let frame = 0;

  function build(mark, draft) {
    const label = `${mark.kind === 'voice' ? 'Voice memo' : mark.kind[0].toUpperCase() + mark.kind.slice(1)}${mark.author ? ' from ' + mark.author : ''}`;
    let el;
    if (mark.kind === 'comment' || mark.kind === 'voice') {
      el = document.createElement('button');
      el.className = `rv-pin rv-pin-${mark.kind}`;
      el.innerHTML = `<span class="rv-pin-dot"></span><span class="rv-pin-bubble">${ICONS[mark.kind]}</span>`;
    } else if (mark.kind === 'arrow') {
      el = document.createElement('button');
      el.className = 'rv-arrow';
      const svg = document.createElementNS(NS, 'svg');
      svg.innerHTML = '<line class="rv-arrow-hit"/><line class="rv-arrow-line"/><path class="rv-arrow-head"/>';
      el.appendChild(svg);
    } else if (mark.kind === 'drawing') {
      el = document.createElement('button');
      el.className = 'rv-drawing';
      // highlighter ink under the pen, each in its own SVG, so the highlighter's can blend with the page
      el.innerHTML = '<svg class="rv-ink-highlighter"></svg><svg class="rv-ink-pen"></svg>';
    } else {
      el = document.createElement('button');
      el.className = 'rv-highlight';
    }
    el.type = 'button';
    el.dataset.id = mark._id ?? 'draft';
    el.setAttribute('aria-label', draft ? 'New mark' : label);
    if (draft) { el.classList.add('rv-draft'); el.tabIndex = -1; }
    else el.addEventListener('click', e => { e.stopPropagation(); selectHandlers.forEach(cb => cb(mark._id)); });
    if (mark.resolved) el.classList.add('rv-resolved');
    root.appendChild(el);
    return el;
  }

  // A highlighter band along a line of text, with a slight hand-drawn lean
  const band = b => {
    const j = b.h * 0.05;
    return `M${r2(b.x1)} ${r2(b.y + j)} Q${r2((b.x1 + b.x2) / 2)} ${r2(b.y - j)} ${r2(b.x2)} ${r2(b.y + j / 2)}`;
  };

  // A drawing is drawn in SVG over its strokes. Each stroke is a group of a wide invisible line that catches
  // clicks and the ink itself: the pen as a filled, tapering outline; the highlighter as a line with flat ends,
  // or one band per line of the text it covers. Strokes that can't be found are left out and the drawing counts as
  // missing; it hides only when none can be found.
  function placeDrawing(item) {
    const { mark, el } = item;
    const strokes = mark.strokes ?? [];
    const found = item.found = [];
    for (const stroke of strokes) {
      const at = resolveStroke(stroke);
      if (at) found.push({ stroke, at });
    }
    el.hidden = !found.length;
    if (!found.length) return { missing: strokes.length > 0, shifted: false };
    el.classList.toggle('rv-selected', mark._id != null && mark._id === selectedId);

    const xs = [], ys = [];
    for (const { at } of found) {
      for (const [x, y] of at.points) { xs.push(x); ys.push(y); }
      for (const b of at.bands ?? []) xs.push(b.x1, b.x2), ys.push(b.y - b.h / 2, b.y + b.h / 2);
    }
    const pad = PAD + Math.max(...found.map(({ stroke }) => strokeWidth(stroke))) / 2;
    const left = Math.min(...xs) - pad, top = Math.min(...ys) - pad;
    const w = Math.max(...xs) - left + pad, h = Math.max(...ys) - top + pad;
    Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
    const drawn = found.map(({ stroke, at }) => {
      const local = at.points.map(([x, y]) => [x - left, y - top]);
      const width = strokeWidth(stroke);
      const { color } = INK[stroke.ink];
      const hit = (d, w) => `<path class="rv-stroke-hit" d="${d}" style="stroke-width:${r2(Math.max(HIT, w + 8))}px"/>`;
      if (stroke.ink === 'pen') {
        return `<g class="rv-stroke rv-stroke-pen">${hit(centerline(local), width)}` +
          `<path d="${penOutline(local, { width, pressures: stroke.pr, cut: stroke.cut })}" fill="${color}"/></g>`;
      }
      const lines = at.bands
        ? at.bands.map(b => ({ d: band({ ...b, x1: b.x1 - left, x2: b.x2 - left, y: b.y - top }), width: bandHeight(stroke, b) }))
        : [{ d: centerline(local), width }];
      return '<g class="rv-stroke rv-stroke-highlighter">' +
        lines.map(l => hit(l.d, l.width)).join('') +
        lines.map(l => `<path d="${l.d}" fill="none" stroke="${color}" stroke-width="${r2(l.width)}" stroke-linecap="butt" stroke-linejoin="round"/>`).join('') +
        '</g>';
    });
    for (const ink of ['highlighter', 'pen']) {
      const svg = el.querySelector(`.rv-ink-${ink}`);
      svg.setAttribute('viewBox', `0 0 ${r2(w)} ${r2(h)}`);
      svg.setAttribute('width', r2(w)); svg.setAttribute('height', r2(h));
      svg.innerHTML = drawn.filter((_, i) => found[i].stroke.ink === ink).join('');
    }
    return { missing: found.length < strokes.length, shifted: found.some(({ stroke, at }) => strokeShifted(stroke, at)) };
  }

  function place(item) {
    const { mark, el } = item;
    if (mark.kind === 'drawing') return placeDrawing(item);
    const pts = anchorsOf(mark).map(resolveAnchor);
    const missing = !pts.length || pts.some(p => !p);
    el.hidden = missing;
    if (missing) return { missing, shifted: false };
    el.classList.toggle('rv-selected', mark._id != null && mark._id === selectedId);
    if (mark.at) {
      Object.assign(el.style, { left: pts[0].x + 'px', top: pts[0].y + 'px' });
    } else if (mark.kind === 'highlight') {
      const [a, b] = pts;
      Object.assign(el.style, { left: Math.min(a.x, b.x) + 'px', top: Math.min(a.y, b.y) + 'px', width: Math.abs(b.x - a.x) + 'px', height: Math.abs(b.y - a.y) + 'px' });
    } else {
      const [a, b] = pts;
      const left = Math.min(a.x, b.x) - PAD, top = Math.min(a.y, b.y) - PAD;
      const w = Math.abs(b.x - a.x) + PAD * 2, h = Math.abs(b.y - a.y) + PAD * 2;
      Object.assign(el.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
      const svg = el.firstChild;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', w); svg.setAttribute('height', h);
      const x1 = a.x - left, y1 = a.y - top, x2 = b.x - left, y2 = b.y - top;
      for (const line of svg.querySelectorAll('line')) {
        line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      }
      const sw = ARROW_WIDTH * (mark.w ?? 1);
      el.style.setProperty('--rv-arrow-w', r2(sw) + 'px');
      el.style.setProperty('--rv-arrow-hit', r2(Math.max(HIT, sw + 12)) + 'px');
      const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.max(12, sw * 4), spread = 0.5;
      const p1 = [x2 - len * Math.cos(ang - spread), y2 - len * Math.sin(ang - spread)];
      const p2 = [x2 - len * Math.cos(ang + spread), y2 - len * Math.sin(ang + spread)];
      svg.querySelector('path').setAttribute('d', `M${p1} L${x2},${y2} L${p2}`);
    }
    return { missing: false, shifted: false };
  }

  // Watch the elements marks are tied to, as well as the page as a whole
  const ro = new ResizeObserver(() => schedule());
  let watched = new Set();
  function watch() {
    const next = new Set([document.body]);
    for (const { mark } of items) for (const path of watchedPaths(mark)) { const el = findByPath(path); if (el) next.add(el); }
    for (const el of watched) if (!next.has(el)) ro.unobserve(el);
    for (const el of next) if (!watched.has(el)) ro.observe(el);
    watched = next;
  }

  let shiftedIds = new Set();
  function reposition() {
    frame = 0;
    const missing = new Set();
    shiftedIds = new Set();
    for (const item of items) {
      const placed = place(item);
      if (item.draft) continue;
      if (placed.missing) missing.add(item.mark._id);
      if (placed.shifted) shiftedIds.add(item.mark._id);
    }
    return missing;
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(reposition); }

  const onLoad = () => schedule();
  window.addEventListener('resize', schedule);
  window.addEventListener('load', onLoad);
  document.addEventListener('load', onLoad, true);          // images finishing load shift the layout
  document.fonts?.ready.then(schedule);

  return {
    el: root,
    // Draws the given marks (and an optional draft); returns the ids of marks whose element is gone
    render(marks, { selectedId: sel = null, draft = null } = {}) {
      selectedId = sel;
      for (const { el } of items) el.remove();
      items = marks.map(mark => ({ mark, el: build(mark, false), draft: false }));
      if (draft) items.push({ mark: draft, el: build(draft, true), draft: true });
      watch();
      return reposition();
    },
    onSelect(cb) { selectHandlers.push(cb); },
    // Where the draft drawing's strokes are drawn now: { stroke, at } for each one found, as last drawn
    draftPlaced: () => items.find(i => i.draft)?.found ?? [],
    // The ids of drawings where what a stroke surrounded has split apart at this width (as last drawn)
    shifted: () => shiftedIds,
    // Where a mark is on the page, for scrolling to it
    positionOf(id) {
      const item = items.find(i => i.mark._id === id);
      if (!item || item.el.hidden) return null;
      const r = item.el.getBoundingClientRect();
      return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
    },
    reposition,
    destroy() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', onLoad);
      document.removeEventListener('load', onLoad, true);
      root.remove();
    },
  };
}

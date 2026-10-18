// Draws comment mode's marks over the page: pins for comments and voice memos, arrows, and highlight boxes.
// Each mark is tied to its element by an anchor, so it is repositioned whenever the layout changes.
import { findByPath, resolveAnchor } from './anchor.js';
import { ICONS } from './workspace.js';

const NS = 'http://www.w3.org/2000/svg';
const PAD = 12;
const anchorsOf = m => (m.at ? [m.at] : [m.from, m.to]).filter(Boolean);

export function createMarksLayer() {
  // A child of <html>, so its absolute coordinates are page coordinates even when <body> is offset
  const root = document.createElement('div');
  root.className = 'rv-marks';
  root.dataset.reviewUi = '';
  document.documentElement.appendChild(root);

  let items = [];                 // { mark, el, draft }
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

  function place({ mark, el }) {
    const pts = anchorsOf(mark).map(resolveAnchor);
    const missing = !pts.length || pts.some(p => !p);
    el.hidden = missing;
    if (missing) return false;
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
      const ang = Math.atan2(y2 - y1, x2 - x1), len = 12, spread = 0.5;
      const p1 = [x2 - len * Math.cos(ang - spread), y2 - len * Math.sin(ang - spread)];
      const p2 = [x2 - len * Math.cos(ang + spread), y2 - len * Math.sin(ang + spread)];
      svg.querySelector('path').setAttribute('d', `M${p1} L${x2},${y2} L${p2}`);
    }
    return true;
  }

  // Watch the elements marks are tied to, as well as the page as a whole
  const ro = new ResizeObserver(() => schedule());
  let watched = new Set();
  function watch() {
    const next = new Set([document.body]);
    for (const { mark } of items) for (const a of anchorsOf(mark)) { const el = findByPath(a.path); if (el) next.add(el); }
    for (const el of watched) if (!next.has(el)) ro.unobserve(el);
    for (const el of next) if (!watched.has(el)) ro.observe(el);
    watched = next;
  }

  function reposition() {
    frame = 0;
    const missing = new Set();
    for (const item of items) if (!place(item) && !item.draft) missing.add(item.mark._id);
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

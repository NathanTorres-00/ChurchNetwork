// Turns clicks and drags on the page into draft marks while a markup tool is active. The page's own links
// and buttons don't fire while placing; comment mode's interface ([data-review-ui]) works as usual.
import { anchorAt } from './anchor.js';

const POINT_TOOLS = new Set(['comment', 'voice']);
const DRAG_TOOLS = new Set(['arrow']);
const MIN_DRAG = 8;
const ARROW_WIDTH = 2.5;       // px, an arrow's usual line width

// getWidth: the arrow's width, as a share of the usual
export function createPlacing({ getTool, getWidth = () => 1, onDraft }) {
  let start = null;            // { x, y, id } in client coordinates
  let preview = null;

  const placing = () => POINT_TOOLS.has(getTool()) || DRAG_TOOLS.has(getTool());
  // comment mode's own interface, and the page's Comment button that opens and closes it, work as usual
  const onPage = e => e.target instanceof Element && !e.target.closest('[data-review-ui], [data-review-toggle]');
  const block = e => { e.preventDefault(); e.stopPropagation(); };

  function drawPreview(e) {
    const tool = getTool();
    if (!preview) {
      preview = document.createElement('div');
      preview.className = `rv-preview rv-preview-${tool}`;
      preview.dataset.reviewUi = '';
      document.body.appendChild(preview);
      preview.style.borderTopWidth = `${ARROW_WIDTH * getWidth()}px`;
    }
    const x1 = start.x, y1 = start.y, x2 = e.clientX, y2 = e.clientY;
    const len = Math.hypot(x2 - x1, y2 - y1), angle = Math.atan2(y2 - y1, x2 - x1);
    Object.assign(preview.style, { left: x1 + 'px', top: y1 + 'px', width: len + 'px', transform: `rotate(${angle}rad)` });
  }
  const clearPreview = () => { preview?.remove(); preview = null; };

  // While the page glides in or out it's a moving picture: clicks on it would land in the wrong place, so they
  // do nothing (and don't reach the page either)
  const gliding = () => /\brv-gliding-(in|out)\b/.test(document.documentElement.className);

  function down(e) {
    if (!placing() || !onPage(e) || e.button > 0) return;
    block(e);
    if (gliding()) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* not capturable */ }
  }
  function move(e) {
    if (!start || e.pointerId !== start.id) return;
    block(e);
    if (DRAG_TOOLS.has(getTool()) && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= MIN_DRAG) drawPreview(e);
  }
  function up(e) {
    if (!start || e.pointerId !== start.id) return;
    block(e);
    const tool = getTool(), s = start;
    start = null;
    clearPreview();
    if (POINT_TOOLS.has(tool)) onDraft({ kind: tool, at: anchorAt(s.x, s.y) });
    else if (DRAG_TOOLS.has(tool) && Math.hypot(e.clientX - s.x, e.clientY - s.y) >= MIN_DRAG) {
      onDraft({ kind: tool, from: anchorAt(s.x, s.y), to: anchorAt(e.clientX, e.clientY) });
    }
  }
  function cancel() { start = null; clearPreview(); }
  // Clicks that follow a placing gesture shouldn't follow links or press the page's buttons
  function click(e) { if (placing() && onPage(e)) block(e); }

  const opts = { capture: true };
  document.addEventListener('pointerdown', down, opts);
  document.addEventListener('pointermove', move, opts);
  document.addEventListener('pointerup', up, opts);
  document.addEventListener('pointercancel', cancel, opts);
  document.addEventListener('click', click, opts);

  return {
    destroy() {
      cancel();
      document.removeEventListener('pointerdown', down, opts);
      document.removeEventListener('pointermove', move, opts);
      document.removeEventListener('pointerup', up, opts);
      document.removeEventListener('pointercancel', cancel, opts);
      document.removeEventListener('click', click, opts);
    },
  };
}

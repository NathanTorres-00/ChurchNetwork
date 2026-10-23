// Draws with the Marker: turns a press and drag on the page into a stroke, drawn live over the page as the
// pointer moves, and hands the finished stroke to comment mode. The page's own links and buttons don't fire while
// the Marker is on; comment mode's interface ([data-review-ui]) works as usual.
import { INK, centerline, inkWidth, penOutline } from './ink.js';

const NS = 'http://www.w3.org/2000/svg';
const MIN_STEP = 1;            // px; points closer than this to the last one are dropped as they come in
const MIN_MOVE = 3;            // px of movement in all before a press counts as a stroke

export function createMarker({ getTool, getInk, onStroke }) {
  let live = null;             // { id, ink, points, pressures, moved } in client coordinates
  let overlay = null;          // the fixed SVG the live stroke is drawn in
  let frame = 0;

  const active = () => getTool() === 'marker';
  // comment mode's own interface, and the page's Comment button that opens and closes it, work as usual
  const onPage = e => e.target instanceof Element && !e.target.closest('[data-review-ui], [data-review-toggle]');
  const block = e => { e.preventDefault(); e.stopPropagation(); };
  // nothing is drawn while the page glides in or out, as with placing
  const gliding = () => /\brv-gliding-(in|out)\b/.test(document.documentElement.className);

  function paint() {
    frame = 0;
    if (!live) return;
    if (!overlay) {
      overlay = document.createElementNS(NS, 'svg');
      overlay.setAttribute('class', 'rv-live');
      overlay.dataset.reviewUi = '';
      overlay.appendChild(document.createElementNS(NS, 'path'));
      document.documentElement.appendChild(overlay);
    }
    const path = overlay.firstChild;
    const width = inkWidth(live.ink);
    const { color } = INK[live.ink];
    overlay.classList.toggle('rv-live-highlighter', live.ink === 'highlighter');
    if (live.ink === 'pen') {
      path.setAttribute('d', penOutline(live.points, { width, pressures: live.pressures }));
      path.setAttribute('fill', color);
      path.removeAttribute('stroke');
    } else {
      path.setAttribute('d', centerline(live.points));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', width);
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

  function add(e) {
    const last = live.points[live.points.length - 1];
    const step = Math.hypot(e.clientX - last[0], e.clientY - last[1]);
    if (step < MIN_STEP) return;
    live.moved += step;
    live.points.push([e.clientX, e.clientY]);
    live.pressures?.push(e.pressure);
  }

  function down(e) {
    if (!active() || !onPage(e) || e.button > 0) return;
    block(e);
    if (gliding() || live) return;
    // a press on the page leaves the note being typed, as a click would, so Cmd/Ctrl+Z then undoes strokes
    if (document.activeElement?.matches('input, textarea')) document.activeElement.blur();
    live = {
      id: e.pointerId, ink: getInk(), points: [[e.clientX, e.clientY]],
      pressures: e.pointerType === 'pen' ? [e.pressure] : null, moved: 0,
    };
    try { e.target.setPointerCapture?.(e.pointerId); } catch { /* not capturable */ }
    schedule();
  }
  function move(e) {
    if (!live || e.pointerId !== live.id) return;
    block(e);
    for (const c of e.getCoalescedEvents?.() ?? []) add(c);
    add(e);
    schedule();
  }
  function up(e) {
    if (!live || e.pointerId !== live.id) return;
    block(e);
    const { ink, points, pressures, moved } = live;
    live = null;
    if (moved < MIN_MOVE) { clearLive(); return; }
    onStroke({ ink, points, pressures });
  }
  function cancel(e) {
    if (live && e.pointerId === live.id) { live = null; clearLive(); }
  }
  // Clicks that follow a stroke, or a press that never moved, shouldn't follow links or press the page's buttons
  function click(e) { if (active() && onPage(e)) block(e); }

  function clearLive() {
    cancelAnimationFrame(frame);
    frame = 0;
    overlay?.remove();
    overlay = null;
  }

  const opts = { capture: true };
  document.addEventListener('pointerdown', down, opts);
  document.addEventListener('pointermove', move, opts);
  document.addEventListener('pointerup', up, opts);
  document.addEventListener('pointercancel', cancel, opts);
  document.addEventListener('click', click, opts);

  return {
    // Removes the live stroke; comment mode calls it once the stroke is drawn as part of the draft
    clearLive,
    destroy() {
      live = null;
      clearLive();
      document.removeEventListener('pointerdown', down, opts);
      document.removeEventListener('pointermove', move, opts);
      document.removeEventListener('pointerup', up, opts);
      document.removeEventListener('pointercancel', cancel, opts);
      document.removeEventListener('click', click, opts);
    },
  };
}

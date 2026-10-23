// Draws with the Marker: turns a press and drag on the page into a stroke, drawn live over the page as the
// pointer moves, and hands the finished stroke to comment mode. The page's own links and buttons don't fire while
// the Marker is on; comment mode's interface ([data-review-ui]) works as usual.
//
// On a touch screen one finger draws and two fingers scroll the page (the page's touch-action is none while the
// Marker is on, so the scrolling is done here). Once a stylus has drawn, it does the drawing and fingers don't.
// Where touches say they're a stylus (Safari's Pencil), fingers then scroll the page as usual, like a notes app:
// html.rv-stylus gives the page its touch-action back, and the stylus's own touches are kept from scrolling.
// Elsewhere touch-action stays none, since a pen would pan the page too, and two fingers still scroll.
import { INK, centerline, inkWidth, penOutline } from './ink.js';

const NS = 'http://www.w3.org/2000/svg';
const MIN_STEP = 1;            // px; points closer than this to the last one are dropped as they come in
const MIN_MOVE = 3;            // px of movement in all before a press counts as a stroke

export function createMarker({ getTool, getInk, onStroke }) {
  let live = null;             // { id, type, ink, points, pressures, moved } in client coordinates
  let overlay = null;          // the fixed SVG the live stroke is drawn in
  let frame = 0;
  const fingers = new Map();   // touch points down on the page, by pointerId: [x, y] in client coordinates
  let between = null;          // with two fingers down, the point between them; the page scrolls as it moves
  let penSeen = false;         // a stylus has drawn, so fingers no longer do

  const root = document.documentElement;
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

  // The point between the first two fingers down
  function midpoint() {
    const [a, b] = fingers.values();
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  // Two fingers moving together scroll the page by as much as they move
  function scrollWith(e) {
    fingers.set(e.pointerId, [e.clientX, e.clientY]);
    const next = midpoint();
    const dy = next[1] - between[1];
    between = next;
    if (!dy) return;
    if (window.__lenis) window.__lenis.scrollTo(window.scrollY - dy, { immediate: true });
    else window.scrollBy(0, -dy);
  }
  function lift(e) {
    if (fingers.delete(e.pointerId)) between = fingers.size > 1 ? midpoint() : null;
  }

  function down(e) {
    if (!active() || !onPage(e) || e.button > 0) return;
    block(e);
    if (e.pointerType === 'pen') penSeen = true;                     // from now on the stylus draws
    if (e.pointerType === 'touch') {
      if (root.classList.contains('rv-stylus')) return;              // fingers scroll the page, and never draw
      // the first finger down: nothing else is touching, so anything left from before (a lost pointerup) goes.
      // A stylus stroke being drawn isn't a finger's, so it stays.
      if (e.isPrimary) { fingers.clear(); between = null; dropTouch(); }
      fingers.set(e.pointerId, [e.clientX, e.clientY]);
      // a second finger turns the gesture into a scroll, and the stroke begun with the first goes without a trace
      if (fingers.size > 1) { dropTouch(); between = midpoint(); return; }
      if (penSeen) return;                                           // one finger does nothing once a stylus has drawn
    }
    if (gliding() || live) return;
    // a press on the page leaves the note being typed, as a click would, so Cmd/Ctrl+Z then undoes strokes
    if (document.activeElement?.matches('input, textarea')) document.activeElement.blur();
    live = {
      id: e.pointerId, type: e.pointerType, ink: getInk(), points: [[e.clientX, e.clientY]],
      pressures: e.pointerType === 'pen' ? [e.pressure] : null, moved: 0,
    };
    // on the page itself, since what was pressed may go mid-stroke (the typed headline's letters)
    try { root.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    schedule();
  }
  // The stroke being drawn goes without a trace: Esc, a cancelled pointer, or the tool changing mid-stroke
  function drop() { live = null; clearLive(); }
  function dropTouch() { if (live?.type === 'touch') drop(); }

  function move(e) {
    if (between && fingers.has(e.pointerId)) { block(e); scrollWith(e); return; }
    if (!live || e.pointerId !== live.id) return;
    // a mouse moving with no button down was released where we didn't hear it (outside the window, say)
    if (e.pointerType === 'mouse' && e.buttons === 0) { up(e); return; }
    block(e);
    if (!active()) { drop(); return; }
    for (const c of e.getCoalescedEvents?.() ?? []) add(c);
    add(e);
    schedule();
  }
  function up(e) {
    lift(e);
    if (!live || e.pointerId !== live.id) return;
    block(e);
    if (!active()) { drop(); return; }
    const { ink, points, pressures, moved } = live;
    live = null;
    if (moved < MIN_MOVE) { clearLive(); return; }
    onStroke({ ink, points, pressures });
  }
  function cancel(e) {
    lift(e);
    if (live && e.pointerId === live.id) drop();
  }
  // Safari tells a Pencil from a finger only on touch events, and there a stylus touch can be kept from scrolling.
  // So once one is seen, fingers get to scroll the page natively (html.rv-stylus), and the stylus still draws.
  function touch(e) {
    if (!active() || !onPage(e) || ![...e.changedTouches].some(t => t.touchType === 'stylus')) return;
    root.classList.add('rv-stylus');
    e.preventDefault();
  }
  // Esc while drawing takes back just that stroke; the next Esc backs out a step as usual
  function key(e) {
    if (e.key !== 'Escape' || !live) return;
    block(e);
    drop();
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
  const touchOpts = { capture: true, passive: false };
  document.addEventListener('pointerdown', down, opts);
  document.addEventListener('pointermove', move, opts);
  document.addEventListener('pointerup', up, opts);
  document.addEventListener('pointercancel', cancel, opts);
  document.addEventListener('click', click, opts);
  document.addEventListener('keydown', key, opts);
  document.addEventListener('touchstart', touch, touchOpts);
  document.addEventListener('touchmove', touch, touchOpts);

  return {
    // Removes the live stroke; comment mode calls it once the stroke is drawn as part of the draft
    clearLive,
    destroy() {
      drop();
      fingers.clear();
      between = null;
      document.removeEventListener('pointerdown', down, opts);
      document.removeEventListener('pointermove', move, opts);
      document.removeEventListener('pointerup', up, opts);
      document.removeEventListener('pointercancel', cancel, opts);
      document.removeEventListener('click', click, opts);
      document.removeEventListener('keydown', key, opts);
      document.removeEventListener('touchstart', touch, touchOpts);
      document.removeEventListener('touchmove', touch, touchOpts);
    },
  };
}

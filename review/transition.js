// The glide into and out of comment mode. Entering, the page recedes into its column between the tool rail and
// the sidebar, then the panels slide in from offscreen; leaving plays it in reverse.
//
// The page reflows to fit the column, and a layout can't morph smoothly into another one, so this uses a view
// transition that dissolves through a blank card: a snapshot of the page recedes into the column while its
// content washes out to white, and the reflowed page fades in on that white card. Leaving is the same played
// backwards, all in one transition: the panels slide away as the column fades to its blank card, then the full
// page grows out of that card to fill the window, its content coming back as it grows. The two layouts are never
// on screen together, so nothing shows double. Without view transitions the panels still slide; with reduced
// motion they only fade.

export const GLIDE_MS = 700;            // the whole page transition, entering (leaving takes about as long)
const PANELS_START_MS = 560;            // panels start arriving as the reflowed page appears
const PANELS_MS = 520 + 2 * 70;         // their slide plus the stagger between them
const PANELS_OUT_MS = 300 + 2 * 40;
const FADE_MS = 200;                    // with reduced motion, panels only fade

const root = document.documentElement;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canGlide = () => typeof document.startViewTransition === 'function' && !reduced();
const wait = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

function scrollToY(y) {
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

// Keeping what the reader was looking at in the same place on screen across the layout change. notePlace() runs
// before the view transition starts (inside one, hit-testing only finds the transition overlay), and
// restorePlace() runs right after the layout changes. At the very top it stays at the very top, so the page's
// header stays in view. Otherwise it holds on to the heading, paragraph or other block at reading height and puts
// it back where it was; where there's no such block (over the globe), it keeps the same point of the section.
function notePlace() {
  const y = innerHeight * 0.4;
  const body = document.body.getBoundingClientRect();
  const block = document.elementsFromPoint(body.left + body.width / 2, y).find(el =>
    el !== root && el !== document.body && !el.closest('[data-review-ui]') && el.getBoundingClientRect().height < innerHeight * 0.5);
  const section = [...document.querySelectorAll('main > section, .site-footer')]
    .find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  const s = section?.getBoundingClientRect();
  return { atTop: scrollY < 1, y, block, blockTop: block?.getBoundingClientRect().top, section, into: s ? (y - s.top) / s.height : 0 };
}
function restorePlace({ atTop, y, block, blockTop, section, into }) {
  let shift = 0;
  if (atTop) shift = -scrollY;
  else if (block?.isConnected) shift = block.getBoundingClientRect().top - blockTop;
  else if (section?.isConnected) { const r = section.getBoundingClientRect(); shift = r.top + into * r.height - y; }
  if (Math.abs(shift) > 0.5) scrollToY(scrollY + shift);
}
function keepInView(change, place = notePlace()) {
  change();
  restorePlace(place);
}

const VARS = ['--rv-glide-x', '--rv-glide-y', '--rv-glide-s', '--rv-clip-l', '--rv-clip-r', '--rv-clip-round'];
const setVars = vars => { for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v); };
const clearVars = () => VARS.forEach(p => root.style.removeProperty(p));
const RADIUS = 20;

// Where the page snapshot recedes to entering, and grows back from leaving. It shrinks only a little and its sides
// draw in to the column's edges with rounded corners, so the receding page becomes the column's card. column: its
// rect on screen.
function setRecedeVars(column) {
  const W = innerWidth;
  const s = Math.min(0.96, Math.max(0.85, column.width / W));
  const x = column.left + column.width / 2 - (W * s) / 2;           // centered on the column
  setVars({
    '--rv-glide-x': `${x}px`, '--rv-glide-y': `${Math.max(0, column.top)}px`, '--rv-glide-s': String(s),
    // the column's edges, in the snapshot's own (unscaled) coordinates
    '--rv-clip-l': `${Math.max(0, (column.left - x) / s)}px`,
    '--rv-clip-r': `${Math.max(0, W - (column.right - x) / s)}px`,
    '--rv-clip-round': `${RADIUS / s}px`,
  });
}

// panels: the workspace root (its data-phase drives the panels' slide in review.css)
export async function glideIn(panels, apply) {
  panels.dataset.phase = 'hidden';
  if (!canGlide()) {
    keepInView(apply);
    await nextFrame();
    panels.dataset.phase = 'in';
    await wait(reduced() ? FADE_MS : PANELS_MS);
    return;
  }
  root.classList.add('rv-gliding-in');
  const place = notePlace();
  const vt = document.startViewTransition(() => {
    keepInView(apply, place);
    setRecedeVars(document.body.getBoundingClientRect());
  });
  const landing = wait(PANELS_START_MS).then(() => { panels.dataset.phase = 'in'; });
  try { await vt.finished; } finally { root.classList.remove('rv-gliding-in'); }
  await landing;
  await wait(Math.max(0, PANELS_START_MS + PANELS_MS - GLIDE_MS));
  clearVars();
}

// Leaving with a view transition, the panels are captured where they sit (rv-gliding-out gives each its own
// snapshot) and slide away inside the transition, so the page starts growing back without waiting for them
export async function glideOut(panels, apply) {
  if (!canGlide()) {
    panels.dataset.phase = 'out';
    await wait(reduced() ? FADE_MS : PANELS_OUT_MS);
    keepInView(apply);
    return;
  }
  root.classList.add('rv-gliding-out');
  setRecedeVars(document.body.getBoundingClientRect());
  const place = notePlace();
  const vt = document.startViewTransition(() => keepInView(apply, place));
  try { await vt.finished; } finally { root.classList.remove('rv-gliding-out'); clearVars(); }
}

export const TIMINGS = { GLIDE_MS, PANELS_START_MS, PANELS_MS, PANELS_OUT_MS };

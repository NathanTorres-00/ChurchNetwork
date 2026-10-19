// The glide into and out of comment mode. Entering, the page shrinks into its column between the tool rail
// and the sidebar, then the panels slide in from offscreen; leaving plays it in reverse. The page reflows to fit
// the column, so the glide uses a view transition: a snapshot of the page shrinks into place and crossfades into
// the reflowed page underneath. Without view transitions the panels still slide; with reduced motion they fade.

export const GLIDE_MS = 700;            // the page receding into its column (growing back takes GROW_MS)
const GROW_MS = 650;
const PANELS_START_MS = 380;            // panels start arriving as the page settles
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

// Runs a layout change while keeping what the reader was looking at in the same place on screen, and returns
// where the content that was at the middle of the screen is now. The page reflows, so it finds the section at
// the middle and how far into it that point is, then puts that point of the section back at the middle. At the
// very top it stays at the very top instead, so the page's header stays in view.
function keepInView(change) {
  const y = innerHeight / 2;
  const atTop = scrollY < 1;
  const section = [...document.querySelectorAll('main > section, .site-footer')]
    .find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  const before = section?.getBoundingClientRect();
  const into = before ? (y - before.top) / before.height : 0;
  change();
  if (atTop) {
    if (scrollY !== 0) scrollToY(0);
  } else if (section) {
    const after = section.getBoundingClientRect();
    const shift = after.top + into * after.height - y;
    if (Math.abs(shift) > 0.5) scrollToY(scrollY + shift);
  }
  if (!section) return y;
  const now = section.getBoundingClientRect();
  return now.top + into * now.height;
}

// Where the snapshot of the page goes to sit in its column. It shrinks only a little (the reflowed page keeps
// its text near full size) and its sides are trimmed to the column's edges with rounded corners, so the receding
// page becomes the column rather than a small copy of the page. It's placed so the content in the middle of the
// screen lines up with where that content sits in the column, so the crossfade doesn't show two of anything.
//   column: the column's rect on screen; from/to: where the middle-of-screen content is in the snapshot / on screen
const VARS = ['--rv-glide-x', '--rv-glide-y', '--rv-glide-s', '--rv-clip-l', '--rv-clip-r', '--rv-clip-round'];
function setColumnVars(column, from, to) {
  const r = column;
  const W = innerWidth;
  const s = Math.min(0.96, Math.max(0.85, r.width / W));
  const x = r.left + r.width / 2 - (W * s) / 2;             // centered on the column
  const y = to - s * from;
  const vars = {
    '--rv-glide-x': `${x}px`, '--rv-glide-y': `${y}px`, '--rv-glide-s': String(s),
    // the column's edges, in the snapshot's own (unscaled) coordinates
    '--rv-clip-l': `${Math.max(0, (r.left - x) / s)}px`,
    '--rv-clip-r': `${Math.max(0, W - (r.right - x) / s)}px`,
    '--rv-clip-round': `${20 / s}px`,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}
const clearColumnVars = () => VARS.forEach(p => root.style.removeProperty(p));

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
  // the snapshot is the page as it was: its middle-of-screen content moves to wherever the column put it
  const vt = document.startViewTransition(() => {
    const now = keepInView(apply);
    setColumnVars(document.body.getBoundingClientRect(), innerHeight / 2, now);
  });
  const landing = wait(PANELS_START_MS).then(() => { panels.dataset.phase = 'in'; });
  try { await vt.finished; } finally { root.classList.remove('rv-gliding-in'); }
  await landing;
  await wait(Math.max(0, PANELS_START_MS + PANELS_MS - GLIDE_MS));
  clearColumnVars();
}

export async function glideOut(panels, apply) {
  panels.dataset.phase = 'out';
  await wait(reduced() ? FADE_MS : PANELS_OUT_MS);
  if (!canGlide()) { keepInView(apply); return; }
  root.classList.add('rv-gliding-out');
  // the snapshot is the full page: it starts with its middle-of-screen content where the column had it
  const column = document.body.getBoundingClientRect();
  const vt = document.startViewTransition(() => {
    const now = keepInView(apply);
    setColumnVars(column, now, innerHeight / 2);
  });
  try { await vt.finished; } finally { root.classList.remove('rv-gliding-out'); clearColumnVars(); }
}

export const TIMINGS = { GLIDE_MS, GROW_MS, PANELS_START_MS, PANELS_MS, PANELS_OUT_MS };

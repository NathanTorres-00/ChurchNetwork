// The glide into and out of comment mode. Entering, the page shrinks into its column between the tool rail
// and the sidebar, then the panels slide in from offscreen; leaving plays it in reverse. The page reflows to fit
// the column, so the glide uses a view transition: a snapshot of the page shrinks into place and crossfades into
// the reflowed page underneath. Without view transitions the panels still slide; with reduced motion they fade.

export const GLIDE_MS = 650;            // the page shrinking into its column (growing back takes GROW_MS)
const GROW_MS = 600;
const PANELS_START_MS = 480;            // panels start arriving as the page lands
const PANELS_MS = 520 + 2 * 90;         // their slide plus the stagger between them
const PANELS_OUT_MS = 380 + 2 * 70;
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

// Runs a layout change while keeping what the reader was looking at in the same place on screen. The page
// reflows, so it finds the section at reading height and how far into it the reader is, and puts that same
// point of the section back at the same height afterwards.
function keepInView(change) {
  const y = Math.min(innerHeight * 0.35, 260);
  const section = [...document.querySelectorAll('main > section, .site-footer')]
    .find(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  const before = section?.getBoundingClientRect();
  const into = before ? (y - before.top) / before.height : 0;
  change();
  if (!section) return;
  const after = section.getBoundingClientRect();
  const shift = after.top + into * after.height - y;
  if (Math.abs(shift) > 0.5) scrollToY(scrollY + shift);
}

// Where the page's column is, as a translate and scale of the full window, for the snapshot to shrink to
function setColumnVars() {
  const r = document.body.getBoundingClientRect();
  const s = Math.min(r.width / innerWidth, 0.96);
  const x = r.left + (r.width - innerWidth * s) / 2;
  root.style.setProperty('--rv-glide-x', `${x}px`);
  root.style.setProperty('--rv-glide-y', `${Math.max(0, r.top)}px`);
  root.style.setProperty('--rv-glide-s', String(s));
}
const clearColumnVars = () => ['--rv-glide-x', '--rv-glide-y', '--rv-glide-s'].forEach(p => root.style.removeProperty(p));

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
  const vt = document.startViewTransition(() => { keepInView(apply); setColumnVars(); });
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
  setColumnVars();
  root.classList.add('rv-gliding-out');
  const vt = document.startViewTransition(() => keepInView(apply));
  try { await vt.finished; } finally { root.classList.remove('rv-gliding-out'); clearColumnVars(); }
}

export const TIMINGS = { GLIDE_MS, GROW_MS, PANELS_START_MS, PANELS_MS, PANELS_OUT_MS };

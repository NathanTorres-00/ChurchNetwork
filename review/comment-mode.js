// Comment mode: turns the page into a review workspace where anyone can leave comments, voice memos, arrows
// and highlights. hero.html loads this module only when someone clicks Comment or opens a ?comment link.
import { captureOwnerKey, getOwnerKey } from './identity.js';
import { createWorkspace } from './workspace.js';

let state = null;

export const isOpen = () => !!state;

async function makeStore() {
  if (window.__reviewStoreFactory === 'fake') {
    window.__reviewFake ??= (await import('./fake-store.js')).createFakeStore();
    return window.__reviewFake;
  }
  const [{ createConvexStore }, { CONVEX_URL }] = await Promise.all([import('./store.js'), import('./config.js')]);
  return createConvexStore(CONVEX_URL);
}

// The page lays itself out again for the narrower column (headline width, canvas size)
const relayout = () => window.dispatchEvent(new Event('resize'));

export async function enter({ page = 'home' } = {}) {
  if (state) return;
  captureOwnerKey();
  const s = state = { page, store: null, unsubscribe: null, marks: [] };

  s.workspace = createWorkspace({
    onExit: () => exit(),
    onShare: share,
  });
  document.body.appendChild(s.workspace.el);
  document.documentElement.classList.add('review-open');
  document.dispatchEvent(new CustomEvent('review:enter'));
  relayout();

  s.onKey = e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (s.workspace.getTool() !== 'browse') s.workspace.setTool('browse');
    else exit();
  };
  document.addEventListener('keydown', s.onKey);

  try {
    s.store = await makeStore();
    if (state !== s) { if (s.store !== window.__reviewFake) s.store.close(); return; }
    s.unsubscribe = s.store.subscribe(page, marks => {
      s.marks = marks;
      s.workspace.sidebar.setMarks(marks);
    }, () => s.workspace.setStatus("Can't reach the comments right now. Check your connection."));
    s.workspace.setOwner(await s.store.isOwner(getOwnerKey()));
  } catch {
    if (state === s) s.workspace.setStatus("Can't reach the comments right now. Check your connection.");
  }
}

// Leaves comment mode. Resolves false when the reviewer chooses to keep an unsent draft.
export async function exit() {
  const s = state;
  if (!s) return true;
  if (!(await s.workspace.confirmDiscard())) return false;
  state = null;
  document.removeEventListener('keydown', s.onKey);
  s.unsubscribe?.();
  if (s.store && s.store !== window.__reviewFake) s.store.close();
  s.workspace.destroy();
  document.documentElement.classList.remove('review-open');
  document.dispatchEvent(new CustomEvent('review:exit'));
  relayout();
  return true;
}

async function share() {
  const url = location.origin + location.pathname + '?comment';
  try {
    await navigator.clipboard.writeText(url);
    state?.workspace.setStatus('Link copied', 2400);
  } catch {
    state?.workspace.setStatus(url, 6000);
  }
}

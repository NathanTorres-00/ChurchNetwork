// Comment mode: turns the page into a review workspace where anyone can leave comments, voice memos, arrows
// and highlights. hero.html loads this module only when someone clicks Comment or opens a ?comment link.
import { captureOwnerKey, getDeviceId, getName, getOwnerKey, setName } from './identity.js';
import { createMarksLayer } from './marks-layer.js';
import { createPlacing } from './placing.js';
import { createWorkspace } from './workspace.js';

let state = null;

export const isOpen = () => !!state;

const MESSAGES = {
  NETWORK: "Couldn't post. Check your connection and try again.",
  RATE_LIMIT: "That's a lot at once. Wait a minute, then post again.",
  INVALID: "Couldn't post this. Check it and try again.",
  NOT_OWNER: "You can't change that one.",
  NOT_FOUND: 'That was already removed.',
};
const message = e => MESSAGES[e?.code] ?? MESSAGES.NETWORK;

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

function scrollToY(y) {
  const top = Math.max(0, y - innerHeight / 2);
  if (window.__lenis) window.__lenis.scrollTo(top, { duration: 0.9 });
  else window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export async function enter({ page = 'home' } = {}) {
  if (state) return;
  captureOwnerKey();
  const s = state = {
    page, store: null, unsubscribe: null, marks: [], draft: null,
    selectedId: null, showResolved: false, isOwner: false, deviceId: getDeviceId(),
  };
  s.ready = new Promise(resolve => { s.markReady = resolve; });     // settles once the store connects (or fails to)

  // Marks shown on the page: open ones, plus resolved ones when the reviewer asks to see them
  const update = () => {
    const visible = s.marks.filter(m => s.showResolved || !m.resolved);
    const missing = s.layer.render(visible, { selectedId: s.selectedId, draft: s.draft });
    s.workspace.sidebar.setMarks(s.marks, { showResolved: s.showResolved, selectedId: s.selectedId, missing, deviceId: s.deviceId });
  };
  s.update = update;

  const select = (id, { scroll = false } = {}) => {
    s.selectedId = id;
    update();
    if (scroll) {
      const p = s.layer.positionOf(id);
      if (p) scrollToY(p.y);
    } else s.workspace.sidebar.scrollToCard(id);
  };

  const run = async (fn) => {
    try { await fn(); } catch (e) { s.workspace.setStatus(message(e), 4000); }
  };

  s.workspace = createWorkspace({
    onExit: () => exit(),
    onShare: share,
    beforeToolChange: async () => closeDraft(s),
    onSelectCard: id => select(id, { scroll: true }),
    onResolve: (id, resolved) => run(() => s.store.setResolved(id, resolved, getOwnerKey())),
    onDelete: id => run(async () => {
      await s.store.remove(id, { ownerKey: s.isOwner ? getOwnerKey() : undefined, deviceId: s.deviceId });
      if (s.selectedId === id) s.selectedId = null;
    }),
    onShowResolved: on => { s.showResolved = on; update(); },
  });
  document.body.appendChild(s.workspace.el);
  s.layer = createMarksLayer();
  s.layer.onSelect(id => select(id));
  s.placing = createPlacing({ getTool: () => s.workspace.getTool(), onDraft: d => startDraft(s, d) });

  document.documentElement.classList.add('review-open');
  document.dispatchEvent(new CustomEvent('review:enter'));
  relayout();
  update();

  s.onKey = async e => {
    if (e.key !== 'Escape' || e.defaultPrevented || s.workspace.hasDialog()) return;
    if (s.workspace.getComposer()) { await closeDraft(s); return; }
    if (s.workspace.getTool() !== 'browse') s.workspace.setTool('browse');
    else exit();
  };
  document.addEventListener('keydown', s.onKey);

  try {
    s.store = await makeStore();
    if (state !== s) { if (s.store !== window.__reviewFake) s.store.close(); return; }
    s.unsubscribe = s.store.subscribe(page, marks => { s.marks = marks; update(); },
      () => s.workspace.setStatus("Can't reach the comments right now. Check your connection."));
    s.isOwner = await s.store.isOwner(getOwnerKey());
    s.workspace.setOwner(s.isOwner);
  } catch {
    if (state === s) s.workspace.setStatus("Can't reach the comments right now. Check your connection.");
  } finally {
    s.markReady();
  }
}

// A click or drag on the page with a tool: show the draft mark and open the composer for it.
// Clicking somewhere else while the composer is open moves the draft and keeps what was typed.
function startDraft(s, draft) {
  const moving = s.draft && s.workspace.getComposer()?.kind === draft.kind;
  s.draft = { ...draft, _id: null };
  s.update();
  if (moving) return;
  const composer = s.workspace.openComposer({
    kind: draft.kind,
    name: getName(),
    onSubmit: ({ text, name }) => post(s, { text, name }),
  });
  composer.onClose = () => { s.draft = null; s.update(); };
}

async function post(s, { text, name }) {
  await s.ready;
  if (!s.store) throw new Error(MESSAGES.NETWORK);
  const d = s.draft;
  setName(name);
  const input = { page: s.page, kind: d.kind, author: name, deviceId: s.deviceId };
  if (d.at) input.at = d.at; else { input.from = d.from; input.to = d.to; }
  if (text) input.text = text;
  try {
    await s.store.create(input);
  } catch (e) {
    throw new Error(message(e));
  }
  s.draft = null;
  s.workspace.closeComposer();
  s.update();
  s.workspace.setStatus('Posted', 2000);
}

// Closes the open draft, asking first if something was typed. Resolves false if the reviewer keeps it.
async function closeDraft(s) {
  const composer = s.workspace.getComposer();
  if (!composer) return true;
  return composer.requestClose();
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
  s.placing.destroy();
  s.layer.destroy();
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

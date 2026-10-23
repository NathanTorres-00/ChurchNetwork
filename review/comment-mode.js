// Comment mode: turns the page into a review workspace where anyone can leave comments, voice memos, arrows
// and drawings. hero.html loads this module only when someone clicks Comment or opens a ?comment link.
import { MAX_POINTS, MAX_STROKES } from '../convex/limits.js';
import { captureOwnerKey, getDeviceId, getName, getOwnerKey, setName } from './identity.js';
import { createMarker } from './marker.js';
import { createMarksLayer } from './marks-layer.js';
import { createPlacing } from './placing.js';
import { anchorStroke } from './stroke-anchor.js';
import { glideIn, glideOut } from './transition.js';
import { createPlayer, createRecorderWidget } from './voice.js';
import { createWorkspace, h } from './workspace.js';

let state = null;

export const isOpen = () => !!state;

const MESSAGES = {
  NETWORK: "Couldn't post. Check your connection and try again.",
  RATE_LIMIT: "That's a lot at once. Wait a minute, then post again.",
  INVALID: "Couldn't post this. Check it and try again.",
  NOT_OWNER: "You can't change that one.",
  NOT_FOUND: 'That was already removed.',
  TIMEOUT: "Not posted yet: you seem to be offline. Check your connection, then try again.",
};
const message = e => MESSAGES[e?.code] ?? MESSAGES.NETWORK;
const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);

async function makeStore() {
  if (window.__reviewStoreFactory === 'fake') {
    if (window.__reviewFakeFailConnect > 0) { window.__reviewFakeFailConnect--; throw new Error('NETWORK'); }   // tests: a failed first connection
    if (window.__reviewFakeConnectGate) await window.__reviewFakeConnectGate;   // tests: a connection held back
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

// Entering and leaving run one at a time: a second click mid-glide lets the first finish, then reverses it.
// `wanted` records what the last click asked for the moment it happens, so quick clicks toggle correctly.
let queue = Promise.resolve();
let wanted = false;
const inTurn = fn => (queue = queue.then(fn, fn));
export const enter = opts => { wanted = true; return inTurn(() => open(opts)); };
export const exit = () => { wanted = false; return inTurn(async () => { const left = await close(); if (!left) wanted = true; return left; }); };
export const toggle = () => (wanted ? exit() : enter());

async function open({ page = 'home' } = {}) {
  if (state) return;
  captureOwnerKey();
  const s = state = {
    page, store: null, unsubscribe: null, marks: [], draft: null,
    selectedId: null, showResolved: false, isOwner: false, deviceId: getDeviceId(),
  };
  s.ready = new Promise(resolve => { s.markReady = resolve; });     // settles once the store connects (or fails to)

  // Voice memo players, kept per mark so a memo keeps playing when other marks arrive
  s.players = new Map();
  const playerFor = m => {
    if (m.kind !== 'voice') return null;
    if (!m.audioUrl) return h('p', { class: 'rv-sub', text: 'Audio unavailable.' });
    if (!s.players.has(m._id)) s.players.set(m._id, createPlayer(m.audioUrl, m.audio.durationMs));
    return s.players.get(m._id).el;
  };

  // Marks shown on the page: open ones, plus resolved ones when the reviewer asks to see them
  const update = () => {
    if (!s.layer) return;                // marks that arrive mid-glide are drawn once the page lands
    for (const [id, p] of s.players) if (!s.marks.some(m => m._id === id)) { p.destroy(); s.players.delete(id); }
    const visible = s.marks.filter(m => s.showResolved || !m.resolved);
    const missing = s.layer.render(visible, { selectedId: s.selectedId, draft: s.draft });
    s.workspace.sidebar.setMarks(s.marks, { showResolved: s.showResolved, selectedId: s.selectedId, missing, shifted: s.layer.shifted(), deviceId: s.deviceId });
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
  s.workspace.setCardExtras(playerFor);

  // Esc works from the first moment; leaving mid-glide waits its turn like a click does. Cmd/Ctrl+Z takes back
  // the last stroke of a drawing, unless it's meant for the text being typed.
  s.onKey = async e => {
    if (e.defaultPrevented || s.workspace.hasDialog()) return;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z' &&
      s.draft?.kind === 'drawing' && !(e.target instanceof Element && e.target.closest('input, textarea'))) {
      e.preventDefault();
      undoStroke(s);
      return;
    }
    if (e.key !== 'Escape') return;
    if (s.workspace.getComposer()) { await closeDraft(s); return; }
    if (s.workspace.getTool() !== 'browse') s.workspace.setTool('browse');
    else exit();
  };
  document.addEventListener('keydown', s.onKey);

  // Connect while the page glides into place
  const connecting = connect(s).then(() => s.markReady());

  await glideIn(s.workspace.el, () => {
    document.body.appendChild(s.workspace.el);
    s.layer = createMarksLayer();
    s.layer.onSelect(id => select(id));
    s.placing = createPlacing({ getTool: () => s.workspace.getTool(), onDraft: d => startDraft(s, d) });
    s.marker = createMarker({
      getTool: () => s.workspace.getTool(),
      getInk: () => s.workspace.getInk(),
      // the stroke joins the draft drawing before the live one goes, in the same frame, so it doesn't flicker
      onStroke: stroke => { try { addStroke(s, stroke); } finally { s.marker.clearLive(); } },
    });
    document.documentElement.classList.add('review-open');
    document.dispatchEvent(new CustomEvent('review:enter'));
    relayout();
    update();
  });
  await connecting;
}

const UNREACHABLE = "Can't reach the comments right now. Check your connection.";

// Connects to the store and follows the page's marks. Safe to call again after a failure.
async function connect(s) {
  if (s.store) return true;
  let store;
  try {
    store = await makeStore();
  } catch {
    if (state === s) s.workspace.setStatus(UNREACHABLE);
    return false;
  }
  if (state !== s) { if (store !== window.__reviewFake) store.close(); return false; }
  s.store = store;
  s.workspace.clearStatus(UNREACHABLE);        // only its own message; a newer one ("Link copied") stays
  s.unsubscribe = store.subscribe({ page: s.page, deviceId: s.deviceId }, marks => { s.marks = marks; s.update(); },
    () => s.workspace.setStatus(UNREACHABLE));
  try {
    s.isOwner = await store.isOwner(getOwnerKey());
    s.workspace.setOwner(s.isOwner);
  } catch { /* owner tools stay off */ }
  return true;
}

// A click or drag on the page with a tool: show the draft mark and open the composer for it.
// Clicking somewhere else while the composer is open moves the draft and keeps what was typed.
function startDraft(s, draft) {
  const moving = s.draft && s.workspace.getComposer()?.kind === draft.kind;
  // the draft keeps one clientId for its whole life, so retrying its post can't make a second mark
  s.draft = { ...draft, _id: null, clientId: moving ? s.draft.clientId : newId() };
  s.update();
  if (moving) return;

  s.voice?.destroy();
  s.voice = draft.kind === 'voice'
    ? createRecorderWidget({ maxMs: window.__reviewMaxVoiceMs ?? 180000, onTypeInstead: () => typeInstead(s) })
    : null;
  const composer = s.workspace.openComposer({
    kind: draft.kind,
    name: getName(),
    extra: s.voice?.el,
    onSubmit: ({ text, name }) => post(s, { text, name }),
  });
  if (s.voice) composer.hasExtra = () => s.voice.hasContent();
  composer.onClose = () => { s.voice?.destroy(); s.voice = null; s.draft = null; s.update(); };
}

// A stroke drawn with the Marker joins the draft drawing; the first one starts the drawing and opens the composer,
// and the reviewer can keep drawing while it's open. A stroke that would make the drawing too big is dropped.
const FULL = 'That drawing is full. Post it and start another.';
const POSTING = "Posting… draw again once it's posted.";
// Says why a stroke was dropped: in the tool bar's status line, and in the composer, since a phone has no room
// for the status line
function turnAway(s, message) {
  s.workspace.setStatus(message, 4000);
  s.workspace.getComposer()?.showError(message);
}
function addStroke(s, { ink, points, pressures }) {
  if (s.posting && s.posting === s.draft) { turnAway(s, POSTING); return; }   // it would be lost with the post
  const strokes = s.draft?.kind === 'drawing' ? s.draft.strokes : [];
  if (strokes.length + 1 > MAX_STROKES) { turnAway(s, FULL); return; }
  const stroke = anchorStroke(points, ink, pressures);
  const total = strokes.reduce((n, st) => n + st.pts.length / 2, stroke.pts.length / 2);
  if (total > MAX_POINTS) { turnAway(s, FULL); return; }
  if (s.draft?.kind !== 'drawing') openDrawing(s);
  s.draft = { ...s.draft, strokes: [...s.draft.strokes, stroke] };
  s.undoButton.disabled = false;
  s.update();
}

// Takes back the last stroke. The composer stays open, so the reviewer can draw again.
function undoStroke(s) {
  if (s.draft?.kind !== 'drawing' || !s.draft.strokes.length) return;
  s.draft = { ...s.draft, strokes: s.draft.strokes.slice(0, -1) };
  s.undoButton.disabled = !s.draft.strokes.length;
  s.update();
}

function openDrawing(s) {
  s.draft = { kind: 'drawing', strokes: [], clientId: newId() };
  s.undoButton = h('button', { type: 'button', class: 'rv-cancel rv-undo', text: 'Undo', disabled: true, onclick: () => undoStroke(s) });
  const composer = s.workspace.openComposer({
    kind: 'drawing',
    name: getName(),
    extra: s.undoButton,
    compact: matchMedia('(max-width: 1279px)').matches,       // below 1280px, in the drawing bar: the page stays in view
    onSubmit: ({ text, name }) => post(s, { text, name }),
  });
  composer.hasExtra = () => s.draft?.kind === 'drawing' && s.draft.strokes.length > 0;
  composer.onClose = () => { s.draft = null; s.update(); };
}

// The mic can't be used: keep the pin where it is and switch to a typed comment
function typeInstead(s) {
  const at = s.draft?.at;
  s.voice?.destroy(); s.voice = null;
  s.workspace.closeComposer();
  s.draft = null;
  s.workspace.setTool('comment');
  if (at) startDraft(s, { kind: 'comment', at });
}

async function post(s, { text, name }) {
  // What this post belongs to; if the reviewer moves on before it finishes, it must leave their new work alone
  const d = s.draft, voice = s.voice, composer = s.workspace.getComposer();
  const memo = d.kind === 'voice' ? voice?.getResult() : null;
  if (d.kind === 'voice' && voice?.isRecording()) throw new Error('Stop recording first, then post it.');
  if (d.kind === 'voice' && !memo) throw new Error('Record a memo first, then post it.');
  if (d.kind === 'drawing' && !d.strokes.length) throw new Error('Draw something first, then post it.');
  if (d.kind === 'drawing') s.posting = d;           // no more strokes join it until the post is done
  try {
    await s.ready;
    if (!s.store && !(await connect(s))) throw new Error(MESSAGES.NETWORK);
    setName(name);
    const input = { page: s.page, kind: d.kind, author: name, deviceId: s.deviceId, clientId: d.clientId };
    if (d.kind === 'drawing') input.strokes = d.strokes;
    else if (d.at) input.at = d.at;
    else { input.from = d.from; input.to = d.to; }
    if (text) input.text = text;
    try {
      if (memo) {
        if (!voice.getStorageId()) voice.setStorageId(await s.store.uploadAudio(memo.blob, memo.mime, s.deviceId));
        input.audio = { storageId: voice.getStorageId(), mime: memo.mime, durationMs: Math.max(1, memo.durationMs) };
      }
      await s.store.create(input);
    } catch (e) {
      throw new Error(message(e));
    }
  } finally {
    if (s.posting === d) s.posting = null;
  }
  if (state !== s) return;
  s.workspace.setStatus('Posted', 2000);
  if (s.workspace.getComposer() !== composer) return;      // the reviewer has already moved on to something else
  voice?.destroy();
  if (s.voice === voice) s.voice = null;
  s.draft = null;
  s.workspace.closeComposer();
  s.update();
}

// Closes the open draft, asking first if something was typed. Resolves false if the reviewer keeps it.
async function closeDraft(s) {
  const composer = s.workspace.getComposer();
  if (!composer) return true;
  return composer.requestClose();
}

// Leaves comment mode. Resolves false when the reviewer chooses to keep an unsent draft.
async function close() {
  const s = state;
  if (!s) return true;
  if (!(await s.workspace.confirmDiscard())) return false;
  state = null;
  document.removeEventListener('keydown', s.onKey);
  s.unsubscribe?.();
  if (s.store && s.store !== window.__reviewFake) s.store.close();
  s.voice?.destroy();
  for (const p of s.players.values()) p.destroy();
  s.placing.destroy();                                     // nothing gets placed or drawn while the panels leave
  s.marker.destroy();
  document.documentElement.classList.remove('rv-placing');
  await glideOut(s.workspace.el, () => {
    s.layer.destroy();
    s.workspace.destroy();
    document.documentElement.classList.remove('review-open');
    document.dispatchEvent(new CustomEvent('review:exit'));
    relayout();
  });
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

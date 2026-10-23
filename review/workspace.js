// The review workspace: a toolbar along the top, the markup tools down the left, and the "Review activity"
// sidebar on the right with its stats, the thread of cards and the composer (see the Figma frame
// "Church Network — Review Workspace").
import { sketchSvg } from './ink.js';

const svg = paths => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const ICONS = {
  comment: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  voice: svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>'),
  arrow: svg('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
  marker: svg('<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86Z"/>'),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
};

export const TOOLS = [
  { id: 'comment', label: 'Comment', hint: 'Click the page to pin a comment.' },
  { id: 'voice', label: 'Voice memo', hint: 'Click the page, then record what you want to say.' },
  { id: 'arrow', label: 'Arrow', hint: 'Drag from where the arrow starts to what it points at.' },
  { id: 'marker', label: 'Marker', hint: 'Draw on the page. Circle or underline what you mean.' },
];
const INKS = [{ id: 'pen', label: 'Pen' }, { id: 'highlighter', label: 'Highlighter' }];

// Box highlights came before the marker; they still show, and count as drawings
export const KIND_LABEL = { comment: 'Comment', voice: 'Voice memo', arrow: 'Arrow', highlight: 'Highlight', drawing: 'Drawing' };
const STATS = [['Comments', ['comment']], ['Voice memos', ['voice']], ['Arrows', ['arrow']], ['Drawings', ['drawing', 'highlight']]];
const COMPOSER = {
  comment: { title: 'Add a comment', field: 'Comment', post: 'Post comment', required: true },
  arrow: { title: 'Add an arrow', field: 'Note (optional)', post: 'Post arrow' },
  drawing: { title: 'Add a drawing', field: 'Note (optional)', post: 'Post drawing', discard: 'Discard this drawing?' },
  voice: { title: 'Record a voice memo', field: 'Title (optional)', post: 'Post voice memo', cancel: 'Discard', discard: 'Discard this voice memo?' },
};

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c != null && c !== false) el.append(c);
  return el;
}

// The marker's ink, remembered on this device
const INK_KEY = 'rv-ink';
function readInk() {
  try { return localStorage.getItem(INK_KEY) === 'highlighter' ? 'highlighter' : 'pen'; } catch { return 'pen'; }
}

export function ago(ts, now = Date.now()) {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function createWorkspace({
  onExit, onShare, beforeToolChange, onToolChange, onSelectCard, onResolve, onDelete, onShowResolved,
} = {}) {
  let tool = 'comment';
  let statusTimer = 0;
  let isOwner = false;
  let composer = null;           // the open composer, if any
  let dialog = null;             // the open confirm dialog, if any
  let pendingDelete = null;      // id whose Delete was pressed once
  let ink = readInk();
  let view = { marks: [], showResolved: false, selectedId: null, missing: new Set(), shifted: new Set() };

  // Toolbar
  const status = h('span', { class: 'rv-status', role: 'status', 'aria-live': 'polite' });
  const toolbar = h('header', { class: 'rv-toolbar', 'data-review-ui': true }, [
    h('div', { class: 'rv-toolbar-start' }, [
      h('button', { class: 'rv-mode', type: 'button', 'aria-label': 'Leave comment mode', title: 'Leave comment mode', onclick: () => onExit?.() }, [
        h('span', { class: 'rv-mode-dot', 'aria-hidden': 'true' }),
        h('span', { text: 'Comment mode' }),
        h('span', { class: 'rv-mode-x', html: ICONS.close }),
      ]),
      h('p', { class: 'rv-reviewing', text: 'Reviewing Church Network — Home' }),
    ]),
    h('div', { class: 'rv-toolbar-end' }, [
      status,
      h('button', { class: 'rv-share', type: 'button', onclick: () => onShare?.() }, [h('span', { html: ICONS.link }), h('span', { text: 'Share review' })]),
    ]),
  ]);

  // The ink switch: Pen or Highlighter. Every copy of it shows the same choice.
  const inkButtons = [];
  function inkSwitch() {
    return h('div', { class: 'rv-inks', role: 'group', 'aria-label': 'Ink' }, INKS.map(i => {
      const b = h('button', {
        class: 'rv-ink', type: 'button', 'aria-pressed': String(i.id === ink), 'data-ink': i.id, onclick: () => setInk(i.id),
      }, [h('span', { class: `rv-ink-swatch rv-ink-swatch-${i.id}`, 'aria-hidden': 'true' }), h('span', { text: i.label })]);
      inkButtons.push(b);
      return b;
    }));
  }
  function setInk(next) {
    if (!INKS.some(i => i.id === next)) return;
    ink = next;
    for (const b of inkButtons) b.setAttribute('aria-pressed', String(b.dataset.ink === ink));
    try { localStorage.setItem(INK_KEY, ink); } catch { /* remembered for this visit only */ }
  }

  // Tool rail. With the Marker picked, the ink switch shows beside it (on wide screens).
  const toolButtons = new Map();
  const rail = h('nav', { class: 'rv-rail', 'aria-label': 'Markup tools', 'data-review-ui': true },
    TOOLS.map(t => {
      const b = h('button', {
        class: 'rv-tool', type: 'button', 'aria-label': t.label, title: `${t.label}: ${t.hint}`, 'aria-pressed': 'false', 'data-tool': t.id,
        html: ICONS[t.id], onclick: () => requestTool(tool === t.id ? 'browse' : t.id),
      });
      toolButtons.set(t.id, b);
      return t.id === 'marker' ? h('div', { class: 'rv-tool-slot' }, [b, inkSwitch()]) : b;
    }));

  // Sidebar
  const hint = h('p', { class: 'rv-sub' });
  const stats = h('dl', { class: 'rv-stats' });
  const cards = h('ol', { class: 'rv-cards' });
  const empty = h('p', { class: 'rv-empty' });
  const showResolvedBox = h('input', { type: 'checkbox', onchange: e => onShowResolved?.(e.target.checked) });
  const showResolvedText = h('span', { text: 'Show resolved' });
  const composerSlot = h('div', { class: 'rv-composer-slot' });
  const sidebar = h('aside', { class: 'rv-sidebar', 'aria-label': 'Review activity', 'data-review-ui': true, 'data-lenis-prevent': true }, [
    h('div', { class: 'rv-sidebar-head' }, [h('h2', { text: 'Review activity' }), hint]),
    stats,
    composerSlot,
    h('section', { class: 'rv-thread', 'aria-label': 'Thread' }, [
      h('div', { class: 'rv-thread-head' }, [h('h3', { text: 'Thread' }), h('label', { class: 'rv-show-resolved' }, [showResolvedBox, showResolvedText])]),
      empty, cards,
    ]),
  ]);
  const tab = h('button', {
    class: 'rv-sidebar-tab', type: 'button', 'aria-expanded': 'false', 'data-review-ui': true,
    onclick: () => setSidebarOpen(!el.classList.contains('rv-sidebar-open')),
  }, [h('span', { text: 'Review activity' }), h('span', { class: 'rv-tab-count', text: '0' })]);

  const el = h('div', { class: 'rv-root', 'data-review-ui': true }, [toolbar, rail, sidebar, tab]);

  function setSidebarOpen(open) {
    el.classList.toggle('rv-sidebar-open', open);
    tab.setAttribute('aria-expanded', String(open));
  }

  function setTool(next) {
    tool = next;
    for (const [id, b] of toolButtons) b.setAttribute('aria-pressed', String(id === tool));
    el.dataset.tool = tool;
    document.documentElement.classList.toggle('rv-placing', tool !== 'browse');
    document.documentElement.dataset.rvTool = tool;     // drag tools stop one-finger scrolling so a drag can draw
    hint.textContent = TOOLS.find(t => t.id === tool)?.hint ?? 'Browsing. Pick a tool to mark up the page.';
    onToolChange?.(tool);
  }
  async function requestTool(next) {
    if (beforeToolChange && !(await beforeToolChange(next))) return;
    setTool(next);
  }

  // ---------- Cards ----------
  function placeBadge(m) {
    if (view.missing.has(m._id)) return h('span', { class: 'rv-badge', title: "The part of the page this pointed at has changed, so it isn't drawn.", text: 'Moved' });
    if (!view.shifted.has(m._id)) return null;
    const wider = m.strokes?.[0]?.at.vw > innerWidth;
    return h('span', {
      class: 'rv-badge', title: 'What this was drawn around sits differently at this width, so it may not line up.',
      text: `Drawn on a ${wider ? 'wider' : 'narrower'} screen`,
    });
  }

  function card(m) {
    const canDelete = isOwner || m.mine;
    const actions = [];
    if (isOwner) actions.push(h('button', { type: 'button', class: 'rv-link', text: m.resolved ? 'Reopen' : 'Resolve', onclick: () => onResolve?.(m._id, !m.resolved) }));
    if (canDelete) {
      const confirming = pendingDelete === m._id;
      actions.push(h('button', {
        type: 'button', class: `rv-link rv-danger${confirming ? ' rv-confirming' : ''}`, text: confirming ? 'Confirm delete' : 'Delete',
        onclick: () => {
          if (pendingDelete === m._id) { pendingDelete = null; onDelete?.(m._id); return; }
          pendingDelete = m._id;
          render();
          setTimeout(() => { if (pendingDelete === m._id) { pendingDelete = null; render(); } }, 4000);
        },
      }));
    }
    const li = h('li', {
      class: `rv-card${m._id === view.selectedId ? ' rv-card-selected' : ''}${m.resolved ? ' rv-resolved' : ''}`,
      'data-id': m._id, tabindex: '0',
      onclick: e => { if (!e.target.closest('button, audio, input, .rv-player')) onSelectCard?.(m._id); },
      onkeydown: e => { if (e.key === 'Enter' && e.target === li) onSelectCard?.(m._id); },
    }, [
      h('div', { class: 'rv-card-head' }, [h('span', { class: 'rv-author', text: m.author }), h('span', { class: `rv-tag rv-tag-${m.kind}`, text: KIND_LABEL[m.kind] })]),
      m.kind === 'drawing'
        ? h('div', { class: 'rv-card-body' }, [
          h('span', { class: 'rv-sketch', 'aria-hidden': 'true', html: sketchSvg(m.strokes ?? []) }),
          m.text ? h('p', { class: 'rv-card-text', text: m.text }) : null,
        ])
        : m.text ? h('p', { class: 'rv-card-text', text: m.text }) : null,
      cardExtras(m),
      h('div', { class: 'rv-card-foot' }, [
        h('time', { datetime: new Date(m._creationTime).toISOString(), 'data-ts': String(m._creationTime), text: ago(m._creationTime) }),
        placeBadge(m),
        m.resolved ? h('span', { class: 'rv-badge', text: 'Resolved' }) : null,
        actions.length ? h('span', { class: 'rv-actions' }, actions) : null,
      ]),
    ]);
    return li;
  }
  let cardExtras = () => null;          // voice memos add a player (set by comment mode)

  function render() {
    const { marks, showResolved } = view;
    const open = marks.filter(m => !m.resolved);
    const resolvedCount = marks.length - open.length;
    stats.replaceChildren(...STATS.map(([label, kinds]) =>
      h('div', { class: 'rv-stat' }, [h('dt', { text: label }), h('dd', { text: String(open.filter(m => kinds.includes(m.kind)).length) })])));
    tab.querySelector('.rv-tab-count').textContent = String(open.length);
    showResolvedBox.checked = showResolved;
    showResolvedText.textContent = `Show resolved (${resolvedCount})`;
    const shown = showResolved ? marks : open;
    empty.textContent = marks.length ? 'Everything here is resolved.' : 'Nothing here yet. Pick a tool on the left and click the page.';
    empty.hidden = shown.length > 0;
    cards.replaceChildren(...shown.map(card));
  }

  function setMarks(marks, opts = {}) {
    view = { ...view, ...opts, marks, missing: opts.missing ?? view.missing, shifted: opts.shifted ?? view.shifted };
    render();
  }

  // ---------- Composer ----------
  function openComposer({ kind, name, onSubmit, extra = null }) {
    closeComposer();
    const cfg = COMPOSER[kind];
    const error = h('p', { class: 'rv-error', role: 'alert', hidden: true });
    const nameInput = name ? null : h('input', { type: 'text', name: 'name', maxlength: '60', autocomplete: 'name' });
    let nameRow;
    const showNameField = () => {
      const input = h('input', { type: 'text', name: 'name', maxlength: '60', autocomplete: 'name', value: name ?? '' });
      nameRow.replaceWith(nameRow = h('label', { class: 'rv-field' }, [h('span', { text: 'Your name' }), input]));
      input.focus();
    };
    nameRow = nameInput
      ? h('label', { class: 'rv-field' }, [h('span', { text: 'Your name' }), nameInput])
      : h('p', { class: 'rv-posting-as' }, [h('span', { text: `Posting as ${name}` }), h('button', { type: 'button', class: 'rv-link', text: 'Change', onclick: showNameField })]);
    const text = h('textarea', { name: 'text', rows: '4', maxlength: kind === 'voice' ? '120' : '2000', placeholder: kind === 'comment' ? 'Write a comment…' : '' });
    const textRow = h('label', { class: 'rv-field' }, [h('span', { text: cfg.field }), text]);
    const postButton = h('button', { type: 'submit', class: 'rv-post', text: cfg.post });
    const form = h('form', { class: `rv-composer rv-composer-${kind}`, novalidate: true }, [
      h('h3', { text: cfg.title }),
      nameRow,
      extra,
      textRow,
      error,
      h('div', { class: 'rv-composer-actions' }, [
        postButton,
        // Cancel on typed text is a deliberate choice, so it doesn't ask; a recording or strokes are costly to
        // redo, so they do
        h('button', {
          type: 'button', class: 'rv-cancel', text: cfg.cancel ?? 'Cancel',
          onclick: async () => {
            if (api.hasExtra?.() && !(await api.askToDiscard())) return;
            closeComposer();
            api.onClose?.();
          },
        }),
      ]),
    ]);
    const showError = msg => { error.textContent = msg; error.hidden = !msg; };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nameField = form.querySelector('input[name="name"]');
      const author = (nameField ? nameField.value : name ?? '').trim();
      const body = text.value.trim();
      if (!author) return showError('Add your name so everyone knows who this is from.'), nameField?.focus();
      if (cfg.required && !body) return showError('Write a comment first.'), text.focus();
      showError('');
      postButton.disabled = true;
      try {
        await onSubmit({ text: body, name: author });
      } catch (err) {
        showError(err?.message || "Couldn't post. Try again.");
      } finally {
        postButton.disabled = false;
      }
    });
    composerSlot.replaceChildren(form);
    setSidebarOpen(true);
    const api = composer = {
      el: form,
      kind,
      hasText: () => !!text.value.trim() || !!api.hasExtra?.(),
      hasExtra: null,
      showError,
      setPostEnabled: on => { postButton.disabled = !on; },
      // Asks before throwing the draft away, titled for what's being discarded where there's a title for it
      askToDiscard: () => confirm(cfg.discard ? { title: cfg.discard, body: "It hasn't been posted yet." } : undefined),
      async requestClose() {
        if (api.hasText() && !(await api.askToDiscard())) return false;
        closeComposer();
        api.onClose?.();
        return true;
      },
      onClose: null,
    };
    (nameInput ?? text).focus({ preventScroll: true });
    return api;
  }
  function closeComposer() {
    if (!composer) return;
    composer.el.remove();
    composer = null;
  }

  // ---------- Confirm dialog ----------
  function confirm({ title = 'Discard what you started?', body = "Your comment hasn't been posted yet.", ok = 'Discard', cancel = 'Keep editing' } = {}) {
    dialog?.close(false);
    return new Promise(resolve => {
      const keep = h('button', { type: 'button', class: 'rv-cancel', text: cancel });
      const discard = h('button', { type: 'button', class: 'rv-danger-button', text: ok });
      const box = h('div', { class: 'rv-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'rv-dialog-title', 'aria-describedby': 'rv-dialog-body' }, [
        h('h3', { id: 'rv-dialog-title', text: title }),
        h('p', { id: 'rv-dialog-body', text: body }),
        h('div', { class: 'rv-dialog-actions' }, [keep, discard]),
      ]);
      const backdrop = h('div', { class: 'rv-dialog-backdrop', 'data-review-ui': true }, [box]);
      const close = result => {
        backdrop.remove();
        document.removeEventListener('keydown', onKey, true);
        dialog = null;
        resolve(result);
      };
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); } };
      keep.onclick = () => close(false);
      discard.onclick = () => close(true);
      document.addEventListener('keydown', onKey, true);
      el.appendChild(backdrop);
      dialog = { close };
      keep.focus();
    });
  }

  function setStatus(text, ms = 0) {
    clearTimeout(statusTimer);
    status.textContent = text;
    if (ms) statusTimer = setTimeout(() => { status.textContent = ''; }, ms);
  }
  // Clears the status only if it still says this, so it doesn't wipe a newer message
  function clearStatus(text) {
    if (status.textContent === text) setStatus('');
  }

  // Keep "2 min ago" current
  const clock = setInterval(() => {
    for (const t of cards.querySelectorAll('time[data-ts]')) t.textContent = ago(+t.dataset.ts);
  }, 30000);

  setTool(tool);
  render();

  return {
    el,
    setTool,
    getTool: () => tool,
    getInk: () => ink,
    setInk,
    setOwner(owner) { isOwner = !!owner; el.classList.toggle('rv-owner', isOwner); render(); },
    setStatus,
    clearStatus,
    setSidebarOpen,
    openComposer,
    closeComposer,
    getComposer: () => composer,
    confirm,
    hasDialog: () => !!dialog,
    setCardExtras(fn) { cardExtras = fn; render(); },
    // Asks before throwing away an unsent draft; resolves true when it's fine to go on
    async confirmDiscard() {
      if (composer?.hasText() && !(await composer.askToDiscard())) return false;
      return true;
    },
    sidebar: {
      el: sidebar,
      setMarks,
      scrollToCard(id) { cards.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
    },
    destroy() {
      clearTimeout(statusTimer);
      clearInterval(clock);
      dialog?.close(false);
      document.documentElement.classList.remove('rv-placing');
      delete document.documentElement.dataset.rvTool;
      el.remove();
    },
  };
}

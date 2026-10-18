// The review workspace: a toolbar along the top, the markup tools down the left, and the "Review activity"
// sidebar on the right with its stats, the thread of cards and the composer (see the Figma frame
// "Church Network — Review Workspace").

const svg = paths => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const ICONS = {
  comment: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  voice: svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>'),
  arrow: svg('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
  highlight: svg('<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>'),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
};

export const TOOLS = [
  { id: 'comment', label: 'Comment', hint: 'Click the page to pin a comment.' },
  { id: 'voice', label: 'Voice memo', hint: 'Click the page, then record what you want to say.' },
  { id: 'arrow', label: 'Arrow', hint: 'Drag from where the arrow starts to what it points at.' },
  { id: 'highlight', label: 'Highlight', hint: 'Drag across the area you want to highlight.' },
];

export const KIND_LABEL = { comment: 'Comment', voice: 'Voice memo', arrow: 'Arrow', highlight: 'Highlight' };
const STAT_LABEL = { comment: 'Comments', voice: 'Voice memos', arrow: 'Arrows', highlight: 'Highlights' };
const COMPOSER = {
  comment: { title: 'Add a comment', field: 'Comment', post: 'Post comment', required: true },
  arrow: { title: 'Add an arrow', field: 'Note (optional)', post: 'Post arrow' },
  highlight: { title: 'Add a highlight', field: 'Note (optional)', post: 'Post highlight' },
  voice: { title: 'Record a voice memo', field: 'Title (optional)', post: 'Post voice memo', cancel: 'Discard' },
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
  let view = { marks: [], showResolved: false, selectedId: null, missing: new Set(), deviceId: null };

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

  // Tool rail
  const toolButtons = new Map();
  const rail = h('nav', { class: 'rv-rail', 'aria-label': 'Markup tools', 'data-review-ui': true },
    TOOLS.map(t => {
      const b = h('button', {
        class: 'rv-tool', type: 'button', 'aria-label': t.label, title: `${t.label}: ${t.hint}`, 'aria-pressed': 'false', 'data-tool': t.id,
        html: ICONS[t.id], onclick: () => requestTool(tool === t.id ? 'browse' : t.id),
      });
      toolButtons.set(t.id, b);
      return b;
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
    hint.textContent = TOOLS.find(t => t.id === tool)?.hint ?? 'Browsing. Pick a tool to mark up the page.';
    onToolChange?.(tool);
  }
  async function requestTool(next) {
    if (beforeToolChange && !(await beforeToolChange(next))) return;
    setTool(next);
  }

  // ---------- Cards ----------
  function card(m) {
    const canDelete = isOwner || (view.deviceId && m.deviceId === view.deviceId);
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
      m.text ? h('p', { class: 'rv-card-text', text: m.text }) : null,
      cardExtras(m),
      h('div', { class: 'rv-card-foot' }, [
        h('time', { datetime: new Date(m._creationTime).toISOString(), 'data-ts': String(m._creationTime), text: ago(m._creationTime) }),
        view.missing.has(m._id) ? h('span', { class: 'rv-badge', title: "The part of the page this pointed at has changed, so it isn't drawn.", text: 'Moved' }) : null,
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
    stats.replaceChildren(...Object.entries(STAT_LABEL).map(([kind, label]) =>
      h('div', { class: 'rv-stat' }, [h('dt', { text: label }), h('dd', { text: String(open.filter(m => m.kind === kind).length) })])));
    tab.querySelector('.rv-tab-count').textContent = String(open.length);
    showResolvedBox.checked = showResolved;
    showResolvedText.textContent = `Show resolved (${resolvedCount})`;
    const shown = showResolved ? marks : open;
    empty.textContent = marks.length ? 'Everything here is resolved.' : 'Nothing here yet. Pick a tool on the left and click the page.';
    empty.hidden = shown.length > 0;
    cards.replaceChildren(...shown.map(card));
  }

  function setMarks(marks, opts = {}) {
    view = { ...view, ...opts, marks, missing: opts.missing ?? view.missing };
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
        // pressing Cancel/Discard is a deliberate choice, so it doesn't ask again
        h('button', { type: 'button', class: 'rv-cancel', text: cfg.cancel ?? 'Cancel', onclick: () => { closeComposer(); api.onClose?.(); } }),
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
      async requestClose() {
        if (api.hasText() && !(await confirm())) return false;
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
    setOwner(owner) { isOwner = !!owner; el.classList.toggle('rv-owner', isOwner); render(); },
    setStatus,
    setSidebarOpen,
    openComposer,
    closeComposer,
    getComposer: () => composer,
    confirm,
    hasDialog: () => !!dialog,
    setCardExtras(fn) { cardExtras = fn; render(); },
    // Asks before throwing away an unsent draft; resolves true when it's fine to go on
    async confirmDiscard() {
      if (composer?.hasText() && !(await confirm())) return false;
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
      el.remove();
    },
  };
}

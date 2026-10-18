// The review workspace: a toolbar along the top, the markup tools down the left, and the "Review activity"
// sidebar on the right (see the Figma frame "Church Network — Review Workspace").

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

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c != null) el.append(c);
  return el;
}

export function createWorkspace({ onExit, onShare, onToolChange } = {}) {
  let tool = 'comment';
  let statusTimer = 0;
  const selectHandlers = [];

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
        html: ICONS[t.id], onclick: () => setTool(tool === t.id ? 'browse' : t.id),
      });
      toolButtons.set(t.id, b);
      return b;
    }));

  // Sidebar
  const hint = h('p', { class: 'rv-sub' });
  const stats = h('dl', { class: 'rv-stats' });
  const cards = h('ol', { class: 'rv-cards' });
  const empty = h('p', { class: 'rv-empty', text: 'Nothing here yet. Pick a tool on the left and click the page.' });
  const composer = h('div', { class: 'rv-composer-slot' });
  const sidebar = h('aside', { class: 'rv-sidebar', 'aria-label': 'Review activity', 'data-review-ui': true, 'data-lenis-prevent': true }, [
    h('div', { class: 'rv-sidebar-head' }, [h('h2', { text: 'Review activity' }), hint]),
    stats,
    h('section', { class: 'rv-thread', 'aria-label': 'Thread' }, [h('h3', { text: 'Thread' }), empty, cards]),
    composer,
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
    hint.textContent = TOOLS.find(t => t.id === tool)?.hint ?? 'Browsing. Pick a tool to mark up the page.';
    onToolChange?.(tool);
  }

  function setMarks(marks, { showResolved = false } = {}) {
    const open = marks.filter(m => !m.resolved);
    stats.replaceChildren(...Object.entries(STAT_LABEL).flatMap(([kind, label]) => [
      h('div', { class: 'rv-stat' }, [h('dt', { text: label }), h('dd', { text: String(open.filter(m => m.kind === kind).length) })]),
    ]));
    tab.querySelector('.rv-tab-count').textContent = String(open.length);
    const shown = showResolved ? marks : open;
    empty.hidden = shown.length > 0;
    cards.replaceChildren(...shown.map(m => h('li', { class: 'rv-card', 'data-id': m._id }, [
      h('p', { class: 'rv-card-text', text: m.text || KIND_LABEL[m.kind] }),
    ])));
  }

  function setStatus(text, ms = 0) {
    clearTimeout(statusTimer);
    status.textContent = text;
    if (ms) statusTimer = setTimeout(() => { status.textContent = ''; }, ms);
  }

  setTool(tool);
  setMarks([]);

  return {
    el,
    setTool,
    getTool: () => tool,
    setOwner(isOwner) { el.classList.toggle('rv-owner', !!isOwner); },
    setStatus,
    setSidebarOpen,
    async confirmDiscard() { return true; },
    sidebar: { el: sidebar, setMarks, onSelect: cb => selectHandlers.push(cb), composer, selectHandlers },
    destroy() { clearTimeout(statusTimer); el.remove(); },
  };
}

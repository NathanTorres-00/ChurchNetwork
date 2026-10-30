// The Versions panel: a pill at the bottom left opens a list of every build of the site (newest first), and
// clicking an earlier build shows it, live, in a frame beside the panel. The list is /versions.json, written by
// scripts/build-static.js. Showing a build dispatches `versions:view` on document; going back dispatches
// `versions:current`, so the hero can hold its globe still while it's covered.

const NOTE_UNAVAILABLE = "Version history isn't available right now";

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
export const formatDate = ms => `${day.format(ms)} · ${time.format(ms)}`;

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export function initVersions({ listUrl = '/versions.json' } = {}) {
  const framed = window.self !== window.top || new URLSearchParams(location.search).get('framed') === 'versions';
  if (framed) return;

  const pill = el('button', 'versions-pill');
  pill.id = 'versions-toggle';
  pill.type = 'button';
  pill.setAttribute('aria-expanded', 'false');
  pill.setAttribute('aria-controls', 'versions-panel');
  pill.append(el('span', 'versions-glyph'), 'Versions');

  const panel = el('aside', 'versions-panel');
  panel.id = 'versions-panel';
  panel.setAttribute('aria-label', 'Versions');
  panel.dataset.lenisPrevent = '';
  const head = el('div', 'versions-head');
  const close = el('button', 'versions-close', 'Close');
  close.type = 'button';
  head.append(el('p', 'versions-title', 'Versions'), close);
  const status = el('p', 'versions-status', 'Loading versions');
  const list = el('ol', 'versions-list');
  panel.append(head, status, list);

  const stage = el('div', 'versions-stage');
  stage.hidden = true;
  const bar = el('div', 'versions-bar');
  const reopen = el('button', 'versions-reopen', 'Versions');
  reopen.type = 'button';
  const label = el('span', 'versions-label');
  const back = el('button', 'versions-back', 'Back to current');
  back.type = 'button';
  bar.append(reopen, label, back);
  const frame = el('iframe', 'versions-frame');
  frame.title = 'Earlier version of the site';
  frame.src = 'about:blank';
  stage.append(bar, frame);

  document.body.append(stage, panel, pill);

  const phone = window.matchMedia('(max-width: 640px)');
  let loaded = null;     // the fetch, started on first open
  let viewing = null;    // the row button showing in the stage

  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    pill.setAttribute('aria-expanded', String(open));
    if (open) {
      loaded ??= load();
      close.focus({ preventScroll: true });
    }
  }

  function showCurrent() {
    if (!viewing) return;
    viewing.classList.remove('is-viewing');
    viewing.querySelector('.versions-tag-viewing')?.remove();
    viewing = null;
    stage.hidden = true;
    frame.src = 'about:blank';
    document.dispatchEvent(new CustomEvent('versions:current'));
  }

  function show(row, version) {
    if (viewing) {
      viewing.classList.remove('is-viewing');
      viewing.querySelector('.versions-tag-viewing')?.remove();
    }
    const wasViewing = viewing !== null;
    viewing = row;
    row.classList.add('is-viewing');
    row.querySelector('.versions-date').append(el('span', 'versions-tag versions-tag-viewing', 'Viewing'));
    label.replaceChildren('Viewing the ', el('b', null, formatDate(version.createdAt)), ' version');
    frame.src = `${version.href}?framed=versions`;
    stage.hidden = false;
    if (phone.matches) setOpen(false);
    if (!wasViewing) document.dispatchEvent(new CustomEvent('versions:view'));
  }

  function render(versions, available) {
    list.replaceChildren();
    if (!available) status.textContent = NOTE_UNAVAILABLE;
    else if (versions.length) {
      const first = versions[versions.length - 1];
      status.textContent = `${versions.length} build${versions.length === 1 ? '' : 's'} since ${day.format(first.createdAt)}`;
    } else status.textContent = NOTE_UNAVAILABLE;
    for (const v of versions) {
      const row = el('button', 'versions-row');
      row.type = 'button';
      const date = el('span', 'versions-date', formatDate(v.createdAt));
      if (v.current) date.append(el('span', 'versions-tag', 'Current'));
      row.append(date, el('span', 'versions-summary', v.summary));
      row.addEventListener('click', () => (v.current ? showCurrent() : show(row, v)));
      const li = el('li');
      li.append(row);
      list.append(li);
    }
  }

  async function load() {
    try {
      const res = await fetch(listUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      // without the build's list (e.g. a local server, which serves the repo's summary notes) there's no history
      if (!Array.isArray(body?.versions)) throw new Error('not a version list');
      render(body.versions, body.available === true);
    } catch {
      render([], false);
    }
  }

  pill.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => { showCurrent(); setOpen(false); pill.focus({ preventScroll: true }); });
  back.addEventListener('click', showCurrent);
  reopen.addEventListener('click', () => setOpen(true));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !panel.classList.contains('is-open')) return;
    showCurrent();
    setOpen(false);
    pill.focus({ preventScroll: true });
  });
}

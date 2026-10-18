// Voice memos: the recorder shown in the composer, and the small player used in the composer and on cards.
import { startRecording } from './recorder.js';
import { h } from './workspace.js';

const icon = path => `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">${path}</svg>`;
const PLAY = icon('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/>');
const PAUSE = icon('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>');

export const clock = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const length = ms => clock(Math.round(ms / 1000) * 1000);

export function createPlayer(src, durationMs) {
  const audio = h('audio', { preload: 'metadata', src });
  const button = h('button', { type: 'button', class: 'rv-play' });
  const bar = h('span', { class: 'rv-progress-bar' });
  const progress = h('span', { class: 'rv-progress', 'aria-hidden': 'true' }, [bar]);
  const duration = h('span', { class: 'rv-duration', text: length(durationMs) });
  const el = h('div', { class: 'rv-player' }, [button, progress, duration, audio]);

  const sync = () => {
    const playing = !audio.paused;
    button.setAttribute('aria-label', playing ? 'Pause voice memo' : 'Play voice memo');
    button.innerHTML = playing ? PAUSE : PLAY;
    el.classList.toggle('rv-playing', playing);
  };
  button.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => { duration.textContent = "Can't play"; });
    else audio.pause();
  });
  progress.addEventListener('click', e => {
    const r = progress.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (durationMs / 1000);
  });
  audio.addEventListener('timeupdate', () => {
    bar.style.width = Math.min(100, (audio.currentTime * 1000 / durationMs) * 100) + '%';
  });
  audio.addEventListener('ended', () => { bar.style.width = '0%'; });
  for (const ev of ['play', 'pause', 'ended']) audio.addEventListener(ev, sync);
  sync();
  return { el, audio, destroy() { audio.pause(); } };
}

// The recorder inside the voice memo composer: Record → Stop → listen back, re-record, or post
export function createRecorderWidget({ maxMs, onTypeInstead }) {
  const el = h('div', { class: 'rv-recorder' });
  let rec = null, result = null, player = null, url = null, reachedLimit = false, recording = false;
  // Each start gets a number; a mic that arrives after the widget is gone or a newer start began is closed
  let generation = 0, pending = false, destroyed = false;
  let storageId = null;               // kept after a successful upload, so retrying a failed post doesn't re-upload

  const clearResult = () => {
    player?.destroy(); player = null;
    if (url) URL.revokeObjectURL(url); url = null;
    result = null; storageId = null; reachedLimit = false;
  };

  function show(...children) { el.replaceChildren(...children); }

  function idle() {
    show(
      h('button', { type: 'button', class: 'rv-record', onclick: start }, [h('span', { class: 'rv-rec-dot', 'aria-hidden': 'true' }), h('span', { text: 'Record' })]),
      h('span', { class: 'rv-sub', text: 'Up to 3 minutes.' }),
    );
  }

  function problem(text, retry) {
    show(h('div', { class: 'rv-problem' }, [
      h('p', { text }),
      h('div', { class: 'rv-problem-actions' }, [
        retry ? h('button', { type: 'button', class: 'rv-cancel', text: 'Try again', onclick: start }) : null,
        h('button', { type: 'button', class: 'rv-cancel', text: 'Type a comment instead', onclick: () => onTypeInstead?.() }),
      ]),
    ]));
  }

  async function start() {
    if (pending || destroyed) return;
    clearResult();
    const gen = ++generation;
    pending = true;
    show(h('div', { class: 'rv-recording' }, [h('span', { class: 'rv-sub', text: 'Waiting for the microphone…' })]));
    const time = h('span', { class: 'rv-rec-time', text: '0:00' });
    let started;
    try {
      started = await startRecording({ maxMs, onTick: ms => { time.textContent = clock(ms); }, onLimit: () => { reachedLimit = true; finish(); } });
    } catch (e) {
      pending = false;
      if (destroyed || gen !== generation) return;
      if (e?.code === 'MIC_DENIED') {
        problem('Your microphone is blocked. Allow it for this site (look for the microphone icon in the address bar), then try again.', true);
      } else {
        problem("This browser can't record audio here.", false);
      }
      return;
    }
    pending = false;
    if (destroyed || gen !== generation) { started.cancel(); return; }     // nobody wants this mic any more
    rec = started;
    recording = true;
    show(h('div', { class: 'rv-recording' }, [
      h('span', { class: 'rv-rec-dot rv-live', 'aria-hidden': 'true' }),
      time,
      h('span', { class: 'rv-sub', text: 'Recording…' }),
      h('button', { type: 'button', class: 'rv-cancel rv-stop', text: 'Stop', onclick: finish }),
    ]));
  }

  async function finish() {
    if (!rec) return;
    const r = rec; rec = null;
    const done = await r.stop();
    recording = false;
    if (destroyed) return;
    if (!done || !done.blob.size) { problem("That recording didn't work. Try again.", true); return; }
    result = done;
    url = URL.createObjectURL(done.blob);
    player = createPlayer(url, done.durationMs);
    show(
      player.el,
      reachedLimit ? h('p', { class: 'rv-sub', text: 'Memos can be up to 3 minutes, so recording stopped there.' }) : null,
      h('button', { type: 'button', class: 'rv-link', text: 'Re-record', onclick: start }),
    );
  }

  idle();
  return {
    el,
    getResult: () => result,
    hasContent: () => pending || recording || !!result,
    isRecording: () => pending || recording,
    getStorageId: () => storageId,
    setStorageId: id => { storageId = id; },
    destroy() { destroyed = true; generation++; rec?.cancel(); rec = null; recording = false; clearResult(); },
  };
}

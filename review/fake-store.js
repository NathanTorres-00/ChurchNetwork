// An in-memory ReviewStore with the same rules as the Convex backend, for browser tests.
// Loaded only when a test sets window.__reviewStoreFactory = 'fake'; production never imports it.
import { RATE_MAX, RATE_WINDOW_MS, validateMark } from '../convex/limits.js';

const OWNER_KEY = 'test-owner';
const fail = code => Object.assign(new Error(code), { code });

export function createFakeStore() {
  const marks = [];
  const audio = new Map();          // storageId → object URL
  const subscribers = new Set();     // { page, onMarks }
  let nextFailure = null, seq = 0, clock = Date.now();

  const view = page => marks
    .filter(m => m.page === page)
    .map(m => (m.audio ? { ...m, audioUrl: audio.get(m.audio.storageId) ?? null } : { ...m }));
  const notify = () => { for (const s of subscribers) s.onMarks(view(s.page)); };
  const takeFailure = () => { const code = nextFailure; nextFailure = null; if (code) throw fail(code); };
  const now = () => Math.max(Date.now(), ++clock);

  return {
    marks,
    failNext(code) { nextFailure = code; },

    subscribe(page, onMarks) {
      const s = { page, onMarks };
      subscribers.add(s);
      onMarks(view(page));
      return () => subscribers.delete(s);
    },

    async create(input) {
      takeFailure();
      const mark = { ...input, author: String(input.author ?? '').trim() };
      if (validateMark(mark)) throw fail('INVALID');
      const since = Date.now() - RATE_WINDOW_MS;
      if (marks.filter(m => m.deviceId === mark.deviceId && m._creationTime > since).length >= RATE_MAX) throw fail('RATE_LIMIT');
      const id = `mark-${++seq}`;
      marks.push({ ...mark, _id: id, _creationTime: now(), resolved: false });
      notify();
      return id;
    },

    async uploadAudio(blob) {
      takeFailure();
      const id = `storage-${++seq}`;
      audio.set(id, URL.createObjectURL(blob));
      return id;
    },

    async setResolved(id, resolved, ownerKey) {
      if (ownerKey !== OWNER_KEY) throw fail('NOT_OWNER');
      const mark = marks.find(m => m._id === id);
      if (!mark) throw fail('NOT_FOUND');
      mark.resolved = resolved;
      notify();
    },

    async remove(id, { ownerKey, deviceId } = {}) {
      const i = marks.findIndex(m => m._id === id);
      if (i < 0) throw fail('NOT_FOUND');
      if (ownerKey !== OWNER_KEY && marks[i].deviceId !== deviceId) throw fail('NOT_OWNER');
      const [mark] = marks.splice(i, 1);
      if (mark.audio) audio.delete(mark.audio.storageId);
      notify();
    },

    async isOwner(ownerKey) { return ownerKey === OWNER_KEY; },

    close() { subscribers.clear(); },
  };
}

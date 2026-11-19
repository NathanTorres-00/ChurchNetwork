// Where threads live: Stacki's project storage, `.stacki/app-data/feedback-pins.json`,
// through `stacki.storage.*` (docs/apps.md, "Storage").
//
// It commits, merges and pulls with the site, so the whole team shares comments
// with no server to run. One key per thread (`pins/<id>`), because the file keeps
// one key per line in sorted order: two people commenting on different things
// merge cleanly in Git instead of colliding. Coding agents write the same file
// (AGENTS.md); every change carries an actor and is appended to the thread's
// activity log, and deleting is soft, so the record survives.
(() => {
  const FP = window.FP;
  const SCOPE = 'project';
  const PREFIX = 'pins/';
  /** At most 32 requests may wait at once; reads go in chunks well under that. */
  const READ_CHUNK = 16;

  const keyFor = (id) => `${PREFIX}${String(id).replace(/[^A-Za-z0-9._-]/g, '')}`;

  const put = async (thread) => {
    const value = JSON.stringify(FP.serialise(thread));
    const outcome = await stacki.storage.set({ key: keyFor(thread.id), value, scope: SCOPE });
    if (outcome && outcome.applied === false) throw new Error(outcome.reason);
    return thread;
  };

  /** One stored value, parsed strictly: `{ thread }`, `{ error }`, or `{}` when the key is empty. */
  const readEntry = async (key) => {
    const answer = await stacki.storage.get({ key, scope: SCOPE });
    if (!answer || typeof answer.value !== 'string') return {};
    let raw;
    try {
      raw = JSON.parse(answer.value);
    } catch {
      return { error: 'not valid JSON' };
    }
    return FP.parseThread(raw);
  };

  const read = async (key) => (await readEntry(key)).thread;

  /** The thread as stored now, so an edit builds on a teammate's (or an agent's) latest change. */
  const current = async (thread) => {
    const entry = await readEntry(keyFor(thread.id));
    // A thread that cannot be read is never rewritten from the app's copy: the original is kept.
    if (entry.error) throw new Error(`This thread could not be read (${entry.error}), so it is left as it is.`);
    return entry.thread || thread;
  };

  const log = (thread, action, actor, extra = {}) => FP.logged(thread, { action, actor, at: FP.now(), ...extra });

  FP.store = {
    bytes: 0,
    /** Entries that could not be read on the last listing: `{ key, reason }`. Never rewritten. */
    invalid: [],

    /** Every readable thread, deleted ones included (the app hides those). */
    async listAll() {
      const answer = await stacki.storage.keys({ scope: SCOPE });
      const keys = (answer && Array.isArray(answer.keys) ? answer.keys : []).filter((key) => key.startsWith(PREFIX)).slice(0, FP.LIMITS.threads);
      const threads = [];
      const invalid = [];
      let bytes = 0;
      for (let index = 0; index < keys.length; index += READ_CHUNK) {
        const chunk = keys.slice(index, index + READ_CHUNK);
        const batch = await Promise.all(chunk.map((key) => readEntry(key).catch((error) => ({ error: String(error && error.message) }))));
        batch.forEach((entry, offset) => {
          if (entry.error) {
            invalid.push({ key: chunk[offset], reason: entry.error });
          } else if (entry.thread) {
            threads.push(entry.thread);
            bytes += JSON.stringify(FP.serialise(entry.thread)).length;
          }
        });
      }
      // Roughly what the app's project storage holds now, so snapshots stop before the 4 MiB bound.
      FP.store.bytes = bytes;
      FP.store.invalid = invalid;
      return threads;
    },

    async has(id) {
      return (await read(keyFor(id))) !== undefined;
    },

    /**
     * A new thread on the open file's element (`nodeId`, `at`), keyed with node.key in that file: a
     * page's node, or a component's own node inside it. A keyed element reads back as a one-step ref.
     */
    async create({ flat, page, nodeId, at, spot, comment, canKey, viewport, snapshot, scope }) {
      const node = nodeId ? flat.find((candidate) => candidate.id === nodeId) : undefined;
      const key = node && canKey ? await FP.mintKey(nodeId) : undefined;
      const thread = FP.normalise(
        { status: 'open', createdAt: comment.createdAt, comments: [comment] },
        {
          page,
          viewport: FP.viewport(viewport),
          snapshot: FP.snapshot(snapshot),
          scope: FP.scope(scope),
          at: node ? at : undefined,
          spot: node ? undefined : spot,
          key,
          target: node ? FP.target(flat, node) : undefined,
        },
      );
      return put(log(thread, 'comment', comment.actor, { at: comment.createdAt, commentId: comment.id }));
    },

    async addComment({ thread, comment }) {
      const now = await current(thread);
      if (now.comments.length >= FP.LIMITS.commentsPerThread) {
        throw new Error(`A thread holds at most ${FP.LIMITS.commentsPerThread} comments. Start a new one.`);
      }
      const next = { ...now, comments: [...now.comments, comment], updatedAt: comment.createdAt };
      return put(log(next, 'reply', comment.actor, { at: comment.createdAt, commentId: comment.id }));
    },

    async setStatus({ thread, status, author, actor }) {
      const now = await current(thread);
      const at = FP.now();
      const next = {
        ...now,
        status,
        updatedAt: at,
        resolvedAt: status === 'resolved' ? at : undefined,
        resolvedBy: status === 'resolved' ? author : undefined,
      };
      return put(log(next, status === 'resolved' ? 'resolve' : 'reopen', actor, { at }));
    },

    /** A pin put somewhere else: dragged, or picked up and put down. */
    async move({ flat, thread, nodeId, at, spot, canKey, actor }) {
      const node = nodeId ? flat.find((candidate) => candidate.id === nodeId) : undefined;
      const now = await current(thread);
      const key = node ? (canKey ? await FP.mintKey(nodeId) : undefined) : undefined;
      // The old ref (a 1.7 pin inside a closed component) goes with the old spot; a keyed element
      // reads back as a one-step ref.
      const next = {
        ...now,
        at: node ? at : undefined,
        spot: node ? undefined : spot,
        key,
        target: node ? FP.target(flat, node) : undefined,
        ref: undefined,
        refAt: undefined,
        refName: undefined,
        updatedAt: FP.now(),
      };
      return put(log(next, 'move', actor));
    },

    async editComment({ thread, commentId, body, actor }) {
      const now = await current(thread);
      const text = String(body).trim().slice(0, FP.LIMITS.bodyChars);
      if (text === '') throw new Error('A comment needs words. Delete it instead.');
      const comments = now.comments.map((comment) =>
        comment.id === commentId ? { ...comment, body: text, mentions: FP.mentionsIn(text), editedAt: FP.now() } : comment,
      );
      return put(log({ ...now, comments }, 'edit', actor, { commentId }));
    },

    /** Adds or takes back one person's reaction; reactions are not logged and do not change activity time. */
    async toggleReaction({ thread, commentId, emoji, personId }) {
      if (!FP.REACTIONS.includes(emoji)) throw new Error('That reaction is not offered.');
      if (!personId) throw new Error('Stacki did not say who you are, so a reaction cannot be kept.');
      const now = await current(thread);
      const comments = now.comments.map((comment) => {
        if (comment.id !== commentId) return comment;
        const people = comment.reactions[emoji] || [];
        const next = people.includes(personId) ? people.filter((id) => id !== personId) : [...people, personId].slice(0, FP.LIMITS.reactionsPerEmoji);
        const reactions = { ...comment.reactions };
        if (next.length > 0) reactions[emoji] = next;
        else delete reactions[emoji];
        return { ...comment, reactions };
      });
      return put({ ...now, comments });
    },

    /** A soft delete: the thread stays in storage with `deletedAt` and a log entry, and is hidden. */
    async removeThread({ thread, actor }) {
      const now = await current(thread);
      const at = FP.now();
      return put(log({ ...now, deletedAt: at, updatedAt: at }, 'delete', actor, { at }));
    },

    /** A soft delete of one comment: it stays with `deletedAt` and a log entry, and is hidden. */
    async removeComment({ thread, commentId, actor }) {
      const now = await current(thread);
      const at = FP.now();
      const comments = now.comments.map((comment) => (comment.id === commentId ? { ...comment, deletedAt: at } : comment));
      return put(log({ ...now, comments, updatedAt: at }, 'delete', actor, { at, commentId }));
    },

    /**
     * Labels a change that arrived from outside Stacki with no actor: one log entry with an unknown
     * actor. The entry is worked out from the data alone, so two windows that both see the change
     * write the same value, and Git merges them as one.
     */
    async labelOutside({ thread, action, at }) {
      const now = await current(thread);
      if ((now.activity || []).some((entry) => entry.note === 'outside' && entry.at === at && entry.action === action)) return now;
      return put(FP.logged(now, { action, at, actor: { kind: 'unknown', person: {} }, note: 'outside' }));
    },

    async importThreads({ threads }) {
      let added = 0;
      for (const raw of threads.slice(0, FP.LIMITS.threads)) {
        const parsed = FP.parseThread(raw);
        if (parsed.thread) {
          await put(parsed.thread);
          added += 1;
        }
      }
      return { added, skipped: Math.max(0, threads.length - added) };
    },

    put,
  };
})();

// Feedback pins — click anywhere on a page or component and leave a comment there.
//
// Three things are kept in step: the open file's elements (page.get), the
// threads in project storage, and the overlay Stacki draws. Every edit goes
// through the store, then the whole view is read back, so a change made here,
// by a teammate, by a `git pull` or by another app lands the same way.
//
// The app opens in comment mode: it observes canvas clicks (canvas.capture with
// mode 'observe') so a single click places a comment while the editor keeps
// selecting, entering components and the Navigator; it stays on after a comment
// is posted. The comment icon turns it off. Threads belong to a file: the page,
// or the component open on the canvas.
//
// The panel is calm by design: at rest, a header row, the tabs and the list.
// Search, filters, settings, export and shortcuts open from icons.
(() => {
  const FP = window.FP;
  const store = FP.store;
  const $ = (id) => document.getElementById(id);

  // The comment-mode cursor: cursor.svg, a 24 × 24 bubble whose tail tip (2, 22) is where the pin
  // lands. A Stacki that cannot take an image cursor refuses it; the crosshair is the fallback.
  const CURSOR = { image: 'cursor.svg', hotspot: { x: 2, y: 22 } };
  const CURSOR_FALLBACK = 'crosshair';

  /** How long one pulse step lasts, and how many steps make the pulse when a pin is visited. */
  const PULSE_STEP_MS = 180;
  const PULSE_STEPS = 6;

  /**
   * The filters' defaults: the filter icon shows a dot when any differs. `scope` (this page or all
   * pages) is the header's file dropdown, remembered per person, so Reset leaves it as it is.
   */
  const FILTER_DEFAULTS = { scope: 'file', who: 'everyone', sort: 'page' };

  const svg = (body, size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    page: svg('<path d="M4 1.75h5l3 3v9.5H4z"/><path d="M9 1.75v3h3"/>', 14),
    component: svg('<path d="M8 1.75 14.25 8 8 14.25 1.75 8z"/>', 14),
    /** Two pages, one behind the other: the All pages view. */
    pages: svg('<path d="M6 3.75h4.5l2.5 2.5v8H6z"/><path d="M3.5 11.25V1.75H8"/>', 14),
    filter: svg('<path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/>'),
  };

  const ui = {
    fileIcon: $('file-icon'),
    fileName: $('file-name'),
    viewOnly: $('view-only'),
    pinMode: $('pin-mode'),
    commentSelection: $('comment-selection'),
    more: $('more'),
    filter: $('filter'),
    searchToggle: $('search-toggle'),
    searchRow: $('search-row'),
    search: $('search'),
    filtersToggle: $('filters-toggle'),
    filtersDot: $('filters-dot'),
    filters: $('filters'),
    filtersReset: $('filters-reset'),
    who: $('who'),
    sort: $('sort'),
    compose: $('compose'),
    composeTarget: $('compose-target'),
    composeViewport: $('compose-viewport'),
    moveHint: $('move-hint'),
    composeBody: $('compose-body'),
    composeSubmit: $('compose-submit'),
    composeCancel: $('compose-cancel'),
    list: $('list'),
    nameSheet: $('name-sheet'),
    name: $('name'),
    keysSheet: $('keys-sheet'),
    exportSheet: $('export-sheet'),
    exportFormat: $('export-format'),
    exportPath: $('export-path'),
    importSheet: $('import-sheet'),
    importBody: $('import-body'),
    download: $('download'),
  };

  /** Pin colours are hex (an overlay takes nothing else); the theme's tokens replace these at boot. */
  const DEFAULT_COLORS = { accent: '#0099ff', accentText: '#ffffff', success: '#30c158', panel: '#111111', text: '#f5f5f5' };

  const state = {
    /** The file open on the canvas: a page, or a component the person opened. */
    file: undefined,
    flat: [],
    /** Every thread in the project, for the badge, the All pages view and the export. */
    all: [],
    /** The open file's threads, each with the session's `nodeId` (undefined when its element is gone). */
    threads: [],
    filter: 'open',
    scope: FILTER_DEFAULTS.scope,
    who: FILTER_DEFAULTS.who,
    sort: FILTER_DEFAULTS.sort,
    query: '',
    activeId: undefined,
    hoveredNodeId: undefined,
    me: { id: undefined, name: undefined, github: undefined },
    role: { name: '', isAdmin: false, permissions: {} },
    localName: '',
    pinsVisible: true,
    outline: false,
    working: false,
    can: { setAttribute: false, scrollTo: true, snapshot: false, setWidth: false },
    /** Each node's parent in the open file, for a component instance's section. */
    parents: new Map(),
    /** Inner pins on the open file: thread id → the open page's element holding it (node.find), or undefined when gone. */
    refHolders: new Map(),
    viewport: undefined,
    colors: { ...DEFAULT_COLORS },
    pinMode: false,
    /** The element selected on the canvas or in the Navigator, in the open file: what C comments on. */
    selectedNodeId: undefined,
    /** A thread being moved or re-attached: the next canvas click is its new spot. */
    moving: undefined,
    /** Where the last canvas click landed, waiting for words. */
    pending: undefined,
    /** The thread being navigated to: page.change must not close it while its file opens. */
    navigating: undefined,
    /** A pin being dragged: where the pointer has it now, drawn there until the drag ends. */
    dragging: undefined,
    /** The hovered pin's card: which thread, and where the card's frame goes. */
    hoverCard: undefined,
    /** People who may be mentioned, from people.list: role members, then committers. */
    members: [],
    pulse: { threadId: undefined, step: 0 },
    editing: undefined,
    reacting: undefined,
    drafts: new Map(),
    /** Per person, this computer: when each thread was last read, and since when notices were sent. */
    seen: {},
    seenSince: 0,
    notifiedSince: 0,
    /** Each stored thread's content and log length at the last read, to spot changes made outside Stacki. */
    fingerprints: undefined,
    /** Files whose old `data-feedback` pins were already moved this session. */
    migrated: new Set(),
  };

  // --- Small helpers --------------------------------------------------------

  const element = (tag, className, text) => {
    const made = document.createElement(tag);
    if (className) made.className = className;
    if (text !== undefined) made.textContent = text;
    return made;
  };

  /** A kit element. Attributes are set before it connects, since a button reads its label then. */
  const kit = (tag, attributes) => {
    const made = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === true) made.setAttribute(name, '');
      else if (value !== false && value !== undefined) made.setAttribute(name, String(value));
    }
    return made;
  };

  const setFlag = (target, name, on) => target.toggleAttribute(name, Boolean(on));

  /** Kit fields render their input a frame after they connect; focus waits for it, at most ten frames. */
  const focusField = (host, attempt = 0) => {
    const field = host && host.querySelector('textarea, input');
    if (field) {
      field.focus();
      return;
    }
    if (attempt < 10) requestAnimationFrame(() => focusField(host, attempt + 1));
  };

  const notify = (message, kind) => stacki.ui.notify({ message: message.slice(0, 280), kind }).catch(() => {});
  const fail = (error) => notify(error instanceof Error ? error.message : String(error), 'error');

  /** One write at a time, then everything is read back. */
  const write = async (work) => {
    if (state.working) return undefined;
    state.working = true;
    render();
    try {
      return await work();
    } catch (error) {
      await fail(error);
      return undefined;
    } finally {
      state.working = false;
      await refresh();
    }
  };

  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

  // --- People, permissions --------------------------------------------------

  /** Who a comment is from: Git's name, then GitHub, then a name typed here, then the role. */
  const signature = () => ({
    author: state.me.name || state.me.github || state.localName || state.role.name || 'Anonymous',
    github: state.me.github,
    by: state.me.id,
  });

  /**
   * Version 1.0 signed comments with the role's name ("Admin") when it knew no person. Such a
   * comment has no person id and no GitHub login; it was left on this machine, so it belongs to the
   * person here now. Role names are the built-in ones and the current role's own.
   */
  const isRoleSigned = (comment) => {
    if (comment.by || comment.github) return false;
    const roles = new Set(['admin', 'client', state.role.name.toLowerCase()].filter((name) => name));
    const author = comment.author.trim().toLowerCase();
    return author === '' || author === 'anonymous' || roles.has(author);
  };

  /** The thread with every role-signed comment given to the person here (person.get: id, name, login). */
  const reattribute = (thread) => {
    const known = state.me.name || state.me.github;
    return {
      ...thread,
      comments: thread.comments.map((comment) =>
        isRoleSigned(comment)
          ? { ...comment, author: known ? state.me.name || state.me.github : comment.author, github: state.me.github, avatar: FP.avatar(state.me.github), by: state.me.id }
          : comment,
      ),
    };
  };

  /** Fixes, once per computer, threads an earlier migration stored with a role's name as the author. */
  const repairRoleAuthors = async () => {
    const done = await stacki.storage.get({ key: 'repair/role-authors', scope: 'local' }).catch(() => undefined);
    if ((done && done.value === 'done') || !state.me.id) return;
    const broken = state.all.filter((thread) => thread.comments.some(isRoleSigned));
    if (broken.length > 0) {
      await write(async () => {
        for (const thread of broken.slice(0, FP.LIMITS.threads)) await store.put(reattribute(thread));
      });
    }
    await stacki.storage.set({ key: 'repair/role-authors', value: 'done', scope: 'local' }).catch(() => {});
  };

  /** Everything done in the app's own UI is a person's: `human`, with who they are (person.get). */
  const actor = () => ({
    kind: 'human',
    person: { id: state.me.id, login: state.me.github, name: state.me.name || state.localName || undefined, avatar: FP.avatar(state.me.github) },
  });

  /** Whether Stacki knows no name for this person: only then does the menu offer "Your name". */
  const needsName = () => !state.me.name && !state.me.github;

  const isAgent = (comment) => Boolean(comment.actor && comment.actor.kind === 'agent');

  const displayName = (comment) => {
    if (isAgent(comment)) return FP.actorLabel(comment.actor);
    return comment.github && comment.author === comment.github ? `@${comment.github}` : comment.author;
  };

  const SPARKLE =
    '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0.5 9.6 6.4 15.5 8 9.6 9.6 8 15.5 6.4 9.6 0.5 8 6.4 6.4z"/></svg>';

  /** The AI badge beside an agent's name: a sparkle and the agent's name, with who it worked for. */
  const agentBadge = (actorValue) => {
    const badge = element('span', 'agent-badge');
    badge.innerHTML = SPARKLE;
    badge.append(actorValue.agent.name);
    const who = actorValue.person.name || actorValue.person.login || 'someone';
    badge.title = `Written by ${actorValue.agent.name}${actorValue.agent.model ? ` (${actorValue.agent.model})` : ''}, an AI coding agent working for ${who}.`;
    badge.setAttribute('aria-label', badge.title);
    return badge;
  };

  const isMine = (comment) => {
    if (comment.by && state.me.id) return comment.by === state.me.id;
    if (comment.github && state.me.github) return comment.github === state.me.github;
    return false;
  };

  /** The handles someone could mention me by, lowercased. */
  const myHandles = () =>
    [state.me.github, FP.handle({ name: state.me.name }), FP.handle({ name: state.localName })].filter((handle) => handle).map((handle) => handle.toLowerCase());

  const mentionsMe = (comment) => {
    const mine = myHandles();
    return comment.mentions.some((handle) => mine.includes(handle));
  };

  /** Everyone the mention picker offers but you: role members and committers (people.list), then commenters. */
  const people = () => {
    const byHandle = new Map();
    const add = (person) => {
      const handle = FP.handle(person);
      if (handle && !byHandle.has(handle.toLowerCase()) && byHandle.size < FP.LIMITS.people) {
        byHandle.set(handle.toLowerCase(), { handle, name: person.name || person.author || handle, github: person.github, avatar: person.avatar });
      }
    };
    for (const member of state.members) add({ github: member.login, name: member.name, avatar: member.avatarURL });
    for (const thread of state.all) for (const comment of thread.comments) if (!isMine(comment)) add(comment);
    const mine = myHandles();
    return [...byHandle.values()].filter((person) => !mine.includes(person.handle.toLowerCase()));
  };

  // This app's own permissions (manifest `permissions`), resolved by Stacki for the person's role.
  // A Stacki that does not resolve them yet sends none: the manifest's defaults apply then.
  const PERMISSION_DEFAULTS = { comment: true, 'resolve-threads': true, 'delete-any-comment': false, moderate: false };
  const may = (permission) => {
    if (state.role.isAdmin) return true;
    const value = state.role.permissions[permission];
    return typeof value === 'boolean' ? value : PERMISSION_DEFAULTS[permission] === true;
  };
  /** Without `comment` the app is view only: threads, pins and navigation, nothing to write with. */
  const mayComment = () => may('comment');
  const mayResolve = () => may('resolve-threads');
  const mayModerate = () => may('moderate');
  const mayDeleteAny = () => may('delete-any-comment') || mayModerate();

  // --- Files and context ------------------------------------------------------

  /** A file under `src/pages/` is a page; any other `.astro` file open on the canvas is a component. */
  const describeFile = (path) => {
    if (!path) return { kind: 'Page', name: 'No page open' };
    const name = path.split('/').pop() || path;
    return { kind: /(^|\/)src\/pages\//.test(path) ? 'Page' : 'Component', name };
  };

  const viewportLabel = (viewport) => {
    if (!viewport) return '';
    const device = viewport.device ? viewport.device.charAt(0).toUpperCase() + viewport.device.slice(1) : '';
    return [device, viewport.widthPx ? `${viewport.widthPx}px` : ''].filter((part) => part).join(' ');
  };

  // --- Reading the world ----------------------------------------------------

  let refreshing;
  /** Reads the open file and every thread, then renders. `fromOther`: a teammate's change or a pull. */
  const refresh = (options = {}) => {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const view = await stacki.page.get();
        state.file = view ? view.path : undefined;
        state.flat = view ? FP.flatten(view.nodes) : [];
        state.parents = view ? FP.parents(view.nodes) : new Map();
        const before = state.fingerprints;
        let stored = await store.listAll();
        state.fingerprints = new Map(stored.map((thread) => [thread.id, fingerprint(thread)]));
        // Labels written for outside changes are part of the data: read again so the list shows them.
        if (options.fromOther && before && (await labelOutsideChanges(stored, before)) > 0) {
          stored = await store.listAll();
          state.fingerprints = new Map(stored.map((thread) => [thread.id, fingerprint(thread)]));
        }
        // Soft deletes stay in storage with their log; the panel and canvas show what is left.
        state.all = stored
          .filter((thread) => !thread.deletedAt)
          .map((thread) => ({ ...thread, comments: thread.comments.filter((comment) => !comment.deletedAt) }))
          .filter((thread) => thread.comments.length > 0);
        state.refHolders = await resolveRefs(state.all);
        state.threads = state.all
          .map((thread) => ({ thread, nodeIds: state.file === undefined ? [] : nodesFor(thread) }))
          .filter(({ thread, nodeIds }) => state.file !== undefined && (thread.page === state.file || nodeIds.length > 0))
          .map(({ thread, nodeIds }) => ({ ...thread, nodeIds, nodeId: nodeIds[0] }))
          .sort((a, b) => a.createdAt - b.createdAt);
        if (state.activeId && !state.all.some((thread) => thread.id === state.activeId)) state.activeId = undefined;
        const open = state.all.filter((thread) => thread.status === 'open').length;
        void stacki.app.badge({ count: Math.min(9999, open) }).catch(() => {});
        if (options.fromOther) announce();
      } catch (error) {
        await fail(error);
      } finally {
        refreshing = undefined;
      }
      render();
      await drawOverlay();
      void migrateLegacy();
    })();
    return refreshing;
  };

  /** What a thread says, apart from its log: if this changes and the log does not, someone outside Stacki changed it. */
  const fingerprint = (thread) => ({
    content: JSON.stringify([thread.status, thread.deletedAt, thread.page, thread.key, thread.target, thread.at, thread.spot, thread.comments.map((comment) => [comment.id, comment.body, comment.deletedAt])]),
    activity: (thread.activity || []).length,
  });

  /**
   * Labels changes that arrived from outside (storage.change, origin 'other') without an activity entry
   * of their own: never assumed human. A new thread with no log is labelled as a comment; a changed one
   * as an edit. The time is the newest time in the data, so every window labels it the same way.
   */
  const labelOutsideChanges = async (stored, before) => {
    let labelled = 0;
    for (const thread of stored) {
      const previous = before.get(thread.id);
      const now = fingerprint(thread);
      let action;
      if (!previous && now.activity === 0) action = 'comment';
      else if (previous && previous.content !== now.content && previous.activity === now.activity) action = 'edit';
      if (!action) continue;
      const times = [thread.updatedAt, thread.createdAt, thread.resolvedAt, thread.deletedAt, ...thread.comments.flatMap((comment) => [comment.createdAt, comment.editedAt, comment.deletedAt])];
      const at = Math.max(...times.filter((value) => Number.isSafeInteger(value)));
      await store.labelOutside({ thread, action, at }).catch(() => {});
      labelled += 1;
    }
    return labelled;
  };

  /** Notices for what a teammate or a pull brought: mentions of you by name, the rest as a count. */
  const announce = () => {
    const since = state.notifiedSince;
    let others = 0;
    for (const thread of state.all) {
      for (const comment of thread.comments) {
        if (comment.createdAt <= since || isMine(comment)) continue;
        if (mentionsMe(comment)) {
          const { name } = describeFile(thread.page);
          void notify(`${displayName(comment)} mentioned you on ${name}: ${comment.body}`, 'info');
        } else {
          others += 1;
        }
      }
    }
    if (others > 0) void notify(`${plural(others, 'new comment', 'new comments')} from your team.`, 'info');
    state.notifiedSince = FP.now();
    void stacki.storage.set({ key: 'notify/since', value: String(state.notifiedSince), scope: 'local' }).catch(() => {});
  };

  /**
   * Moves pins an older version kept in `data-feedback` attributes into project storage, silently, the
   * first time each file is open. Each attribute removal is one undo step named for it. Where this
   * editor cannot write attributes (Studio), the pins are still copied, and the attribute stays.
   */
  const migrateLegacy = async () => {
    const file = state.file;
    if (!file || state.migrated.has(file) || state.working) return;
    const nodes = state.flat.filter((node) => node.attributes && typeof node.attributes[FP.LEGACY_ATTRIBUTE] === 'string');
    state.migrated.add(file);
    if (nodes.length === 0) return;
    await write(async () => {
      for (const node of nodes.slice(0, FP.LIMITS.threads)) {
        const thread = FP.unpack(node.attributes[FP.LEGACY_ATTRIBUTE], { page: file, target: FP.target(state.flat, node) });
        if (!thread) continue;
        // A retry after a failed removal finds the thread already stored: it is not written twice.
        if (!(await store.has(thread.id))) {
          const key = thread.key || (state.can.setAttribute ? await FP.mintKey(node.id) : undefined);
          await store.put(reattribute({ ...thread, page: file, key, target: FP.target(state.flat, node) }));
        }
        if (state.can.setAttribute) {
          await stacki.node.removeAttribute({ nodeId: node.id, name: FP.LEGACY_ATTRIBUTE, label: 'Move feedback pin to project storage' }).catch(() => {});
        }
      }
    });
  };

  // --- Read and unread (local scope: this person, this computer) -------------------

  const lastFromOthers = (thread) => thread.comments.filter((comment) => !isMine(comment)).reduce((latest, comment) => Math.max(latest, comment.createdAt), 0);

  const isUnread = (thread) => lastFromOthers(thread) > Math.max(state.seen[thread.id] || 0, state.seenSince);

  let seenTimer;
  const markSeen = (thread) => {
    if (!isUnread(thread)) return;
    state.seen[thread.id] = FP.now();
    // Bounded: the oldest reads are forgotten first.
    const entries = Object.entries(state.seen).sort((a, b) => b[1] - a[1]).slice(0, FP.LIMITS.seen);
    state.seen = Object.fromEntries(entries);
    clearTimeout(seenTimer);
    seenTimer = setTimeout(() => void stacki.storage.set({ key: 'seen/threads', value: JSON.stringify(state.seen), scope: 'local' }).catch(() => {}), 400);
  };

  // --- Filtering and order -------------------------------------------------------

  const matchesFilter = (thread) => {
    if (state.filter === 'open' && thread.status !== 'open') return false;
    if (state.filter === 'resolved' && thread.status !== 'resolved') return false;
    if (state.who === 'mine' && !thread.comments.some(isMine)) return false;
    if (state.who === 'mentions' && !thread.comments.some(mentionsMe)) return false;
    if (state.who === 'agents' && !thread.comments.some(isAgent) && !(thread.activity || []).some((entry) => entry.actor.kind === 'agent')) return false;
    if (state.query !== '') {
      const query = state.query.toLowerCase();
      const words = [FP.describeTarget(thread.target), thread.refName || '', thread.page, ...thread.comments.flatMap((comment) => [comment.body, comment.author, comment.github || ''])];
      if (!words.some((word) => word.toLowerCase().includes(query))) return false;
    }
    return true;
  };

  const filtersAreDefault = () => state.who === FILTER_DEFAULTS.who && state.sort === FILTER_DEFAULTS.sort;

  /** A thread's number within its own file, oldest first: the number its pin shows. */
  const numberOf = (thread) => {
    const siblings = state.all.filter((candidate) => candidate.page === thread.page).sort((a, b) => a.createdAt - b.createdAt);
    return siblings.findIndex((candidate) => candidate.id === thread.id) + 1;
  };

  /** On the open file: left here, or a scoped comment with instances here. */
  const isHere = (thread) => state.file !== undefined && state.threads.some((candidate) => candidate.id === thread.id);

  /** Instances of a component in a list of nodes: component nodes with its name. */
  const instancesIn = (nodes, name) => nodes.filter((node) => node.kind === 'component' && node.name === name);

  /** The section a scoped comment belongs to, in the open file: by its key, else by its description. */
  const sectionNode = (scope) => {
    if (scope.section.key) {
      const keyed = state.flat.find((node) => node.attributes && node.attributes[FP.KEY_ATTRIBUTE] === scope.section.key);
      if (keyed) return keyed;
    }
    if (!scope.section.target) return undefined;
    const nodeId = FP.resolve(state.flat, { target: scope.section.target });
    return nodeId ? state.flat.find((node) => node.id === nodeId) : undefined;
  };

  /** Refs resolved at most per refresh: the overlay draws at most 64 items anyway. */
  const REFS_RESOLVED_MAX = 64;

  /**
   * The open page's element that holds each inner pin on the open file (node.find), or undefined
   * when a step's element is gone (the thread shows as Detached). A Stacki without node.find leaves
   * the map empty, and those pins fall back to their page element, as before 1.7.0.
   */
  const resolveRefs = async (threads) => {
    const holders = new Map();
    if (!state.file || typeof stacki.node.find !== 'function') return holders;
    const inner = threads.filter((thread) => thread.page === state.file && FP.innerRef(thread)).slice(0, REFS_RESOLVED_MAX);
    const answers = await Promise.all(inner.map((thread) => stacki.node.find({ ref: thread.ref }).catch(() => undefined)));
    inner.forEach((thread, index) => {
      const answer = answers[index];
      // No answer at all (a refusal): leave it out, so the page element still places the pin.
      if (answer) holders.set(thread.id, answer.nodeId || undefined);
    });
    return holders;
  };

  /**
   * The anchors of a matches thread's other elements on the canvas. In a page: refs that swap the
   * pinned element's last step for each match in the same instance (each template node once). In the
   * component's own file: its other matching nodes.
   */
  const matchAnchors = async (thread) => {
    const scope = thread.scope;
    if (scope.component.path === state.file) return thread.nodeIds.slice(1).map((nodeId) => ({ nodeId }));
    if (!usesRef(thread)) return [];
    return otherMatchAnchors(thread.ref, scope.component.path, scope.match);
  };

  /**
   * Refs to the other elements a matches scope reaches in the same instance: the pinned ref with its
   * last step swapped for each matching template node of the component's file (each node once).
   */
  const otherMatchAnchors = async (ref, path, match) => {
    const steps = ref.steps;
    const last = steps[steps.length - 1];
    if (last.file !== path) return [];
    const nodes = matchesIn(await flatOf(last.file), match);
    return nodes
      .filter((node) => !(last.key && node.attributes[FP.KEY_ATTRIBUTE] === last.key) && node.id !== last.nodeId)
      .map((node) => {
        const key = node.attributes[FP.KEY_ATTRIBUTE];
        return { ref: { steps: [...steps.slice(0, -1), { file: last.file, nodeId: node.id, ...(key ? { key } : {}) }] } };
      });
  };

  /** Drawn by its ref: an inner pin on the open file whose ref still finds its element. */
  const usesRef = (thread) => FP.innerRef(thread) && thread.page === state.file && Boolean(state.refHolders.get(thread.id));

  /** Whether the open file is a component's own file: by its path, else (older threads) by its name. */
  const isComponentFile = (component) => {
    if (!state.file) return false;
    if (component.path) return component.path === state.file;
    return state.file.split('/').pop() === `${component.name}.astro`;
  };

  /** Every node a thread is drawn on in the open file, at most 12 (the overlay holds 64 items). */
  const INSTANCES_MAX = 12;
  const nodesFor = (thread) => {
    const scope = thread.scope;
    // In the component's own file, a matches scope is on each matching element: the one pinned first.
    if (scope && scope.kind === 'matches' && scope.component.path === state.file) {
      const nodes = matchesIn(state.flat, scope.match);
      const last = thread.ref ? thread.ref.steps[thread.ref.steps.length - 1] : undefined;
      const pinned = last ? nodes.find((node) => (last.key && node.attributes[FP.KEY_ATTRIBUTE] === last.key) || node.id === last.nodeId) : undefined;
      return [pinned, ...nodes.filter((node) => node !== pinned)].filter((node) => node).map((node) => node.id);
    }
    if (scope && scope.kind === 'component' && isComponentFile(scope.component)) {
      // In the component's own canvas: on its root element.
      const root = state.flat.find((node) => node.kind === 'element' || node.kind === 'component');
      return root ? [root.id] : [];
    }
    // An inner pin (inside a component instance) is on the page element node.find says holds its ref.
    if (thread.page === state.file && state.refHolders.has(thread.id)) {
      const holder = state.refHolders.get(thread.id);
      return holder ? [holder] : [];
    }
    if (!scope) {
      if (thread.page !== state.file) return [];
      const nodeId = FP.resolve(state.flat, thread);
      return nodeId ? [nodeId] : [];
    }
    let nodes = [];
    if (scope.kind === 'component') {
      nodes = instancesIn(state.flat, scope.component.name);
    } else if (scope.kind === 'page' && thread.page === state.file) {
      nodes = instancesIn(state.flat, scope.component.name);
    } else if (scope.kind === 'section' && thread.page === state.file) {
      const section = sectionNode(scope);
      nodes = section ? instancesIn(FP.descendants(section), scope.component.name) : [];
    }
    return nodes.slice(0, INSTANCES_MAX).map((node) => node.id);
  };

  /** The thread an overlay item belongs to: `pin-<id>` or `pin-<id>:<n>` (a scoped comment's other pins). */
  const threadOfItem = (itemId, list) => {
    if (typeof itemId !== 'string' || !itemId.startsWith('pin-')) return undefined;
    const id = itemId.slice(4).split(':')[0];
    return list.find((candidate) => candidate.id === id);
  };

  /** How a matches scope (read from older threads) reads: "Every .footer_link in Footer". */
  const matchesLabel = (match, component, within) => {
    const what = match.class ? `.${match.class}` : `<${match.tag}>`;
    return within === 'all' ? `Every ${what} across every ${component}` : `Every ${what} in ${component}`;
  };

  /** How a scope reads in the list: "All Headings on this page". */
  const scopeLabel = (scope) => {
    if (!scope) return '';
    const plural = `${scope.component.name}s`;
    if (scope.kind === 'section') return `All ${plural} in this section`;
    if (scope.kind === 'page') return `All ${plural} on this page`;
    if (scope.kind === 'matches') return matchesLabel(scope.match, scope.component.name, scope.within);
    // `component` is every instance across the site and the component itself (older `site` reads as it).
    return `All ${plural} across the site`;
  };

  /** The open file's copy of a thread, with its session node id; other files' threads have none. */
  const live = (thread) => state.threads.find((candidate) => candidate.id === thread.id) || thread;

  const placed = (thread) => Boolean(thread.nodeId || (thread.spot && !thread.target));

  const pageOrder = (thread) => {
    const index = thread.nodeId ? state.flat.findIndex((node) => node.id === thread.nodeId) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sorted = (threads) => {
    const list = [...threads];
    if (state.sort === 'newest') return list.sort((a, b) => b.updatedAt - a.updatedAt);
    if (state.sort === 'oldest') return list.sort((a, b) => a.createdAt - b.createdAt);
    return list.sort((a, b) => pageOrder(a) - pageOrder(b) || a.createdAt - b.createdAt);
  };

  /**
   * What the list shows, in its order: one group for this file, or one per file. All pages puts the
   * open file first, then the files with the most recent activity.
   */
  const groups = () => {
    if (state.scope === 'file') return [{ file: state.file, threads: sorted(state.threads.filter(matchesFilter)) }];
    const shown = state.all.filter(matchesFilter).map(live);
    const latest = new Map();
    for (const thread of shown) latest.set(thread.page, Math.max(latest.get(thread.page) || 0, thread.updatedAt || 0));
    const files = [...latest.keys()].sort((a, b) => {
      if (a === state.file) return -1;
      if (b === state.file) return 1;
      return latest.get(b) - latest.get(a) || a.localeCompare(b);
    });
    return files.map((file) => ({ file, threads: sorted(shown.filter((thread) => thread.page === file)) }));
  };

  const visibleThreads = () => groups().flatMap((group) => group.threads);

  // --- The overlay: the open file's pins only -----------------------------------

  /** Where a dragged pin is drawn: on the element under the pointer, else at the pointer. */
  const dragAnchor = (drag) =>
    drag.nodeId ? (drag.at ? { nodeId: drag.nodeId, at: drag.at } : { nodeId: drag.nodeId }) : { rect: { x: Math.round(drag.x), y: Math.round(drag.y), width: 1, height: 1 } };

  const drawOverlay = async () => {
    if (!state.pinsVisible || !state.file) {
      await stacki.overlay.clear().catch(() => {});
      return;
    }
    const colors = state.colors;
    const items = [];
    const elements = new Set();
    const room = (nodeId) => !nodeId || elements.has(nodeId) || elements.size < FP.LIMITS.overlayElements;
    const active = state.threads.find((thread) => thread.id === state.activeId);

    // The open thread's element first, boxed, with a preview of its first comment as the box's label.
    if (active && active.nodeId && placed(active) && !state.dragging) {
      const first = active.comments[0];
      const preview = first ? `#${numberOf(active)} ${displayName(first)}: ${first.body.replace(/\s+/g, ' ')}` : `#${numberOf(active)}`;
      const box = usesRef(active) ? { ref: active.ref } : { nodeId: active.nodeId };
      items.push({ kind: 'box', id: `box-${active.id}`, anchor: box, color: colors.accent, fill: `${colors.accent}1a`, label: preview.slice(0, FP.LIMITS.labelChars) });
      elements.add(active.nodeId);
    }

    // The open thread's other matches (a matches scope), outlined softly: one pin, the rest highlighted.
    if (active && active.scope && active.scope.kind === 'matches' && !state.dragging) {
      for (const [index, anchor] of (await matchAnchors(active)).entries()) {
        if (items.length >= FP.LIMITS.overlayItems - 2) break;
        items.push({ kind: 'box', id: `match-${index}`, anchor, color: `${colors.accent}80`, fill: `${colors.accent}0d`, dashed: true });
      }
    }

    // The comment being written: its element boxed, under the draft pin.
    if (state.pending && !state.pending.parked && state.pending.nodeId) {
      items.push({ kind: 'box', id: 'pending', anchor: { nodeId: state.pending.nodeId }, color: colors.accent, fill: `${colors.accent}1a` });
    }

    const shown = state.threads.filter((thread) => matchesFilter(thread) || thread.id === state.activeId);
    // A scoped comment draws one pin per instance; each pin is its own item, `pin-<id>:<n>`. An inner
    // pin is one copy inside an instance: one pin, on its ref.
    const pinsOf = (thread) =>
      thread.scope && thread.scope.kind !== 'matches' && thread.nodeIds.length > 0 && !usesRef(thread)
        ? thread.nodeIds.map((nodeId, index) => ({ thread, nodeId, index }))
        : [{ thread, nodeId: thread.nodeId, index: 0 }];
    for (const { thread, nodeId, index } of shown.flatMap(pinsOf)) {
      const dragged = !thread.scope && state.dragging && state.dragging.threadId === thread.id ? state.dragging : undefined;
      // A scope's pin sits on each instance at the clicked point of the first.
      const anchor = dragged ? dragAnchor(dragged) : usesRef(thread) ? FP.refAnchor(thread) : FP.anchorOf(thread, nodeId);
      // Detached pins are not drawn: their element is gone, and the thread offers Re-attach.
      if (!anchor || (!dragged && !placed(thread)) || !room(anchor.nodeId)) continue;
      if (items.length >= FP.LIMITS.overlayItems - 1) break; // One slot stays for the hover card.
      if (anchor.nodeId) elements.add(anchor.nodeId);
      else if (nodeId) elements.add(nodeId);
      const isActive = thread.id === state.activeId;
      // The pulse blinks the active ring a few times; otherwise the ring marks the open thread.
      const pulsing = state.pulse.threadId === thread.id;
      const ringed = pulsing ? state.pulse.step % 2 === 1 : isActive;
      const first = thread.comments[0];
      const number = numberOf(thread);
      items.push({
        // Stacki's comment marker: a round badge with a tail, the number, the author's picture on hover.
        kind: 'pin',
        id: index === 0 ? `pin-${thread.id}` : `pin-${thread.id}:${index}`,
        anchor,
        // A scoped comment's number carries a "+": it applies to more than this instance.
        label: number > 99 ? '…' : thread.scope ? `${number}+` : String(number),
        // Colour by status, from the editor's own tones: open in the accent, resolved in green.
        tone: thread.status === 'resolved' ? 'success' : 'accent',
        avatarURL: first ? FP.avatarURL(first.avatar) || FP.avatar(first.github) : undefined,
        active: ringed,
        interactive: true,
        // Press and move to drag it to a new spot (overlay.drag); a press under 4px is still a click.
        // Pins from 1.7 inside closed components (by ref) are read-only: open the component to re-pin.
        draggable: mayComment() && !thread.scope && !FP.innerRef(thread),
        // Crowded pins collapse into one count bubble (which cannot be dragged); zooming in spreads them.
        cluster: true,
      });
    }

    // The draft: the comment being written, as a pin at the clicked spot, above the others and draggable.
    if (state.pending && items.length < FP.LIMITS.overlayItems - 1) {
      const draft = state.dragging && state.dragging.threadId === DRAFT_ID ? dragAnchor(state.dragging) : draftAnchor(state.pending);
      if (draft) {
        const me = state.me || {};
        items.push({ kind: 'pin', id: DRAFT_ID, anchor: draft, label: '+', tone: 'muted', avatarURL: FP.avatar(me.github), active: true, interactive: true, draggable: true, cluster: false });
      }
    }

    // On a page: a small count on each instance of a component that has open threads in its own file
    // (they are pinned inside it). A click on the count opens the component at its first thread.
    state.badges = new Map();
    if (state.pinsVisible && describeFile(state.file).kind !== 'Component') {
      const open = new Map();
      for (const thread of state.all) {
        if (thread.status !== 'open' || describeFile(thread.page).kind !== 'Component') continue;
        const name = thread.page.split('/').pop().replace(/\.astro$/, '');
        open.set(name, [...(open.get(name) || []), thread]);
      }
      for (const node of state.flat) {
        if (state.badges.size >= BADGES_MAX || items.length >= FP.LIMITS.overlayItems - 1) break;
        const threads = node.kind === 'component' ? open.get(node.name) : undefined;
        if (!threads) continue;
        const id = `badge-${state.badges.size}`;
        state.badges.set(id, threads[0]);
        items.push({ kind: 'label', id, anchor: { nodeId: node.id, at: { x: 1, y: 0 } }, text: `${threads.length} inside`, placement: 'top', color: colors.accent, interactive: true });
      }
    }

    // The hover card: the app's own page in an overlay frame beside the hovered pin.
    if (state.hoverCard && !state.dragging && items.length < FP.LIMITS.overlayItems) {
      items.push({ kind: 'frame', id: 'hover-card', anchor: { rect: state.hoverCard.rect }, path: 'hover-card.html' });
    }

    // Optional outlines on every pinned element, dashed.
    if (state.outline) {
      let outline = 0;
      const outlined = new Set();
      for (const thread of shown) {
        if (!thread.nodeId) continue;
        if (items.length >= FP.LIMITS.overlayItems) break;
        if (active && active.id === thread.id) continue;
        const anchor = usesRef(thread) ? { ref: thread.ref } : { nodeId: thread.nodeId };
        const signature = JSON.stringify(anchor);
        if (outlined.has(signature)) continue;
        if (!room(thread.nodeId)) continue;
        outlined.add(signature);
        elements.add(thread.nodeId);
        // Item ids are at most 64 of [A-Za-z0-9_.:-]; a node id is neither bounded so nor so spelled.
        outline += 1;
        items.push({ kind: 'box', id: `outline-${outline}`, anchor, color: `${colors.accent}99`, dashed: true });
      }
    }
    await setOverlay(items.slice(0, FP.LIMITS.overlayItems));
  };

  /**
   * Sends the overlay. Stacki validates the whole list and refuses it whole, so one bad item would hide
   * every pin: a refusal is a programmer error, logged loudly with the items for the developer.
   */
  const setOverlay = async (items) => {
    try {
      const outcome = await stacki.overlay.set({ items });
      if (outcome && outcome.applied === false) console.warn('Feedback pins: overlay.set was not applied:', outcome.reason, items);
    } catch (error) {
      console.warn('Feedback pins: overlay.set was refused:', error && error.message, items);
    }
    window.FP_LAST_OVERLAY = items;
  };

  /** Instance counts drawn at most on a page ("2 inside" on a Footer with threads in Footer.astro). */
  const BADGES_MAX = 8;

  /** The overlay id of the draft pin: never a thread's (`pin-…`). */
  const DRAFT_ID = 'draft';

  /** A pin drag: redrawn on every move, written once when it ends, put back when it is cancelled. */
  const onDrag = async (drag) => {
    const { itemId, phase, nodeId, at, x, y, cancelled } = drag;
    if (itemId === DRAFT_ID) {
      await onDraftDrag(drag);
      return;
    }
    if (typeof itemId !== 'string' || !itemId.startsWith('pin-') || !mayComment()) return;
    const thread = threadOfItem(itemId, state.threads);
    if (!thread || thread.scope || FP.innerRef(thread)) return;
    if (phase !== 'end') {
      state.dragging = { threadId: thread.id, nodeId, at: FP.point(at), x, y };
      await drawOverlay();
      return;
    }
    state.dragging = undefined;
    if (cancelled) {
      await drawOverlay();
      return;
    }
    const where = placementFrom({ nodeId, at, x, y });
    await write(() => store.move({ flat: state.flat, thread, ...where, canKey: state.can.setAttribute, actor: actor() }));
  };

  // The hover card. Its frame is the card plus a margin on every side for the popover shadow; the card
  // reports its own height (overlay.post), so the frame fits the content.
  const HOVER_CARD_WIDTH_PX = 260;
  const HOVER_CARD_MARGIN_PX = 20; // Room for the popover shadow (a 32px blur, 10px down).
  const HOVER_CARD_HEIGHT_PX = 96; // A first guess, until the card says.
  // A pin is a 24px badge above its point, its tail at the point: the card sits clear of it.
  const PIN_SIZE_PX = 24;
  const PIN_GAP_PX = 8;
  const EDGE_PX = 8;
  let hoverTimer;

  /**
   * Where the card goes for a pin at `point`: to the right of the badge, top-aligned with it, flipped
   * to the left near the canvas's right edge and kept inside it vertically.
   */
  const hoverCardRect = (point, heightPx) => {
    const viewportWidth = state.viewport && state.viewport.widthPx ? state.viewport.widthPx : 1280;
    const viewportHeight = state.viewport && state.viewport.heightPx ? state.viewport.heightPx : 800;
    const right = point.x + PIN_SIZE_PX / 2 + PIN_GAP_PX;
    const left = point.x - PIN_SIZE_PX / 2 - PIN_GAP_PX - HOVER_CARD_WIDTH_PX;
    const x = right + HOVER_CARD_WIDTH_PX + EDGE_PX <= viewportWidth ? right : Math.max(EDGE_PX, left);
    const top = point.y - PIN_SIZE_PX - PIN_GAP_PX;
    const y = Math.max(EDGE_PX, Math.min(top, viewportHeight - heightPx - EDGE_PX));
    return {
      x: Math.round(x - HOVER_CARD_MARGIN_PX),
      y: Math.round(y - HOVER_CARD_MARGIN_PX),
      width: HOVER_CARD_WIDTH_PX + HOVER_CARD_MARGIN_PX * 2,
      height: Math.round(heightPx + HOVER_CARD_MARGIN_PX * 2),
    };
  };

  /** The preview the card shows: the first comment, its author, the snapshot. */
  const hoverPreview = (thread) => {
    const first = thread.comments[0];
    return {
      kind: 'preview',
      number: numberOf(thread),
      author: first ? displayName(first) : '',
      agent: first && isAgent(first) ? first.actor.agent.name : undefined,
      github: first ? first.github : undefined,
      avatar: first ? first.avatar : undefined,
      body: first ? first.body : '',
      createdAt: first ? first.createdAt : undefined,
      replies: thread.comments.length - 1,
      snapshot: thread.snapshot,
      scope: scopeLabel(thread.scope) || undefined,
      // Pins can be dragged; the card says so, since a pin looks like a button.
      draggable: mayComment() && !thread.scope && !FP.innerRef(thread),
    };
  };

  /** Shows a hover card for a pin (overlay.hover), or takes it away after a beat when the pointer leaves. */
  const onHover = async ({ itemId }) => {
    clearTimeout(hoverTimer);
    const thread = threadOfItem(itemId, state.threads);
    if (!thread) {
      // A quick pass over pins does not flicker.
      hoverTimer = setTimeout(() => {
        state.hoverCard = undefined;
        void drawOverlay();
      }, 120);
      return;
    }
    if (state.hoverCard && state.hoverCard.threadId === thread.id) return;
    const point = await pinPoint(thread);
    if (!point) return;
    const heightPx = state.hoverCard ? state.hoverCard.heightPx : HOVER_CARD_HEIGHT_PX;
    state.hoverCard = { threadId: thread.id, point, heightPx, rect: hoverCardRect(point, heightPx) };
    await drawOverlay();
  };

  /** The card's messages: `ready` asks for the preview; `height` sizes the frame to the card. */
  const onOverlayMessage = ({ itemId, data }) => {
    if (itemId !== 'hover-card' || !state.hoverCard) return;
    let message;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;
    const thread = state.threads.find((candidate) => candidate.id === state.hoverCard.threadId);
    if (message.kind === 'ready' && thread) {
      void stacki.overlay.post({ itemId: 'hover-card', data: JSON.stringify(hoverPreview(thread)) }).catch(() => {});
    } else if (message.kind === 'height' && Number.isSafeInteger(message.height) && message.height > 0 && message.height <= 600) {
      // A changed item reloads its frame, so the frame is resized only when the height really moved.
      if (Math.abs(message.height - state.hoverCard.heightPx) <= 1) return;
      state.hoverCard = { ...state.hoverCard, heightPx: message.height, rect: hoverCardRect(state.hoverCard.point, message.height) };
      void drawOverlay();
    }
  };

  /** Where a pin points in the canvas viewport: its element's first box and its point within it. */
  const pinPoint = async (thread) => {
    if (thread.nodeId) {
      const byRef = usesRef(thread);
      const answer = await stacki.node.measure(byRef ? { ref: thread.ref } : { nodeId: thread.nodeId }).catch(() => undefined);
      const box = answer && answer.rects && answer.rects[0];
      if (!box) return undefined;
      const at = (byRef ? thread.refAt : thread.at) || { x: 0, y: 0 };
      return { x: box.x + box.width * at.x, y: box.y + box.height * at.y };
    }
    return thread.spot ? { x: thread.spot.x, y: thread.spot.y } : undefined;
  };

  let pulseTimer;
  /** Flashes a pin a few times so the eye finds it: the overlay has no animation, so it is redrawn. */
  const pulse = (threadId) => {
    clearTimeout(pulseTimer);
    state.pulse = { threadId, step: 0 };
    const tick = () => {
      state.pulse.step += 1;
      void drawOverlay();
      if (state.pulse.step < PULSE_STEPS) pulseTimer = setTimeout(tick, PULSE_STEP_MS);
      else state.pulse = { threadId: undefined, step: 0 };
    };
    pulseTimer = setTimeout(tick, PULSE_STEP_MS);
  };

  // --- Comment mode and moving -------------------------------------------------------
  //
  // A pin belongs to the file open on the canvas: a page's node on a page, the component's own node
  // inside a component (entered by double-click or from the Navigator), keyed with node.key in that
  // file. Navigation replaces the old "Pin to" chain: to comment inside a component, go inside it.

  const wantsCapture = () => state.pinMode || state.moving !== undefined;

  let capturing = false;
  /**
   * Brings the capture in line with what the app wants; one request either way. It observes
   * (docs/apps.md, "Observing clicks"): the editor keeps every click (select, double-click into a
   * component, the Navigator, Escape), and the app hears single clicks once the double-click window
   * has passed. A double click never arrives, so entering a component is never a placement.
   */
  const syncCapture = async () => {
    const want = wantsCapture() && state.file !== undefined;
    if (want === capturing) return;
    capturing = want;
    const capture = (params) => stacki.canvas.capture(params).catch((error) => ({ applied: false, reason: error.message }));
    let outcome = await capture(want ? { on: true, mode: 'observe', cursor: CURSOR } : { on: false });
    if (!outcome.applied && want) outcome = await capture({ on: true, mode: 'observe', cursor: CURSOR_FALLBACK });
    if (!outcome.applied && want) {
      capturing = false;
      state.pinMode = false;
      state.moving = undefined;
      render();
      await fail(new Error(outcome.reason));
    }
  };

  const setPinMode = async (on) => {
    // A view-only role never enters comment mode.
    state.pinMode = on && mayComment();
    if (!on) state.pending = undefined;
    render();
    void drawOverlay();
    await syncCapture();
  };

  const startMove = async (threadId) => {
    state.moving = threadId;
    render();
    await syncCapture();
  };

  const cancelMove = async () => {
    state.moving = undefined;
    render();
    await syncCapture();
  };

  const onCanvasClick = async (click) => {
    if (!state.file) return;
    const where = placementFrom(click);
    if (state.moving !== undefined) {
      const thread = state.threads.find((candidate) => candidate.id === state.moving);
      state.moving = undefined;
      // Back to comment mode if it was on, else the canvas is given back.
      await syncCapture();
      if (!thread) return;
      await write(() => store.move({ flat: state.flat, thread, ...where, canKey: state.can.setAttribute, actor: actor() }));
      pulse(thread.id);
      return;
    }
    if (!state.pinMode) return;
    // One draft at a time: a click elsewhere moves it there, and the words typed so far stay.
    placeDraft(where);
    focusField(ui.composeBody);
  };

  /**
   * Starts a draft on the selected element (the Navigator's, or the canvas's), at its centre: the
   * "Comment on selection" button and the C key. Answers whether there was a selection to comment on.
   */
  const commentOnSelection = async () => {
    if (!state.file || !mayComment()) return false;
    const selection = await stacki.selection.get().catch(() => undefined);
    const nodeId = selection && selection.nodeId;
    if (!nodeId || !state.flat.some((node) => node.id === nodeId)) return false;
    placeDraft({ nodeId, at: { x: 0.5, y: 0.5 } });
    if (state.can.scrollTo) void stacki.canvas.scrollTo({ nodeId, block: 'center' }).catch(() => {});
    focusField(ui.composeBody);
    return true;
  };

  /**
   * Leaves comment mode because the person went to another rail panel (panels.change): the capture is
   * released (the "Click to place" chip goes) and the pin button turns off. Words typed stay in the
   * panel with their draft parked off the canvas; the next click or "Comment on selection" puts it
   * back. Nothing comes back on its own.
   */
  const leaveCommentMode = async () => {
    state.pinMode = false;
    state.moving = undefined;
    state.dragging = undefined;
    if (state.pending) {
      if (ui.composeBody.value.trim() === '') state.pending = undefined;
      else state.pending.parked = true;
    }
    render();
    void drawOverlay();
    await syncCapture();
  };

  /** The draft pin's anchor: where the comment being written goes, as it will be stored. */
  const draftAnchor = (pending) => {
    if (pending.parked) return undefined;
    if (pending.nodeId) return pending.at ? { nodeId: pending.nodeId, at: pending.at } : { nodeId: pending.nodeId };
    return pending.spot ? { rect: { x: pending.spot.x, y: pending.spot.y, width: 1, height: 1 } } : undefined;
  };

  /** The draft pin dragged: redrawn on every move, put down where it is let go; the words typed stay. */
  const onDraftDrag = async (drag) => {
    if (!state.pending) return;
    if (drag.phase !== 'end') {
      state.dragging = { threadId: DRAFT_ID, nodeId: drag.nodeId, at: FP.point(drag.at), x: drag.x, y: drag.y };
      await drawOverlay();
      return;
    }
    state.dragging = undefined;
    if (!drag.cancelled) placeDraft(placementFrom(drag));
    await drawOverlay();
  };

  /** Puts the one draft at a placement: a click, a click elsewhere, a draft let go, or the selection. */
  const placeDraft = (placement) => {
    state.pending = { nodeId: placement.nodeId, at: placement.at, spot: placement.spot };
    render();
    void drawOverlay();
  };

  /** Where a click, a drag or a move puts a pin: the open file's element under it, else a spot. */
  const placementFrom = (click) => (click.nodeId ? { nodeId: click.nodeId, at: FP.point(click.at) } : { spot: FP.spot({ x: click.x, y: click.y }) });

  /** A file's flat tree (page.getTree), kept a short while: older matches threads outline from it. */
  const TREE_TTL_MS = 30000;
  const trees = new Map();
  const flatOf = async (file) => {
    const cached = trees.get(file);
    if (cached && Date.now() - cached.at < TREE_TTL_MS) return cached.flat;
    const tree = await stacki.page.getTree({ path: file }).catch(() => undefined);
    const flat = tree && Array.isArray(tree.nodes) ? FP.flatten(tree.nodes) : [];
    trees.set(file, { at: Date.now(), flat });
    return flat;
  };

  /** Template nodes matched at most: a component's own markup, once per node however often a loop renders it. */
  const MATCHES_MAX = 64;

  /** The element nodes of a file's markup like `match` (same tag; the same first class when it has one). */
  const matchesIn = (flat, match) =>
    flat.filter((node) => node.kind === 'element' && node.name === match.tag && (match.class ? node.classes.includes(match.class) : true)).slice(0, MATCHES_MAX);

  // --- Going to a thread ------------------------------------------------------------

  /**
   * Takes the canvas to a thread, wherever it was left (docs/apps.md, "Navigating"): opens its page
   * or enters its component, restores the device it was left at, scrolls its element to the centre
   * (scrollTo waits for the element to be drawn), selects it and pulses its pin.
   */
  const goTo = async (thread) => {
    state.activeId = thread.id;
    state.navigating = thread.id;
    markSeen(thread);
    render();
    try {
      if (!isHere(thread)) {
        // A component comment opens the page it was left on, where its instance is.
        const opened = await openFile(thread.scope && thread.scope.kind === 'component' && thread.scope.page ? thread.scope.page : thread.page);
        if (!opened) return;
        await refresh();
      }
      const here = state.threads.find((candidate) => candidate.id === thread.id);
      if (!here) return;
      await restoreViewport(here.viewport);
      await drawOverlay();
      if (here.nodeId) {
        // An inner pin scrolls to its own copy (the link inside the header's Nav), not the whole instance.
        const target = usesRef(here) ? { ref: here.ref } : { nodeId: here.nodeId };
        if (state.can.scrollTo) await stacki.canvas.scrollTo({ ...target, block: 'center' }).catch(() => {});
        await stacki.selection.set({ nodeId: here.nodeId }).catch(() => {});
      }
      pulse(here.id);
    } finally {
      state.navigating = undefined;
    }
  };

  /**
   * Puts the canvas back at the width the comment was left at ("Desktop 945px" is 945): setWidth where
   * this editor can, else the device class. Comments from before 1.6 may have only the device.
   */
  const restoreViewport = async (viewport) => {
    if (!viewport) return;
    const current = state.viewport || {};
    if (viewport.widthPx && state.can.setWidth && current.widthPx !== viewport.widthPx) {
      const answer = await stacki.canvas.setWidth({ widthPx: Math.min(6000, Math.max(240, viewport.widthPx)) }).catch(() => undefined);
      if (answer) {
        state.viewport = answer;
        return;
      }
    }
    const device = viewport.device;
    if (device && ['desktop', 'tablet', 'phone'].includes(device) && current.device !== device) {
      const answer = await stacki.canvas.setDevice({ device }).catch(() => undefined);
      if (answer) state.viewport = answer;
    }
  };

  /** Opens a page (page.open) or enters a component (component.open); says why when it cannot. */
  const openFile = async (path) => {
    const { kind, name } = describeFile(path);
    const component = kind === 'Component';
    try {
      const outcome = component ? await stacki.component.open({ path }) : await stacki.page.open({ path });
      if (outcome.applied) return true;
      await fail(new Error(`Could not open ${name}: ${outcome.reason}`));
    } catch (error) {
      if (error && error.code === 'role-denied') {
        await fail(new Error(component ? `Your role cannot open components, so ${name} stays closed. Ask an admin.` : `Your role cannot open other pages, so ${name} stays closed. Ask an admin for the Pages panel.`));
      } else {
        await fail(error);
      }
    }
    return false;
  };

  const step = (direction) => {
    const list = visibleThreads();
    if (list.length === 0) return;
    const index = list.findIndex((thread) => thread.id === state.activeId);
    const next = list[index < 0 ? (direction > 0 ? 0 : list.length - 1) : (index + direction + list.length) % list.length];
    void goTo(next);
  };

  /** The next open thread after the current one, across every file: this file first. */
  const nextUnresolved = () => {
    const open = state.all.filter((thread) => thread.status === 'open').map(live);
    const order = [...new Set([state.file, ...open.map((thread) => thread.page).sort()])].filter((file) => file !== undefined);
    const list = order.flatMap((file) => sorted(open.filter((thread) => thread.page === file)));
    if (list.length === 0) {
      void notify('No open threads. Everything is resolved.', 'success');
      return;
    }
    const index = list.findIndex((thread) => thread.id === state.activeId);
    void goTo(list[(index + 1) % list.length]);
  };

  // --- Rendering: header, compose ---------------------------------------------------

  const setTabLabel = (value, text) => {
    const tab = ui.filter.querySelector(`:scope > button[value="${value}"]`);
    if (tab && tab.textContent !== text) tab.textContent = text;
  };

  const renderHead = () => {
    const { kind, name } = describeFile(state.file);
    const all = state.scope === 'all';
    ui.fileIcon.innerHTML = all ? ICONS.pages : state.file ? (kind === 'Component' ? ICONS.component : ICONS.page) : '';
    // The file dropdown: this file by name, or every page. Options are set only when they change.
    const options = [
      { value: 'file', label: name },
      { value: 'all', label: 'All pages' },
    ];
    const signature = JSON.stringify(options);
    if (ui.fileName.dataset.options !== signature) {
      ui.fileName.options = options;
      ui.fileName.dataset.options = signature;
    }
    if (ui.fileName.value !== state.scope) ui.fileName.value = state.scope;
    ui.fileName.title = state.file && !all ? `${kind} · ${state.file}` : '';

    ui.pinMode.setAttribute('aria-label', state.pinMode ? 'Comment mode is on: click the canvas to comment' : 'Comment mode is off');
    ui.commentSelection.hidden = !mayComment();
    setFlag(ui.commentSelection, 'disabled', !state.file || !state.selectedNodeId);
    setFlag(ui.pinMode, 'data-pressed', state.pinMode);
    setFlag(ui.pinMode, 'disabled', !state.file);
    // View only (no `comment` permission): no way to write, and a quiet chip that says so.
    ui.pinMode.hidden = !mayComment();
    ui.viewOnly.hidden = mayComment();

    const pool = state.scope === 'all' ? state.all : state.threads;
    const open = pool.filter((thread) => thread.status === 'open').length;
    const resolved = pool.length - open;
    setTabLabel('open', open > 0 ? `Open ${open}` : 'Open');
    setTabLabel('resolved', resolved > 0 ? `Resolved ${resolved}` : 'Resolved');
    setTabLabel('all', 'All');

    ui.filtersDot.hidden = filtersAreDefault();
    setFlag(ui.filtersReset, 'active', !filtersAreDefault());
  };

  const describeWhere = (where) => {
    const found = where && where.nodeId ? state.flat.find((candidate) => candidate.id === where.nodeId) : undefined;
    return found ? FP.describeTarget(FP.target(state.flat, found)) : `the ${describeFile(state.file).kind.toLowerCase()}`;
  };

  const renderCompose = () => {
    ui.compose.hidden = !state.pending || !state.file;
    ui.moveHint.hidden = state.moving === undefined;
    if (ui.compose.hidden) return;
    ui.composeTarget.textContent = state.pending.parked ? 'Click where it goes, or select an element and press C' : `On ${describeWhere(state.pending)}`;
    const viewport = viewportLabel(state.viewport);
    ui.composeViewport.textContent = viewport ? `· ${viewport}` : '';
    setFlag(ui.composeSubmit, 'disabled', state.working || ui.composeBody.value.trim() === '');
  };

  // --- Rendering: the list ------------------------------------------------------------

  /** One short line when nothing shows: what to do next, or why the list is empty. */
  const emptyLine = () => {
    const all = state.scope === 'all';
    const pool = all ? state.all : state.threads;
    if (all && pool.length === 0) return 'No comments yet.';
    if (!all && !state.file) return 'Open a page or a component to comment on it.';
    if (pool.length === 0) {
      if (!mayComment()) return 'No comments here yet.';
      return state.pinMode ? 'Click anywhere on the canvas to comment.' : 'Turn on comment mode, then click the canvas.';
    }
    if (state.query !== '') return `Nothing matches “${state.query}”.`;
    if (state.who === 'mine') return 'No threads of yours here.';
    if (state.who === 'mentions') return 'No one has mentioned you here.';
    if (state.who === 'agents') return 'No comments from coding agents here.';
    if (state.filter === 'resolved') return 'Nothing resolved yet.';
    return 'All resolved. Nice.';
  };

  /** A comment's words, with each @mention picked out (and yours on a soft fill). */
  const commentText = (body) => {
    const text = element('div', 'comment-text');
    const mine = myHandles();
    const pattern = /(^|[^A-Za-z0-9._-])(@[A-Za-z0-9][A-Za-z0-9._-]{0,38})/g;
    let last = 0;
    let match;
    let guard = 0;
    while ((match = pattern.exec(body)) !== null && guard < 200) {
      guard += 1;
      const start = match.index + match[1].length;
      text.append(body.slice(last, start));
      const handle = match[2];
      text.append(element('span', `mention${mine.includes(handle.slice(1).toLowerCase()) ? ' is-me' : ''}`, handle));
      last = start + handle.length;
    }
    text.append(body.slice(last));
    return text;
  };

  const renderReactions = (thread, comment) => {
    const row = element('div', 'reactions');
    const canReact = Boolean(state.me.id) && !state.working;
    for (const emoji of FP.REACTIONS) {
      const ids = comment.reactions[emoji] || [];
      if (ids.length === 0) continue;
      const mine = ids.includes(state.me.id);
      if (!mayComment()) {
        // View only: the counts show, as text; there is nothing to press.
        const count = element('span', `reaction${mine ? ' is-mine' : ''}`);
        count.append(emoji, element('span', '', String(ids.length)));
        row.append(count);
        continue;
      }
      const chip = element('button', `reaction${mine ? ' is-mine' : ''}`);
      chip.type = 'button';
      chip.disabled = !canReact;
      chip.title = mine ? (ids.length === 1 ? 'You reacted' : `You and ${plural(ids.length - 1, 'other', 'others')}`) : plural(ids.length, 'person', 'people');
      chip.append(emoji, element('span', '', String(ids.length)));
      chip.addEventListener('click', () => void write(() => store.toggleReaction({ thread, commentId: comment.id, emoji, personId: state.me.id })));
      row.append(chip);
    }
    if (state.reacting === comment.id) {
      const picker = element('div', 'reaction-picker');
      for (const emoji of FP.REACTIONS) {
        const choice = element('button', '', emoji);
        choice.type = 'button';
        choice.setAttribute('aria-label', `React ${emoji}`);
        choice.addEventListener('click', () => {
          state.reacting = undefined;
          void write(() => store.toggleReaction({ thread, commentId: comment.id, emoji, personId: state.me.id }));
        });
        picker.append(choice);
      }
      row.append(picker);
    } else if (canReact && mayComment()) {
      const add = element('button', 'reaction add', '☺︎ +');
      add.type = 'button';
      add.setAttribute('aria-label', 'Add a reaction');
      add.addEventListener('click', () => {
        state.reacting = comment.id;
        renderList();
      });
      row.append(add);
    }
    return row;
  };

  const byline = (comment, time) => {
    const line = element('div', 'byline');
    line.append(FP.avatarElement(comment), element('span', 'who-name', displayName(comment)));
    if (isAgent(comment)) line.append(agentBadge(comment.actor));
    line.append(element('span', 'time', time));
    return line;
  };

  const renderComment = (thread, comment, index) => {
    const row = element('div', 'comment');
    const meta = byline(comment, FP.ago(comment.createdAt));
    if (comment.editedAt) meta.append(element('span', 'edited', 'edited'));
    row.append(meta);

    if (state.editing === comment.id) {
      const edit = element('div', 'edit');
      const field = kit('stacki-textarea', { rows: 3, label: 'Edit comment', value: comment.body });
      const actions = element('div', 'actions');
      const save = kit('stacki-button', { variant: 'primary', label: 'Save', disabled: state.working });
      const cancel = kit('stacki-button', { variant: 'ghost', label: 'Cancel' });
      const stop = () => {
        state.editing = undefined;
        renderList();
      };
      const commit = () =>
        void write(async () => {
          await store.editComment({ thread, commentId: comment.id, body: field.value, actor: actor() });
          state.editing = undefined;
        });
      save.addEventListener('click', commit);
      cancel.addEventListener('click', stop);
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          commit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          stop();
        }
      });
      FP.attachMentions(field, people);
      actions.append(save, cancel);
      edit.append(field, actions);
      row.append(edit);
      focusField(field);
      return row;
    }

    row.append(commentText(comment.body), renderReactions(thread, comment));

    // Edit and delete your own; `moderate` edits anyone's, `delete-any-comment` deletes anyone's.
    const mine = isMine(comment);
    const actions = element('div', 'comment-actions');
    if (mayComment() && (mine || mayModerate())) {
      const edit = kit('stacki-button', { variant: 'ghost', icon: 'edit', 'aria-label': 'Edit comment', disabled: state.working });
      edit.addEventListener('click', () => {
        state.editing = comment.id;
        renderList();
      });
      actions.append(edit);
    }
    if (index > 0 && (mine || mayDeleteAny())) {
      const remove = kit('stacki-button', { class: 'delete-button', variant: 'ghost', icon: 'trash', 'aria-label': 'Delete comment', disabled: state.working });
      remove.addEventListener('click', () => void write(() => store.removeComment({ thread, commentId: comment.id, actor: actor() })));
      actions.append(remove);
    }
    if (actions.childElementCount > 0) meta.append(actions);
    return row;
  };

  const renderThreadBody = (thread) => {
    const body = element('div', 'thread-body');
    const here = isHere(thread);

    if (here && !placed(thread)) {
      const note = element('div', 'note');
      note.append(element('p', '', 'Detached: its element is gone, so the pin is hidden.'));
      if (mayComment()) {
        const reattach = kit('stacki-button', { variant: 'ghost', label: state.moving === thread.id ? 'Cancel' : 'Re-attach', disabled: state.working });
        reattach.addEventListener('click', () => void (state.moving === thread.id ? cancelMove() : startMove(thread.id)));
        note.append(reattach);
      }
      body.append(note);
    }
    if (thread.snapshot) {
      // The element as it looked when the thread was started (canvas.snapshot).
      body.append(FP.snapshotImage(thread.snapshot, FP.LIMITS.snapshotWidthPx, `${FP.describeTarget(thread.target)} when this thread was started`));
    }

    thread.comments.slice(1).forEach((comment, index) => body.append(renderComment(thread, comment, index + 1)));

    if (thread.status === 'resolved') {
      const by = thread.resolvedBy ? ` by ${thread.resolvedBy}` : '';
      body.append(element('p', 'note', `Resolved${by}${thread.resolvedAt ? ` · ${FP.ago(thread.resolvedAt)}` : ''}`));
    }
    if (!here) {
      const { kind, name } = describeFile(thread.page);
      const note = element('div', 'note');
      note.append(element('p', '', `On the ${kind.toLowerCase()} ${name}.`));
      const open = kit('stacki-button', { variant: 'ghost', label: `Open ${kind.toLowerCase()}` });
      open.addEventListener('click', () => void goTo(thread));
      note.append(open);
      body.append(note);
    }

    const reply = element('div', 'reply');
    const draft = state.drafts.get(thread.id) || '';
    const field = kit('stacki-textarea', { rows: 2, label: 'Reply', placeholder: 'Reply… @ to mention', value: draft, 'data-thread': thread.id });
    const actions = element('div', 'actions');
    const send = kit('stacki-button', { variant: 'primary', label: 'Reply', disabled: state.working || draft.trim() === '' });
    const submit = () => {
      const text = field.value.trim();
      if (text === '') return;
      void write(async () => {
        await store.addComment({ thread, comment: FP.comment({ ...signature(), body: text }) });
        state.drafts.delete(thread.id);
      });
    };
    field.addEventListener('input', () => {
      state.drafts.set(thread.id, field.value);
      setFlag(send, 'disabled', state.working || field.value.trim() === '');
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
      }
    });
    FP.attachMentions(field, people);
    send.addEventListener('click', submit);
    if (mayComment()) {
      reply.append(field);
      actions.append(send);
    }

    // Resolving is this app's `resolve-threads` permission.
    if (mayResolve()) {
      const status = kit('stacki-button', { label: thread.status === 'resolved' ? 'Reopen' : 'Resolve', disabled: state.working });
      status.addEventListener('click', () => void toggleResolved(thread));
      actions.append(status);
    }
    actions.append(element('span', 'spacer'));

    // A pin moves on the canvas it sits on (or is dragged there), so Move is offered only in its own file.
    if (here && placed(thread) && mayComment() && !thread.scope && !FP.innerRef(thread)) {
      const moving = state.moving === thread.id;
      const move = kit('stacki-button', { variant: 'ghost', label: moving ? 'Cancel move' : 'Move', disabled: state.working });
      move.addEventListener('click', () => void (moving ? cancelMove() : startMove(thread.id)));
      actions.append(move);
    }

    if ((thread.comments[0] && isMine(thread.comments[0])) || mayDeleteAny()) {
      const remove = kit('stacki-button', { class: 'delete-button', variant: 'ghost', icon: 'trash', 'aria-label': 'Delete thread', disabled: state.working });
      // Never the browser's confirm(): an in-app popover on the trash button (confirm.js).
      remove.addEventListener('click', async () => {
        const replies = thread.comments.length - 1;
        const sure = await FP.confirmAction({
          anchor: remove,
          title: 'Delete this thread?',
          message: `${replies > 0 ? `Its ${plural(replies, 'reply goes', 'replies go')} with it. ` : ''}It's hidden for everyone and kept in the project's history.`,
          confirmLabel: 'Delete',
          tone: 'danger',
        });
        if (sure) void write(() => store.removeThread({ thread, actor: actor() }));
      });
      actions.append(remove);
    }

    reply.append(actions);
    // A view-only role with neither resolve nor delete has no actions: no empty row.
    if (reply.querySelector('stacki-button, stacki-textarea')) body.append(reply);
    return body;
  };

  /** The muted line under a thread: its number, where it is, replies, the device it was left at. */
  const metaLine = (thread) => {
    const line = element('div', 'meta-line');
    const parts = [`#${numberOf(thread)}`];
    if (thread.scope) parts.push(scopeLabel(thread.scope));
    // A pin inside a component instance names what it is on: "On NavLink", "On link in NavLink".
    if (FP.innerRef(thread) && thread.refName) parts.push(`On ${thread.refName}`);
    const replies = thread.comments.length - 1;
    if (replies > 0) parts.push(plural(replies, 'reply', 'replies'));
    const viewport = viewportLabel(thread.viewport);
    if (viewport) parts.push(viewport);
    line.append(parts.join(' · '));
    if (isHere(thread) && !placed(thread)) line.append(' · ', element('span', 'is-missing', 'Detached'));
    const latest = activitySummary(thread);
    if (latest) {
      line.append(' · ', element('span', latest.outside ? 'outside-mark' : thread.status === 'resolved' && latest.action === 'resolve' ? 'resolved-mark' : '', latest.text));
    } else if (thread.status === 'resolved') {
      line.append(' · ', element('span', 'resolved-mark', 'Resolved'));
    }
    // The whole log, newest first, on hover.
    if ((thread.activity || []).length > 0) line.title = [...thread.activity].reverse().slice(0, 20).map(activityText).join('\n');
    return line;
  };

  const ACTION_VERBS = { comment: 'Commented', reply: 'Replied', resolve: 'Resolved', reopen: 'Reopened', edit: 'Edited', delete: 'Deleted a comment', move: 'Moved' };

  /** One log entry as a line: "Resolved by Timothy's agent (Claude) · 2m", or "Edited outside Stacki · 2m". */
  const activityText = (entry) => {
    if (entry.note === 'outside' || entry.actor.kind === 'unknown') return `${ACTION_VERBS[entry.action]} outside Stacki · ${FP.ago(entry.at)}`;
    const agent = entry.actor.kind === 'agent' ? ` (${entry.actor.agent.name})` : '';
    return `${ACTION_VERBS[entry.action]} by ${FP.actorLabel(entry.actor)}${agent} · ${FP.ago(entry.at)}`;
  };

  /** The entry worth a line in the list: the newest that is not the thread's own comments and replies by people. */
  const activitySummary = (thread) => {
    const notable = (thread.activity || []).filter((entry) => !['comment', 'reply'].includes(entry.action) || entry.note === 'outside');
    const entry = notable[notable.length - 1];
    if (!entry) return undefined;
    return { action: entry.action, outside: entry.note === 'outside', text: activityText(entry) };
  };

  const renderThread = (thread) => {
    const active = thread.id === state.activeId;
    const card = element('article', 'thread');
    card.dataset.thread = thread.id;
    if (thread.nodeId) card.dataset.node = thread.nodeId;
    card.classList.toggle('is-active', active);
    card.classList.toggle('is-resolved', thread.status === 'resolved');
    card.classList.toggle('is-hovered', Boolean(thread.nodeId) && thread.nodeId === state.hoveredNodeId);

    const head = element('button', 'thread-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(active));
    const first = thread.comments[0];
    if (first) {
      const line = byline(first, FP.ago(active ? first.createdAt : thread.updatedAt));
      if (isUnread(thread)) {
        const dot = element('span', 'unread');
        dot.title = 'Unread';
        line.append(dot);
      }
      head.append(line);
      if (active) head.append(commentText(first.body));
      else head.append(element('div', 'preview', first.body));
    }
    head.append(metaLine(thread));
    head.addEventListener('click', () => {
      if (active) {
        state.activeId = undefined;
        render();
        void drawOverlay();
      } else {
        void goTo(thread);
      }
    });
    card.append(head);
    if (active) card.append(renderThreadBody(thread));
    return card;
  };

  /** A file's heading in the All pages view: its icon, its name and how many threads show under it. */
  const fileTitle = (path, count) => {
    const { kind, name } = describeFile(path);
    const title = element('div', 'file-title');
    title.title = path;
    const icon = element('span', 'file-icon');
    icon.innerHTML = kind === 'Component' ? ICONS.component : ICONS.page;
    title.append(icon, element('span', 'file-title-name', name), element('span', 'file-title-count', String(count)));
    return title;
  };

  const renderList = () => {
    // A re-render must not take the caret out of a reply being typed.
    const focused = document.activeElement && document.activeElement.closest('stacki-textarea[data-thread]');
    const focusedThread = focused ? focused.getAttribute('data-thread') : undefined;

    ui.list.textContent = '';
    // Entries that could not be read are left exactly as they are; the panel only says so.
    if (store.invalid.length > 0) {
      const notice = element('p', 'note invalid-note', `${plural(store.invalid.length, 'comment', 'comments')} couldn’t be read.`);
      notice.title = store.invalid.map((entry) => `${entry.key}: ${entry.reason}`).join('\n');
      ui.list.append(notice);
    }
    const list = groups();
    if (list.every((group) => group.threads.length === 0)) {
      // With a comment being written, the compose box says enough.
      if (!state.pending) ui.list.append(element('p', 'empty', emptyLine()));
      return;
    }
    for (const group of list) {
      if (state.scope === 'all') ui.list.append(fileTitle(group.file, group.threads.length));
      for (const thread of group.threads) ui.list.append(renderThread(thread));
    }
    if (focusedThread) focusField(ui.list.querySelector(`stacki-textarea[data-thread="${focusedThread}"]`));
    const activeCard = state.activeId ? ui.list.querySelector(`[data-thread="${state.activeId}"]`) : undefined;
    if (activeCard) activeCard.scrollIntoView({ block: 'nearest' });
  };

  const render = () => {
    renderHead();
    renderCompose();
    renderList();
    renderMenu();
  };

  // --- The ⋯ menu and the filters popover ----------------------------------------------

  /** Closes the filters popover; the ⋯ menu is the kit's and closes itself. */
  const closePopovers = () => {
    ui.filters.hidden = true;
    ui.filtersToggle.setAttribute('aria-expanded', 'false');
  };

  /** Keeps the ⋯ menu's rows in step: its checks, and "Your name" only when Stacki knows none. */
  const renderMenu = () => {
    const row = (value) => ui.more.querySelector(`:scope > button[value="${value}"]`);
    const check = (value, on) => {
      const button = row(value);
      if (button && button.getAttribute('checked') !== String(on)) button.setAttribute('checked', String(on));
    };
    check('pins', state.pinsVisible);
    check('outline', state.outline);
    const name = row('name');
    if (needsName() && !name) {
      const button = document.createElement('button');
      button.value = 'name';
      button.textContent = 'Your name…';
      row('shortcuts').before(button);
    } else if (!needsName() && name) {
      name.remove();
    }
  };

  /** A ⋯ menu row chosen (the kit's `select` event). */
  const onMenu = (value) => {
    if (value === 'pins') setPinsVisible(!state.pinsVisible);
    else if (value === 'outline') setOutline(!state.outline);
    else if (value === 'next') nextUnresolved();
    else if (value === 'export') ui.exportSheet.showModal();
    else if (value === 'import') {
      ui.importSheet.showModal();
      focusField(ui.importBody);
    } else if (value === 'name') {
      ui.name.value = state.localName;
      ui.nameSheet.showModal();
      focusField(ui.name);
    } else if (value === 'shortcuts') ui.keysSheet.showModal();
    renderMenu();
  };

  // --- Actions --------------------------------------------------------------------

  const toggleResolved = async (thread) => {
    // Checked again at the moment of acting, as the guide asks: the switch may have changed since render.
    const allowed = typeof stacki.role.can === 'function' ? await stacki.role.can({ permission: 'resolve-threads' }).catch(() => mayResolve()) : mayResolve();
    if (!allowed) {
      await fail(new Error('Your role cannot resolve threads. An admin can allow it in Settings, Roles.'));
      return;
    }
    const resolved = thread.status === 'resolved';
    await write(() => store.setStatus({ thread, status: resolved ? 'open' : 'resolved', author: signature().author, actor: actor() }));
  };

  /**
   * A thumbnail of the element for a new thread (canvas.snapshot, Desktop only, `can.snapshot`).
   * Skipped when it would not fit: past the thumbnail bound, or once project storage is nearly full.
   */
  const snapshotOf = async (target) => {
    if (!target || !state.can.snapshot) return undefined;
    if (store.bytes > FP.LIMITS.storageBytesForSnapshots) return undefined;
    // Taken at the screen's pixel ratio, so it is sharp at its natural CSS size; Stacki caps it at 800.
    const scale = Math.min(FP.LIMITS.snapshotScaleMax, Math.max(1, window.devicePixelRatio || 1));
    const widthMax = Math.min(800, Math.round(FP.LIMITS.snapshotWidthPx * scale));
    const outcome = await stacki.canvas.snapshot({ ...target, widthMax }).catch(() => undefined);
    if (!outcome || !outcome.applied) return undefined;
    return FP.snapshot({ url: outcome.url, width: outcome.width, height: outcome.height, scale });
  };

  const pin = () => {
    const body = ui.composeBody.value.trim();
    const where = state.pending;
    if (body === '' || !where || !state.file) return;
    // A parked draft (another panel, another file) has its words but no place yet.
    if (where.parked || (where.nodeId && !state.flat.some((node) => node.id === where.nodeId))) {
      void notify('Click the canvas, or select an element and press C, to place this comment.', 'info');
      return;
    }
    if (state.all.length >= FP.LIMITS.threads) {
      void fail(new Error(`The project holds at most ${FP.LIMITS.threads} threads. Delete resolved ones first.`));
      return;
    }
    void write(async () => {
      // The draft's own placement, so the real pin lands exactly where the draft was: no jump.
      const placement = where.nodeId ? { nodeId: where.nodeId, at: where.at } : { spot: where.spot };
      const thread = await store.create({
        flat: state.flat,
        page: state.file,
        ...placement,
        comment: FP.comment({ ...signature(), body }),
        canKey: state.can.setAttribute,
        viewport: state.viewport,
        snapshot: await snapshotOf(placement.nodeId ? { nodeId: placement.nodeId } : undefined),
      });
      ui.composeBody.value = '';
      state.pending = undefined;
      state.filter = 'open';
      ui.filter.value = 'open';
      if (thread) {
        state.activeId = thread.id;
        state.seen[thread.id] = FP.now();
      }
      // Ready for the next one: comment mode stays on, or comes back if Escape left it while typing.
      if (!state.pinMode) await setPinMode(true);
    });
  };

  const cancelCompose = () => {
    state.pending = undefined;
    ui.composeBody.value = '';
    render();
    void drawOverlay(); // The chosen element's box goes with the comment.
  };

  // --- Export and import ---------------------------------------------------------------

  const exportFormat = () => (FP.EXPORT_FORMATS[ui.exportFormat.value] ? ui.exportFormat.value : 'markdown');

  const exportText = async () => {
    const stored = await store.listAll();
    if (exportFormat() === 'json') return FP.exportText('json', stored);
    const visible = stored
      .filter((thread) => !thread.deletedAt)
      .map((thread) => ({ ...thread, comments: thread.comments.filter((comment) => !comment.deletedAt) }))
      .filter((thread) => thread.comments.length > 0);
    return FP.exportText(exportFormat(), visible);
  };

  /** Writes the export into the project with the files API: one undo step on Desktop. */
  const exportSave = async () => {
    const path = ui.exportPath.value.trim().replace(/^\/+/, '');
    if (path === '' || path.includes('..')) {
      await fail(new Error('Choose a path inside the project, such as feedback/feedback.md.'));
      return;
    }
    try {
      const outcome = await stacki.files.write({ path, content: await exportText(), label: 'Export feedback' });
      if (!outcome.applied) throw new Error(outcome.reason);
      ui.exportSheet.close();
      await notify(`Saved ${path}.`, 'success');
    } catch (error) {
      const denied = error && error.code === 'role-denied';
      await fail(denied ? new Error('Your role cannot write project files (code:edit). Use Copy or Download.') : error);
    }
  };

  /** Copies through Stacki (clipboard.write): the sandboxed frame cannot write the clipboard itself. */
  const exportCopy = async () => {
    try {
      await stacki.clipboard.write({ text: (await exportText()).slice(0, 262144) });
      ui.exportSheet.close();
      await notify('Copied to the clipboard.', 'success');
    } catch (error) {
      await fail(error);
    }
  };

  const exportDownload = async () => {
    const format = FP.EXPORT_FORMATS[exportFormat()];
    const url = URL.createObjectURL(new Blob([await exportText()], { type: format.type }));
    ui.download.href = url;
    ui.download.download = `feedback.${format.extension}`;
    ui.download.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    ui.exportSheet.close();
  };

  const importJson = async () => {
    let file;
    try {
      file = JSON.parse(ui.importBody.value);
    } catch {
      await fail(new Error('That is not JSON.'));
      return;
    }
    const threads = file && Array.isArray(file.threads) ? file.threads : [];
    if (threads.length === 0) {
      await fail(new Error('No threads in that file.'));
      return;
    }
    ui.importSheet.close();
    await write(async () => {
      const result = await store.importThreads({ threads });
      ui.importBody.value = '';
      await notify(`${result.added} imported${result.skipped > 0 ? `, ${result.skipped} over the limit skipped` : ''}.`, 'success');
    });
  };

  // --- Local preferences (this person, this computer) ------------------------------

  let nameTimer;
  const saveName = (value) => {
    state.localName = value.trim().slice(0, FP.LIMITS.nameChars);
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => {
      const work = state.localName === '' ? stacki.storage.remove({ key: 'me/name', scope: 'local' }) : stacki.storage.set({ key: 'me/name', value: state.localName, scope: 'local' });
      void work.catch(() => {});
    }, 400);
  };

  const savePref = (key, on) => void stacki.storage.set({ key, value: on ? 'on' : 'off', scope: 'local' }).catch(() => {});

  const setPinsVisible = (on) => {
    state.pinsVisible = on;
    savePref('prefs/pins-shown', on);
    void drawOverlay();
  };

  const setOutline = (on) => {
    state.outline = on;
    savePref('prefs/outline', on);
    void drawOverlay();
  };

  const applyTheme = (view) => {
    const tokens = view && view.tokens;
    if (!tokens) return;
    const hex = (value, fallback) => (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim()) ? value.trim() : fallback);
    // Fills append an alpha byte, so the accent must be the six-digit form.
    const six = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(hex(value, '')) ? value.trim() : fallback);
    state.colors = {
      accent: six(tokens.accent, DEFAULT_COLORS.accent),
      accentText: tokens['accent-text'] === 'white' ? '#ffffff' : hex(tokens['accent-text'], DEFAULT_COLORS.accentText),
      success: hex(tokens.success, DEFAULT_COLORS.success),
      panel: hex(tokens['bg-panel'], DEFAULT_COLORS.panel),
      text: hex(tokens.text, DEFAULT_COLORS.text),
    };
    void drawOverlay();
  };

  const applyRole = (role) => {
    if (!role) return;
    state.role = {
      name: typeof role.name === 'string' ? role.name : '',
      isAdmin: role.isAdmin === true,
      permissions: role.permissions && typeof role.permissions === 'object' ? role.permissions : {},
    };
  };

  const setFilters = (next) => {
    state.who = ['mine', 'mentions', 'agents'].includes(next.who) ? next.who : 'everyone';
    state.sort = ['newest', 'oldest'].includes(next.sort) ? next.sort : 'page';
    ui.who.value = state.who;
    ui.sort.value = state.sort;
    render();
    void drawOverlay();
  };

  /** This page or all pages (the header's file dropdown), remembered for this person on this computer. */
  const setView = (scope, { remember }) => {
    state.scope = scope === 'all' ? 'all' : 'file';
    if (remember) void stacki.storage.set({ key: 'prefs/view', value: state.scope, scope: 'local' }).catch(() => {});
    render();
    void drawOverlay();
  };

  const toggleSearch = (on) => {
    ui.searchRow.hidden = !on;
    setFlag(ui.searchToggle, 'data-pressed', on);
    if (on) {
      focusField(ui.search);
    } else if (state.query !== '') {
      state.query = '';
      ui.search.value = '';
      const field = ui.search.querySelector('input');
      if (field) field.value = '';
      renderList();
      void drawOverlay();
    }
  };

  // --- Keyboard: J/K move, Enter goes to the pin, R reply, E resolve, C comment mode -------

  const typing = (target) => Boolean(target && target.closest && target.closest('input, textarea, [contenteditable], dialog[open]'));

  document.addEventListener('keydown', (event) => {
    // Escape on the canvas is the editor's (it leaves a component); in this panel it cancels the draft.
    if (event.key === 'Escape' && ui.filters.hidden && state.pending && !event.defaultPrevented && !typing(event.target)) {
      cancelCompose();
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && !ui.filters.hidden) {
      // Escape closes a popover first; Stacki's Escape (leaving comment mode) comes next press.
      closePopovers();
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
    const key = event.key.toLowerCase();
    const active = state.all.find((thread) => thread.id === state.activeId);
    if (key === 'j') step(1);
    else if (key === 'k') step(-1);
    else if (key === 'enter' && active) void goTo(active);
    else if (key === 'r' && active && mayComment()) focusField(ui.list.querySelector(`stacki-textarea[data-thread="${active.id}"]`));
    else if (key === 'e' && active && mayResolve()) void toggleResolved(active);
    else if (key === 'c' && state.file && mayComment()) void commentOnSelection();
    else if (key === '/') toggleSearch(true);
    else return;
    event.preventDefault();
  });

  // A click anywhere outside a popover closes it.
  document.addEventListener('pointerdown', (event) => {
    const inside = event.target.closest && event.target.closest('.anchor, .stacki-kit-layer');
    if (!inside) closePopovers();
  });

  // --- Wiring ---------------------------------------------------------------------

  // The kit has no filter icon: the filter button is our own, with its own glyph and dot.
  ui.filtersToggle.insertAdjacentHTML('afterbegin', ICONS.filter);

  ui.pinMode.addEventListener('click', () => void setPinMode(!state.pinMode));
  ui.commentSelection.addEventListener('click', () => void commentOnSelection());
  ui.more.addEventListener('select', (event) => onMenu(event.detail && event.detail.value));
  ui.filtersToggle.addEventListener('click', () => {
    const open = ui.filters.hidden;
    ui.filters.hidden = !open;
    ui.filtersToggle.setAttribute('aria-expanded', String(open));
  });
  ui.searchToggle.addEventListener('click', () => toggleSearch(ui.searchRow.hidden));
  ui.search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      toggleSearch(false);
    }
  });

  FP.attachMentions(ui.composeBody, people);
  ui.composeSubmit.addEventListener('click', pin);
  ui.composeCancel.addEventListener('click', cancelCompose);
  ui.composeBody.addEventListener('input', renderCompose);
  ui.composeBody.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      pin();
    } else if (event.key === 'Escape') {
      // Escape in the field drops the comment only; comment mode stays on for the next one.
      event.preventDefault();
      cancelCompose();
    }
  });

  ui.filter.addEventListener('change', () => {
    state.filter = ui.filter.value;
    render();
    void drawOverlay();
  });
  ui.fileName.addEventListener('change', () => {
    if (ui.fileName.value !== state.scope) setView(ui.fileName.value, { remember: true });
  });
  ui.who.addEventListener('change', () => setFilters({ who: ui.who.value, sort: state.sort }));
  ui.sort.addEventListener('change', () => setFilters({ who: state.who, sort: ui.sort.value }));
  ui.filtersReset.addEventListener('reset', () => setFilters(FILTER_DEFAULTS));
  ui.search.addEventListener('input', (event) => {
    state.query = (event.target && typeof event.target.value === 'string' ? event.target.value : '').trim().slice(0, 200);
    renderList();
    void drawOverlay();
  });

  ui.name.addEventListener('input', () => saveName(ui.name.value));
  $('name-done').addEventListener('click', () => ui.nameSheet.close());
  $('keys-done').addEventListener('click', () => ui.keysSheet.close());

  ui.exportFormat.addEventListener('change', () => {
    const extension = FP.EXPORT_FORMATS[exportFormat()].extension;
    ui.exportPath.value = ui.exportPath.value.replace(/\.[A-Za-z]+$/, '') + `.${extension}`;
  });
  $('export-save').addEventListener('click', () => void exportSave());
  $('export-copy').addEventListener('click', () => void exportCopy());
  $('export-download').addEventListener('click', () => void exportDownload());
  $('export-cancel').addEventListener('click', () => ui.exportSheet.close());
  $('import-cancel').addEventListener('click', () => ui.importSheet.close());
  $('import-run').addEventListener('click', () => void importJson());

  // --- Stacki events --------------------------------------------------------------

  let refreshTimer;
  let refreshFromOther = false;
  const later = (options = {}) => {
    refreshFromOther = refreshFromOther || Boolean(options.fromOther);
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      const fromOther = refreshFromOther;
      refreshFromOther = false;
      void refresh({ fromOther }).then(syncCapture);
    }, 200);
  };

  stacki.on('selection.change', ({ nodeId }) => {
    state.selectedNodeId = nodeId;
    setFlag(ui.commentSelection, 'disabled', !state.file || !nodeId);
    // Selecting a pinned element opens its thread, as clicking its pin does.
    const thread = nodeId === undefined ? undefined : state.threads.find((candidate) => candidate.nodeId === nodeId);
    if (thread && thread.id !== state.activeId && matchesFilter(thread)) {
      state.activeId = thread.id;
      markSeen(thread);
      render();
      void drawOverlay();
    }
  });
  // Hovering an element on the canvas lights up its threads in the list.
  stacki.on('hover.change', ({ nodeId }) => {
    state.hoveredNodeId = nodeId;
    for (const card of ui.list.querySelectorAll('.thread')) card.classList.toggle('is-hovered', nodeId !== undefined && card.dataset.node === nodeId);
  });
  stacki.on('canvas.change', (viewport) => {
    state.viewport = viewport;
    renderCompose();
  });
  // Another page, or a component entered on the canvas: its threads, its file in the header.
  stacki.on('page.change', () => {
    // Going inside a component (or to another page): typed words stay, parked until placed in the new file.
    state.pending = state.pending && ui.composeBody.value.trim() !== '' ? { parked: true } : undefined;
    state.selectedNodeId = undefined;
    state.moving = undefined;
    if (state.scope === 'file' && !state.navigating) state.activeId = undefined;
    later();
  });
  stacki.on('project.change', ({ source }) => {
    if (source === 'page' || source === 'files') later();
  });
  stacki.on('storage.change', ({ scope, origin }) => {
    // Our own writes are read back already; a teammate's or a pull's arrive here, with notices.
    if (scope === 'project' && origin === 'other') later({ fromOther: true });
  });
  stacki.on('overlay.drag', (drag) => void onDrag(drag));
  stacki.on('overlay.hover', (hover) => void onHover(hover));
  stacki.on('overlay.message', onOverlayMessage);
  stacki.on('overlay.click', ({ itemId }) => {
    const badged = state.badges && state.badges.get(itemId);
    if (badged) {
      void goTo(badged);
      return;
    }
    const thread = threadOfItem(itemId, state.all);
    if (thread) void goTo(thread);
  });
  stacki.on('canvas.click', (where) => void onCanvasClick(where));
  // Another rail panel opened (a docked app hides while it shows): leave comment mode for good.
  stacki.on('panels.change', (panels) => {
    if (panels && panels.left !== 'apps' && (state.pinMode || state.moving !== undefined || state.pending)) void leaveCommentMode();
  });
  stacki.on('canvas.capture', ({ on, reason }) => {
    // Our own call either way ('app') is already in hand. Observing, Escape stays the editor's; another
    // app taking the canvas ('replaced') ends comment mode and any move; the comment icon brings it back.
    if (on || reason === 'app') return;
    capturing = false;
    state.pinMode = false;
    state.moving = undefined;
    // The draft goes too, unless words are typed: they stay, parked off the canvas.
    if (state.pending && ui.composeBody.value.trim() === '') state.pending = undefined;
    else if (state.pending) state.pending.parked = true;
    render();
    void drawOverlay();
  });
  stacki.on('command.run', ({ id }) => {
    if (id === 'new-comment' && mayComment()) void setPinMode(true);
    else if (id === 'toggle-pins') setPinsVisible(!state.pinsVisible);
    else if (id === 'next-unresolved') nextUnresolved();
  });
  stacki.on('role.change', (role) => {
    // An admin changed this role's switches for the app, or the role itself changed: live, no reload.
    applyRole(role);
    if (!mayComment()) {
      state.pending = undefined;
      state.moving = undefined;
      state.editing = undefined;
      state.reacting = undefined;
      void setPinMode(false);
    }
    void registerCommands();
    render();
    void drawOverlay();
  });
  stacki.on('person.change', (person) => {
    if (person) state.me = { id: person.id, name: person.name, github: person.github };
    render();
  });
  stacki.on('theme.change', applyTheme);

  /**
   * "New comment" is registered while the app runs and only for a role that may comment, so a
   * view-only role never sees it in the palette. The manifest keeps the two commands everyone has.
   */
  const NEW_COMMENT = { id: 'new-comment', title: 'Feedback: new comment', shortcut: 'Mod+Alt+Shift+1', panel: 'compose' };
  const registerCommands = async () => {
    await stacki.commands.register({ commands: mayComment() ? [NEW_COMMENT] : [] }).catch(() => {});
  };

  // --- Boot -----------------------------------------------------------------------

  (async () => {
    const local = (key) => stacki.storage.get({ key, scope: 'local' }).catch(() => undefined);
    const [info, role, person, theme, viewport, name, pinsPref, outlinePref, viewPref, seen, seenSince, notifiedSince, members] = await Promise.all([
      stacki.app.info().catch(() => undefined),
      stacki.role.get().catch(() => undefined),
      stacki.person.get().catch(() => undefined),
      stacki.ui.theme().catch(() => undefined),
      stacki.canvas.getViewport().catch(() => undefined),
      local('me/name'),
      local('prefs/pins-shown'),
      local('prefs/outline'),
      local('prefs/view'),
      local('seen/threads'),
      local('seen/since'),
      local('notify/since'),
      stacki.people.list().catch(() => []),
    ]);
    state.members = (Array.isArray(members) ? members : []).slice(0, FP.LIMITS.people).filter((member) => member && (member.login || member.name));
    // What this editor can do: durable keys and the old-pin move write attributes; snapshots are Desktop's.
    state.can.setAttribute = Boolean(info && info.can && info.can.setAttribute);
    state.can.scrollTo = !(info && info.can && info.can.scrollTo === false);
    state.can.snapshot = Boolean(info && info.can && info.can.snapshot);
    state.can.setWidth = Boolean(info && info.can && info.can.setWidth);
    applyRole(role);
    if (person) state.me = { id: person.id, name: person.name, github: person.github };
    applyTheme(theme);
    state.viewport = viewport;
    state.localName = name && typeof name.value === 'string' ? name.value.slice(0, FP.LIMITS.nameChars) : '';
    // On unless this person turned them off from the menu: a missing or unknown value shows them.
    state.pinsVisible = !(pinsPref && pinsPref.value === 'off');
    state.outline = Boolean(outlinePref && outlinePref.value === 'on');
    state.scope = viewPref && viewPref.value === 'all' ? 'all' : 'file';

    // Read state: a first run counts everything before it as read, so the list does not start all blue.
    try {
      const parsed = seen && typeof seen.value === 'string' ? JSON.parse(seen.value) : {};
      state.seen = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      state.seen = {};
    }
    const since = Number(seenSince && seenSince.value);
    state.seenSince = Number.isSafeInteger(since) && since > 0 ? since : FP.now();
    if (!(since > 0)) void stacki.storage.set({ key: 'seen/since', value: String(state.seenSince), scope: 'local' }).catch(() => {});
    const notified = Number(notifiedSince && notifiedSince.value);
    state.notifiedSince = Number.isSafeInteger(notified) && notified > 0 ? notified : FP.now();

    // The app opens in comment mode, for a role that may comment: the next canvas click places one.
    state.pinMode = mayComment();
    void registerCommands();
    // What arrived while the app was closed (a pull, a teammate in Studio) is announced once.
    await refresh({ fromOther: Number.isSafeInteger(notified) && notified > 0 });
    await syncCapture();
    await repairRoleAuthors();
  })();
})();

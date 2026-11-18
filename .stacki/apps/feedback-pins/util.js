// Shared helpers: the thread shape and its parser, page-tree lookups, and the
// compact form older versions wrote into a `data-feedback` attribute (read only,
// to move those pins into project storage). Loaded before the store and the app.
window.FP = window.FP || {};

(() => {
  const FP = window.FP;

  FP.LIMITS = {
    /** One overlay holds at most 64 items and 64 distinct elements (docs/apps.md, "Canvas overlays"). */
    overlayItems: 64,
    overlayElements: 64,
    bodyChars: 2000,
    commentsPerThread: 200,
    /** Project storage keeps at most 1,000 keys per app; a few are left for anything else. */
    threads: 990,
    nameChars: 60,
    githubChars: 39,
    /** An overlay label holds at most 120 characters. */
    labelChars: 120,
    /** Reactions offered, and people per reaction: bounded so a thread stays well under 256 KiB. */
    reactionsPerEmoji: 64,
    mentionsPerComment: 16,
    /** People the mention picker lists. */
    people: 200,
    /** Threads remembered as read, per person. */
    seen: 990,
    /**
     * A thread's element snapshot, as a PNG data URL. Stacki allows 256 KiB per value and 4 MiB per
     * app, so a thumbnail is 240 CSS pixels wide (taken at the screen's pixel ratio, so it is sharp),
     * skipped past 120,000 characters, and none is added once the project's threads take 3 MiB.
     */
    snapshotWidthPx: 240,
    /** At most 3× the CSS width, and Stacki's own cap of 800 pixels. */
    snapshotScaleMax: 3,
    snapshotChars: 120000,
    storageBytesForSnapshots: 3 * 1024 * 1024,
    /** Activity entries kept per thread: the newest, so a long-lived thread stays bounded. */
    activity: 200,
    agentNameChars: 40,
    agentModelChars: 80,
  };

  /**
   * The thread schema, written into every thread as `schemaVersion` (AGENTS.md documents it for coding
   * agents). Version 1 had no field; a version newer than this app's is left alone, never rewritten.
   */
  FP.SCHEMA_VERSION = 2;

  /** What the activity log records. */
  FP.ACTIONS = ['comment', 'reply', 'resolve', 'reopen', 'edit', 'delete', 'move'];

  /**
   * Thread and comment ids: 1 to 56 letters, digits, `.`, `_` and `-`, starting with a letter or digit.
   * Agents generate `t_` (or `c_`) and 12 hex characters. Never `:`, which overlay item ids use to
   * number a scoped comment's pins.
   */
  FP.ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,55}$/;

  /**
   * Where a comment applies when its element is a component instance. Absent: this instance only.
   * `section`: every instance of the component in one section of the page; `page`: every instance on
   * the page; `component`: every instance across the site, and the component file itself.
   * `site` is read for threads saved before 1.6.2 and means the same as `component`: every instance
   * on every page is the component, so the two were one choice under two names.
   */
  FP.SCOPES = ['section', 'page', 'site', 'component', 'matches'];

  /**
   * `matches` (1.7.4): every element of one component's own markup that matches the one pinned, by
   * its tag and first class (`{ tag: 'a', class: 'footer_link' }`), in the instance clicked
   * (`within: 'instance'`) or in every instance (`within: 'all'`). `component.path` is the file
   * whose markup is matched.
   */
  const WITHIN = ['instance', 'all'];

  /** A thread's scope, parsed: `{ kind, component: { name, path? }, page, section?: { key?, target? } }`. */
  FP.scope = (raw) => {
    if (!raw || typeof raw !== 'object' || !FP.SCOPES.includes(raw.kind)) return undefined;
    const component = raw.component && typeof raw.component === 'object' ? raw.component : {};
    const name = text(component.name, 64);
    if (!name) return undefined;
    const path = text(component.path, 512) || undefined;
    const section = raw.section && typeof raw.section === 'object' ? raw.section : undefined;
    const sectionKey = section ? text(section.key, 32) || undefined : undefined;
    const sectionTarget = section && section.target && typeof section.target === 'object' ? FP.normalise({ target: section.target }).target : undefined;
    if (raw.kind === 'section' && !sectionKey && !sectionTarget) return undefined;
    const match = raw.match && typeof raw.match === 'object' ? raw.match : {};
    const matchTag = text(match.tag, 64);
    if (raw.kind === 'matches' && (!matchTag || !path)) return undefined;
    return {
      kind: raw.kind === 'site' ? 'component' : raw.kind,
      component: { name, path },
      page: text(raw.page, 512) || undefined,
      section: raw.kind === 'section' ? { key: sectionKey, target: sectionTarget } : undefined,
      match: raw.kind === 'matches' ? { tag: matchTag, class: text(match.class, 64) || undefined } : undefined,
      within: raw.kind === 'matches' ? (WITHIN.includes(raw.within) ? raw.within : 'instance') : undefined,
    };
  };

  /** Each node's parent, by id, from a page tree. Iterative and bounded like flatten. */
  FP.parents = (nodes) => {
    const parents = new Map();
    const stack = [...(nodes || [])].map((node) => [node, undefined]);
    let count = 0;
    while (stack.length > 0 && count < 20000) {
      const [node, parent] = stack.pop();
      count += 1;
      if (parent) parents.set(node.id, parent);
      for (const child of node.children || []) stack.push([child, node]);
    }
    return parents;
  };

  /** Every node under `node`, itself excluded, depth first and bounded. */
  FP.descendants = (node) => FP.flatten(node.children || []);

  /** The reactions a comment offers, in order. */
  FP.REACTIONS = ['👍', '❤️', '🎉', '👀', '✅'];

  /** The handle a person is mentioned by: their GitHub login, else their name without spaces. */
  FP.handle = (person) => {
    const github = person && typeof person.github === 'string' ? person.github.trim() : '';
    if (github) return github;
    const name = person && typeof person.name === 'string' ? person.name : person && typeof person.author === 'string' ? person.author : '';
    return name.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 39);
  };

  /** The `@handle` tokens of a comment body, lowercased, unique and bounded. */
  FP.mentionsIn = (body) => {
    const found = new Set();
    const pattern = /(^|[^A-Za-z0-9._-])@([A-Za-z0-9][A-Za-z0-9._-]{0,38})/g;
    let match;
    let guard = 0;
    while ((match = pattern.exec(String(body))) !== null && guard < 200) {
      guard += 1;
      found.add(match[2].toLowerCase());
      if (found.size >= FP.LIMITS.mentionsPerComment) break;
    }
    return [...found];
  };

  /** A snapshot is a PNG data URL within the size bound, or nothing. */
  FP.snapshot = (raw) => {
    if (typeof raw !== 'object' || raw === null || typeof raw.url !== 'string') return undefined;
    if (!raw.url.startsWith('data:image/png;base64,') || raw.url.length > FP.LIMITS.snapshotChars) return undefined;
    const width = Number.isSafeInteger(raw.width) && raw.width > 0 && raw.width <= 800 ? raw.width : undefined;
    const height = Number.isSafeInteger(raw.height) && raw.height > 0 && raw.height <= 4000 ? raw.height : undefined;
    // Device pixels per CSS pixel when it was taken: it shows at width / scale, its natural CSS size.
    const scale = Number.isFinite(raw.scale) && raw.scale >= 1 && raw.scale <= FP.LIMITS.snapshotScaleMax ? raw.scale : 1;
    return { url: raw.url, width, height, scale };
  };

  const DEVICES = ['desktop', 'tablet', 'phone', 'custom', 'canvas'];
  /** Where a comment was left: the canvas device and width at the time, so navigating can restore it. */
  FP.viewport = (raw) => {
    if (!raw || typeof raw !== 'object') return undefined;
    const device = DEVICES.includes(raw.device) ? raw.device : undefined;
    const widthPx = Number.isSafeInteger(raw.widthPx) && raw.widthPx > 0 && raw.widthPx <= 10000 ? raw.widthPx : undefined;
    if (!device && !widthPx) return undefined;
    return { device, widthPx };
  };

  FP.KEY_ATTRIBUTE = 'data-stacki-key';
  FP.LEGACY_ATTRIBUTE = 'data-feedback';

  FP.uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

  FP.now = () => Date.now();

  /** Every node of a page tree, depth first, as a flat list. Iterative, so a deep page cannot overflow the stack. */
  FP.flatten = (nodes) => {
    const out = [];
    const stack = [...(nodes || [])].reverse();
    while (stack.length > 0 && out.length < 20000) {
      const node = stack.pop();
      out.push(node);
      const children = node.children || [];
      for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
    }
    return out;
  };

  /** What an element looks like, so a pin without a durable key can find it again after an edit. */
  FP.signature = (node) => [node.kind, node.name || '', (node.classes || []).join('.'), (node.text || '').trim().slice(0, 48)].join('|');

  /** The signature plus which copy of it this is: two identical cards stay apart. */
  FP.target = (flat, node) => {
    const signature = FP.signature(node);
    let index = 0;
    for (const other of flat) {
      if (other.id === node.id) break;
      if (FP.signature(other) === signature) index += 1;
    }
    return {
      kind: node.kind,
      name: node.name || '',
      classes: (node.classes || []).slice(0, 8),
      text: (node.text || '').trim().slice(0, 48),
      index,
    };
  };

  /**
   * The node id a thread sits on in the open page: the element carrying its durable key, else the
   * element that matches its stored target. Node ids never outlive a session, so none is stored.
   */
  FP.resolve = (flat, thread) => {
    if (thread.key) {
      const keyed = flat.find((node) => node.attributes && node.attributes[FP.KEY_ATTRIBUTE] === thread.key);
      if (keyed) return keyed.id;
    }
    const target = thread.target;
    if (!target) return undefined;
    const wanted = [target.kind, target.name || '', (target.classes || []).join('.'), (target.text || '').trim().slice(0, 48)].join('|');
    const matches = flat.filter((node) => FP.signature(node) === wanted);
    if (matches.length > 0) return (matches[target.index] || matches[0]).id;
    // An element described by hand (a coding agent): its tag or component name, classes it has (a subset
    // is enough) and words it contains; kind is optional. The index picks among the matches.
    const loose = flat.filter((node) => FP.describes(target, node));
    if (loose.length === 0) return undefined;
    return (loose[target.index || 0] || loose[0]).id;
  };

  /** An element's own words: its text, else the text of its direct text children. */
  FP.nodeText = (node) =>
    (node.text || (node.children || []).filter((child) => child.kind === 'text').map((child) => child.text || '').join(' ')).replace(/\s+/g, ' ').trim();

  /** Whether a hand-written element description fits a node. */
  FP.describes = (target, node) => {
    if (node.kind === 'text' || node.kind === 'expr') return false;
    if (target.kind && target.kind !== node.kind) return false;
    if (!target.name || target.name.toLowerCase() !== (node.name || '').toLowerCase()) return false;
    const classes = node.classes || [];
    if (!(target.classes || []).every((name) => classes.includes(name))) return false;
    const words = (target.text || '').trim().toLowerCase();
    return words === '' || FP.nodeText(node).toLowerCase().includes(words);
  };

  /** How an element reads in the panel: `section.hero`, `Button`, `"Build faster"`. */
  FP.describeTarget = (target) => {
    if (!target) return 'the page';
    if (target.kind === 'text') return `"${(target.text || '').trim().slice(0, 28) || 'text'}"`;
    const classes = (target.classes || [])
      .slice(0, 2)
      .map((name) => `.${name}`)
      .join('');
    return `${target.name || target.kind}${classes}`;
  };

  FP.ago = (ms) => {
    const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (seconds < 45) return 'now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  /** A point within an element's box, 0–1 each way, as canvas.click reports it. */
  FP.point = (raw) => {
    if (!raw || typeof raw !== 'object') return undefined;
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };

  /** A spot in the canvas viewport, for a pin on markup no page element owns. */
  FP.spot = (raw) => {
    if (!raw || typeof raw !== 'object') return undefined;
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    return { x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)) };
  };

  /** A ref names at most 32 steps (docs/apps.md, "Node refs"); a loop copy is counted from 0. */
  const REF_STEPS_MAX = 32;
  const REF_COPY_MAX = 10000;

  /**
   * A Stacki node ref, `{ steps: [{ file, key?, nodeId?, copy? }] }`: the open page's element first,
   * then each element down to the one pinned, inside component instances too. Each step names its
   * element by key, id or both. Undefined when it is not one.
   */
  FP.ref = (raw) => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps)) return undefined;
    if (raw.steps.length === 0 || raw.steps.length > REF_STEPS_MAX) return undefined;
    const steps = [];
    for (const step of raw.steps) {
      if (!step || typeof step !== 'object') return undefined;
      const file = text(step.file, 512);
      const key = text(step.key, 32) || undefined;
      const nodeId = text(step.nodeId, 128) || undefined;
      if (!file) return undefined;
      if (!key && !nodeId) return undefined;
      const copy = Number.isSafeInteger(step.copy) && step.copy > 0 && step.copy <= REF_COPY_MAX ? step.copy : undefined;
      steps.push({ file, key, nodeId, copy });
    }
    return { steps };
  };

  /** A pin inside a component instance: its ref goes past the open page's own element. */
  FP.innerRef = (thread) => Boolean(thread && thread.ref && thread.ref.steps.length > 1);

  /** The anchor for a pin by its ref: that one copy, at the clicked point of its own box. */
  FP.refAnchor = (thread) => (thread.refAt ? { ref: thread.ref, at: thread.refAt } : { ref: thread.ref });

  /** Where a pin is drawn: a point anchor on its element, else a spot on the page. */
  FP.anchorOf = (thread, nodeId) => {
    if (nodeId) return thread.at ? { nodeId, at: thread.at } : { nodeId };
    if (thread.spot) return { rect: { x: thread.spot.x, y: thread.spot.y, width: 1, height: 1 } };
    return undefined;
  };

  /** Asks Stacki for the element's durable key; undefined where this editor cannot write one. */
  FP.mintKey = async (nodeId) => {
    try {
      const outcome = await stacki.node.key({ nodeId });
      return outcome && outcome.applied ? outcome.key : undefined;
    } catch {
      return undefined;
    }
  };

  const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const time = (value) => (Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : undefined);

  FP.comment = ({ author, github, by, body, actor }) => ({
    id: FP.uid('c'),
    /** Who wrote it: a person in the app, or an agent for a person. */
    actor: FP.actor(actor) || { kind: 'human', person: { id: by, login: github, name: author, avatar: FP.avatar(github) } },
    mentions: FP.mentionsIn(body),
    author: text(author, FP.LIMITS.nameChars) || 'Anonymous',
    /** The GitHub login person.get gave, so a comment keeps its face. */
    github: text(github, FP.LIMITS.githubChars) || undefined,
    /** person.get's id: stable per person and project, so "Mine" works when details are hidden. */
    by: text(by, 128) || undefined,
    /** The author's picture, kept with the comment so it shows for everyone, in any editor. */
    avatar: FP.avatar(text(github, FP.LIMITS.githubChars)),
    body: text(body, FP.LIMITS.bodyChars),
    createdAt: FP.now(),
  });

  /**
   * GitHub's avatar host serves a person's picture by login, with no redirect (github.com/<login>.png
   * redirects here). Images may load from any HTTPS address, so this needs no `network` entry.
   */
  FP.avatar = (login, size = 64) => (login ? `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=${size}` : undefined);

  /** A stored avatar URL is GitHub's avatar host over HTTPS, or nothing. */
  const AVATAR_PREFIX = 'https://avatars.githubusercontent.com/';
  FP.avatarURL = (raw) => (typeof raw === 'string' && raw.startsWith(AVATAR_PREFIX) && raw.length <= 200 && !/\s/.test(raw) ? raw : undefined);

  /** `{ emoji: [personId, …] }` for the offered emoji only, each list unique and bounded. */
  const parseReactions = (raw) => {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const emoji of FP.REACTIONS) {
      const people = Array.isArray(raw[emoji]) ? raw[emoji] : [];
      const clean = [...new Set(people.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 128))].slice(0, FP.LIMITS.reactionsPerEmoji);
      if (clean.length > 0) out[emoji] = clean;
    }
    return out;
  };

  /** A snapshot image shown at its natural CSS size, never wider than `maxWidthPx`. */
  FP.snapshotImage = (snapshot, maxWidthPx, alt) => {
    const image = document.createElement('img');
    image.className = 'snapshot';
    image.src = snapshot.url;
    image.alt = alt;
    if (snapshot.width && snapshot.height) {
      const width = Math.min(maxWidthPx, Math.round(snapshot.width / snapshot.scale));
      image.width = width;
      image.height = Math.round((snapshot.height / snapshot.width) * width);
    }
    return image;
  };

  /**
   * An avatar: the initial on a soft fill, with the GitHub picture laid over it. The initial shows
   * until the picture loads and stays if it fails, so the circle is never empty. Not lazy: a frame
   * that is hidden or docked may never be told it is visible.
   */
  FP.avatarElement = ({ author, github, avatar }) => {
    const mark = document.createElement('span');
    mark.className = 'avatar';
    mark.textContent = (author || github || '?').replace(/^@/, '').trim().charAt(0).toUpperCase();
    const url = FP.avatarURL(avatar) || FP.avatar(github);
    if (!url) return mark;
    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove());
    mark.append(image);
    return mark;
  };

  /**
   * Who did something: a person in the app (`human`), a coding agent working for a person (`agent`),
   * or nobody known (`unknown`: a change that arrived from outside Stacki with no actor).
   */
  FP.actor = (raw) => {
    if (!raw || typeof raw !== 'object') return undefined;
    const kind = ['human', 'agent', 'unknown'].includes(raw.kind) ? raw.kind : undefined;
    if (!kind) return undefined;
    const source = raw.person && typeof raw.person === 'object' ? raw.person : {};
    const person = {
      id: text(source.id, 128) || undefined,
      login: text(source.login, FP.LIMITS.githubChars) || undefined,
      name: text(source.name, FP.LIMITS.nameChars) || undefined,
      avatar: FP.avatarURL(source.avatar) || FP.avatar(text(source.login, FP.LIMITS.githubChars)),
    };
    if (kind !== 'agent') return { kind, person };
    const agent = raw.agent && typeof raw.agent === 'object' ? raw.agent : {};
    const name = text(agent.name, FP.LIMITS.agentNameChars);
    // An agent with no name is not an agent we can show: the actor is unknown instead of guessed.
    if (!name) return { kind: 'unknown', person };
    return { kind, person, agent: { name, model: text(agent.model, FP.LIMITS.agentModelChars) || undefined } };
  };

  /** A person's short name: the first word of their name, else their login. */
  FP.firstName = (person) => {
    const name = person && (person.name || person.login);
    return name ? name.split(/\s+/)[0] : 'Someone';
  };

  /** How an actor reads in the panel: "Timothy Ricks", "Timothy's agent", "Outside Stacki". */
  FP.actorLabel = (actor) => {
    if (!actor || actor.kind === 'unknown') return 'Outside Stacki';
    if (actor.kind === 'agent') return `${FP.firstName(actor.person)}’s agent`;
    return actor.person.name || actor.person.login || 'Someone';
  };

  /** One activity entry, or undefined when it cannot be read. */
  const parseActivity = (raw) => {
    if (!raw || typeof raw !== 'object' || !FP.ACTIONS.includes(raw.action)) return undefined;
    const at = time(raw.at);
    const actor = FP.actor(raw.actor);
    if (!at || !actor) return undefined;
    const commentId = text(raw.commentId, 64) || undefined;
    const note = raw.note === 'outside' ? 'outside' : undefined;
    return { action: raw.action, at, actor, commentId, note };
  };

  /**
   * A thread read back from storage, checked strictly: anything that is not a thread this app can
   * show (no id, no file, no readable comment, a newer schema) answers `{ error }` and is left as it is.
   */
  FP.parseThread = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'not an object' };
    const version = raw.schemaVersion === undefined ? 1 : raw.schemaVersion;
    if (!Number.isSafeInteger(version) || version < 1) return { error: 'schemaVersion is not a whole number' };
    if (version > FP.SCHEMA_VERSION) return { error: `schemaVersion ${version} is newer than this app` };
    if (typeof raw.id !== 'string' || !FP.ID_PATTERN.test(raw.id)) return { error: 'id is missing or not letters, digits, ., _ and -' };
    if (typeof raw.page !== 'string' || raw.page.trim() === '') return { error: 'page (the file path) is missing' };
    if (!Array.isArray(raw.comments)) return { error: 'comments is not a list' };
    const readable = raw.comments.filter((comment) => comment && typeof comment === 'object' && typeof comment.body === 'string' && comment.body.trim() !== '');
    if (readable.length === 0) return { error: 'no comment has a body' };
    return { thread: FP.normalise({ ...raw, comments: readable }) };
  };

  /** The parser for anything read back — project storage, an import file, a legacy attribute. */
  FP.normalise = (raw, fallback = {}) => {
    const source = raw && typeof raw === 'object' ? raw : {};
    const comments = (Array.isArray(source.comments) ? source.comments : [])
      .slice(0, FP.LIMITS.commentsPerThread)
      .filter((comment) => comment && typeof comment === 'object')
      .map((comment) => {
        // An agent writes `actor`; the app also keeps author, github, by and avatar, which older versions read.
        const actor = FP.actor(comment.actor);
        const person = actor ? actor.person : {};
        const github = text(comment.github, FP.LIMITS.githubChars) || person.login;
        return {
          id: text(comment.id, 64) || FP.uid('c'),
          actor: actor || { kind: 'human', person: { id: text(comment.by, 128) || undefined, login: github, name: text(comment.author, FP.LIMITS.nameChars) || undefined } },
          author: text(comment.author, FP.LIMITS.nameChars) || person.name || person.login || 'Anonymous',
          github,
          by: text(comment.by, 128) || person.id,
          avatar: FP.avatarURL(comment.avatar) || person.avatar || FP.avatar(github),
          body: text(comment.body, FP.LIMITS.bodyChars),
          createdAt: time(comment.createdAt) || FP.now(),
          editedAt: time(comment.editedAt),
          deletedAt: time(comment.deletedAt),
          mentions: FP.mentionsIn(text(comment.body, FP.LIMITS.bodyChars)),
          reactions: parseReactions(comment.reactions),
        };
      })
      .sort((a, b) => a.createdAt - b.createdAt);
    const createdAt = time(source.createdAt) || comments[0]?.createdAt || FP.now();
    const target = source.target && typeof source.target === 'object' ? source.target : fallback.target;
    const page = text(source.page, 512) || fallback.page || '';
    const key = text(source.key, 32) || fallback.key || undefined;
    const at = FP.point(source.at) || fallback.at || undefined;
    // Pins from before 1.7.0 have only the page's element: a keyed one reads as a one-step ref.
    const storedRef = FP.ref(source.ref) || FP.ref(fallback.ref);
    const ref = storedRef || (key ? { steps: [{ file: page, key }] } : undefined);
    return {
      id: text(source.id, 64).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 56) || FP.uid('t'),
      page,
      /** The durable handle node.key writes on the open page's element, when this Stacki could write one. */
      key,
      /** The point on the open page's element (the instance that holds an inner pin). */
      at,
      /** The element pinned, as a Stacki ref: inside component instances too (1.7.0). */
      ref,
      /** The point on the ref's own box. */
      refAt: FP.point(source.refAt) || fallback.refAt || (storedRef ? undefined : at),
      /** What the pin is on, as the "On …" line named it: "NavLink", "link in NavLink". */
      refName: text(source.refName, 64) || fallback.refName || undefined,
      spot: FP.spot(source.spot) || fallback.spot || undefined,
      target: target
        ? {
            // Optional for agents: an element description can leave the kind out.
            kind: text(target.kind, 32) || undefined,
            name: text(target.name, 64),
            classes: (Array.isArray(target.classes) ? target.classes : []).slice(0, 8).map((name) => text(name, 64)),
            text: text(target.text, 48),
            index: Number.isSafeInteger(target.index) && target.index >= 0 ? target.index : 0,
          }
        : undefined,
      status: source.status === 'resolved' ? 'resolved' : 'open',
      createdAt,
      updatedAt: time(source.updatedAt) || comments[comments.length - 1]?.createdAt || createdAt,
      resolvedAt: time(source.resolvedAt),
      resolvedBy: text(source.resolvedBy, FP.LIMITS.nameChars) || undefined,
      /** The canvas device and width the thread was left at. */
      viewport: FP.viewport(source.viewport) || fallback.viewport || undefined,
      /** A thumbnail of the element when the thread was started (canvas.snapshot, Desktop). */
      snapshot: FP.snapshot(source.snapshot) || fallback.snapshot || undefined,
      /** Where the comment applies, for a component instance; absent means this instance only. */
      scope: FP.scope(source.scope) || fallback.scope || undefined,
      /** A soft delete: the thread stays in storage, with its log, and is hidden. */
      deletedAt: time(source.deletedAt),
      activity: (Array.isArray(source.activity) ? source.activity : [])
        .map(parseActivity)
        .filter((entry) => entry)
        .sort((a, b) => a.at - b.at)
        .slice(-FP.LIMITS.activity),
      comments,
    };
  };

  /** Reads the compact form version 1.0 wrote into a `data-feedback` attribute. */
  FP.unpack = (value, fallback) => {
    let packed;
    try {
      packed = JSON.parse(value);
    } catch {
      return undefined;
    }
    if (!packed || typeof packed !== 'object') return undefined;
    return FP.normalise(
      {
        id: packed.i,
        status: packed.s === 'r' ? 'resolved' : 'open',
        createdAt: packed.t,
        at: Array.isArray(packed.p) ? { x: packed.p[0], y: packed.p[1] } : undefined,
        key: packed.k,
        resolvedAt: packed.d,
        resolvedBy: packed.y,
        comments: (Array.isArray(packed.c) ? packed.c : []).map((comment) => ({
          id: comment && comment.i,
          author: comment && comment.a,
          github: comment && comment.g,
          body: comment && comment.b,
          createdAt: comment && comment.t,
        })),
      },
      fallback,
    );
  };

  /** One thread as it is stored and exported: everything but session state. */
  FP.serialise = (thread) => ({
    schemaVersion: FP.SCHEMA_VERSION,
    id: thread.id,
    page: thread.page,
    key: thread.key,
    at: thread.at,
    ref: thread.ref,
    refAt: thread.refAt,
    refName: thread.refName,
    spot: thread.spot,
    target: thread.target,
    status: thread.status,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    resolvedAt: thread.resolvedAt,
    resolvedBy: thread.resolvedBy,
    viewport: thread.viewport,
    snapshot: thread.snapshot,
    scope: thread.scope,
    deletedAt: thread.deletedAt,
    activity: thread.activity || [],
    comments: thread.comments,
  });

  /** An activity entry, appended to a thread's log; the log keeps its newest entries. */
  FP.logged = (thread, entry) => ({
    ...thread,
    activity: [...(thread.activity || []), { action: entry.action, at: entry.at || FP.now(), actor: entry.actor, commentId: entry.commentId, note: entry.note }]
      .sort((a, b) => a.at - b.at)
      .slice(-FP.LIMITS.activity),
  });

  /** The file an export writes and an import reads. */
  FP.toFile = (threads) => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    threads: threads.map(FP.serialise),
  });
})();

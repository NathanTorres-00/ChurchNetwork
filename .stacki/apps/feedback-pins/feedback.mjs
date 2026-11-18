#!/usr/bin/env node
// Feedback pins for coding agents: list, add, reply, resolve, reopen and delete comments in the
// project's storage file, `.stacki/app-data/feedback-pins.json`, the same file the app reads.
//
// Why a tool: each thread is stored as a JSON string inside Stacki's storage file, so editing it by
// hand means escaping JSON inside JSON, and one malformed value makes Stacki refuse the whole file.
// This script reads the file, validates every thread it touches, appends to the thread's activity
// log, and writes the file back as Stacki does (sorted keys, two-space JSON, atomic rename).
// It needs Node 18 or newer and nothing else. See AGENTS.md beside it.
//
//   node .stacki/apps/feedback-pins/feedback.mjs list [--file src/pages/index.astro] [--status open|resolved|all] [--json]
//   node .stacki/apps/feedback-pins/feedback.mjs add --file src/pages/index.astro --tag a --class button --text "Get started" --body "…" --agent Claude [--model …]
//   node .stacki/apps/feedback-pins/feedback.mjs reply --thread t_… --body "…" --agent Claude
//   node .stacki/apps/feedback-pins/feedback.mjs resolve --thread t_… --agent Claude
//   node .stacki/apps/feedback-pins/feedback.mjs reopen --thread t_… --agent Claude
//   node .stacki/apps/feedback-pins/feedback.mjs delete --thread t_… [--comment c_…] --agent Claude
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SCHEMA_VERSION = 2;
const FILE = '.stacki/app-data/feedback-pins.json';
const LIMITS = { keys: 1000, valueBytes: 256 * 1024, fileBytes: 4 * 1024 * 1024, body: 2000, comments: 200, activity: 200 };
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,55}$/;
const SCOPES = ['section', 'page', 'site', 'component', 'matches'];

const fail = (message) => {
  process.stderr.write(`feedback: ${message}\n`);
  process.exit(1);
};

/** `--name value` pairs; `--class` may repeat. */
const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const options = { class: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (!flag.startsWith('--')) fail(`unexpected argument ${flag}`);
    const name = flag.slice(2);
    if (name === 'json') {
      options.json = true;
      continue;
    }
    const value = rest[index + 1];
    if (value === undefined) fail(`${flag} needs a value`);
    index += 1;
    if (name === 'class') options.class.push(value);
    else options[name] = value;
  }
  return { command, options };
};

/**
 * A Stacki node ref from `--ref`: JSON `{ "steps": [{ "file", "key"?, "nodeId"?, "copy"? }] }`, 1 to 32
 * steps, the page's own element first (in `file`), each naming its element by key or id or both.
 */
const parseRef = (source, file) => {
  let raw;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    return fail(`--ref is not JSON (${error.message})`);
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps)) fail('--ref is { "steps": [ … ] }');
  if (raw.steps.length < 1 || raw.steps.length > 32) fail('--ref has 1 to 32 steps');
  const steps = raw.steps.map((step, index) => {
    if (!step || typeof step !== 'object') fail(`--ref step ${index} is not an object`);
    if (typeof step.file !== 'string' || step.file.trim() === '' || step.file.length > 512) fail(`--ref step ${index} needs "file", a path from the project root`);
    const key = typeof step.key === 'string' && step.key.trim() !== '' ? step.key.trim().slice(0, 32) : undefined;
    const nodeId = typeof step.nodeId === 'string' && step.nodeId.trim() !== '' ? step.nodeId.trim().slice(0, 128) : undefined;
    if (!key && !nodeId) fail(`--ref step ${index} needs "key" or "nodeId"`);
    if (step.copy !== undefined && !(Number.isSafeInteger(step.copy) && step.copy >= 0 && step.copy <= 10000)) fail(`--ref step ${index}: "copy" is a whole number from 0`);
    return { file: step.file.trim(), ...(key ? { key } : {}), ...(nodeId ? { nodeId } : {}), ...(step.copy > 0 ? { copy: step.copy } : {}) };
  });
  if (steps[0].file !== file) fail(`--ref starts at the page's own element: its first step's file is ${file}`);
  return { steps };
};

/** `x,y`, each from 0 to 1. */
const parsePoint = (source, flag) => {
  const parts = String(source).split(',').map(Number);
  if (parts.length !== 2 || parts.some((value) => !(value >= 0 && value <= 1))) fail(`${flag} is x,y with each from 0 to 1, such as 0.5,0.5`);
  return { x: parts[0], y: parts[1] };
};

/** The project root: the nearest folder upwards that holds `.stacki/`. */
const projectRoot = () => {
  let folder = process.cwd();
  for (let depth = 0; depth < 32; depth += 1) {
    if (existsSync(join(folder, '.stacki'))) return folder;
    const parent = dirname(folder);
    if (parent === folder) break;
    folder = parent;
  }
  return fail('no .stacki folder here or above: run this inside a Stacki project');
};

const readStore = (path) => {
  if (!existsSync(path)) return new Map();
  const source = readFileSync(path, 'utf8');
  let file;
  try {
    file = JSON.parse(source);
  } catch (error) {
    return fail(`${FILE} is not valid JSON (${error.message}); fix it before writing`);
  }
  if (!file || file.version !== 1 || typeof file.values !== 'object' || file.values === null) fail(`${FILE} is not a Stacki storage file (version 1)`);
  const values = new Map();
  for (const [key, value] of Object.entries(file.values)) {
    if (typeof value !== 'string') fail(`${FILE}: the value of ${key} is not a string; Stacki would refuse the whole file`);
    values.set(key, value);
  }
  return values;
};

/** Writes the file as Stacki's serializer does, beside the old one, then renames it over. */
const writeStore = (path, values) => {
  if (values.size > LIMITS.keys) fail(`storage holds at most ${LIMITS.keys} keys`);
  const sorted = {};
  for (const key of [...values.keys()].sort()) {
    if (Buffer.byteLength(values.get(key)) > LIMITS.valueBytes) fail(`${key} is over ${LIMITS.valueBytes} bytes`);
    sorted[key] = values.get(key);
  }
  const text = `${JSON.stringify({ version: 1, values: sorted }, undefined, 2)}\n`;
  if (Buffer.byteLength(text) > LIMITS.fileBytes) fail(`storage would pass ${LIMITS.fileBytes} bytes`);
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, path);
};

const git = (root, ...args) => {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
};

/** The agent and the person it works for. A GitHub login is used when given; nothing is invented. */
const agentActor = (root, options) => {
  if (!options.agent) fail('--agent is required: the name you go by as an agent, such as Claude');
  const login = options.login;
  return {
    kind: 'agent',
    person: {
      name: options['person-name'] || git(root, 'config', 'user.name'),
      login,
      avatar: login ? `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=64` : undefined,
    },
    agent: { name: String(options.agent).slice(0, 40), model: options.model ? String(options.model).slice(0, 80) : undefined },
  };
};

const newId = (prefix) => `${prefix}_${randomBytes(8).toString('hex').slice(0, 12)}`;

const body = (options) => {
  const text = String(options.body || '').trim();
  if (text === '') fail('--body is required');
  if (text.length > LIMITS.body) fail(`a comment holds at most ${LIMITS.body} characters`);
  return text;
};

/** A stored thread, parsed and checked; never rewritten when it cannot be read. */
const loadThread = (values, id) => {
  if (!ID.test(String(id || ''))) fail('--thread needs a thread id such as t_1a2b3c4d5e6f');
  const raw = values.get(`pins/${id}`);
  if (raw === undefined) fail(`no thread ${id}`);
  let thread;
  try {
    thread = JSON.parse(raw);
  } catch {
    fail(`thread ${id} is not valid JSON; it is left as it is`);
  }
  if (!thread || typeof thread !== 'object' || !Array.isArray(thread.comments)) fail(`thread ${id} is not a thread; it is left as it is`);
  if ((thread.schemaVersion || 1) > SCHEMA_VERSION) fail(`thread ${id} uses a newer schema; it is left as it is`);
  return thread;
};

const save = (values, thread) => {
  thread.schemaVersion = SCHEMA_VERSION;
  thread.activity = (thread.activity || []).slice(-LIMITS.activity);
  values.set(`pins/${thread.id}`, JSON.stringify(thread));
};

const log = (thread, action, actor, at, commentId) => {
  thread.activity = [...(Array.isArray(thread.activity) ? thread.activity : []), { action, at, actor, ...(commentId ? { commentId } : {}) }];
};

const comment = (text, actor, at) => ({
  id: newId('c'),
  actor,
  author: actor.person.name || actor.person.login || 'Agent',
  ...(actor.person.login ? { github: actor.person.login, avatar: actor.person.avatar } : {}),
  body: text,
  createdAt: at,
});

const visible = (thread) => !thread.deletedAt && thread.comments.some((entry) => !entry.deletedAt);

const run = () => {
  const { command, options } = parseArgs(process.argv.slice(2));
  const root = projectRoot();
  const path = resolve(root, FILE);
  const values = readStore(path);
  const now = Date.now();

  if (command === 'list') {
    const status = options.status || 'open';
    const threads = [];
    for (const [key, raw] of values) {
      if (!key.startsWith('pins/')) continue;
      try {
        const thread = JSON.parse(raw);
        if (!thread || !Array.isArray(thread.comments) || !visible(thread)) continue;
        if (options.file && thread.page !== options.file) continue;
        if (status !== 'all' && (thread.status || 'open') !== status) continue;
        threads.push(thread);
      } catch {
        process.stderr.write(`feedback: ${key} could not be read; skipped\n`);
      }
    }
    threads.sort((a, b) => a.page.localeCompare(b.page) || a.createdAt - b.createdAt);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(threads.map(({ snapshot, ...rest }) => rest), undefined, 2)}\n`);
      return;
    }
    for (const thread of threads) {
      const where = thread.target ? `${thread.target.name || ''}${(thread.target.classes || []).map((name) => `.${name}`).join('')}` : 'page';
      const inner = thread.ref && Array.isArray(thread.ref.steps) && thread.ref.steps.length > 1 ? ` > ${thread.refName || thread.ref.steps[thread.ref.steps.length - 1].file}` : '';
      process.stdout.write(`${thread.id}  ${thread.status || 'open'}  ${thread.page}  ${where}${inner}\n`);
      for (const entry of thread.comments.filter((item) => !item.deletedAt)) {
        const who = entry.actor && entry.actor.kind === 'agent' ? `${(entry.actor.person.name || 'someone').split(' ')[0]}'s agent (${entry.actor.agent.name})` : entry.author;
        process.stdout.write(`    ${entry.id}  ${who}: ${entry.body.replace(/\s+/g, ' ')}\n`);
      }
    }
    return;
  }

  const actor = agentActor(root, options);

  if (command === 'add') {
    const file = String(options.file || '').trim();
    if (!file) fail('--file is required: the page or component path, such as src/pages/index.astro');
    if (!existsSync(resolve(root, file))) fail(`${file} does not exist in this project`);
    if ([...values.keys()].filter((key) => key.startsWith('pins/')).length >= 990) fail('the project holds at most 990 threads');
    const target = options.tag ? { name: options.tag, classes: options.class, text: options.text || '', index: Number(options.index || 0) } : undefined;
    const at = options.at ? options.at.split(',').map(Number) : undefined;
    if (at && (at.length !== 2 || at.some((value) => !(value >= 0 && value <= 1)))) fail('--at is x,y with each from 0 to 1, such as 0.5,0.5');
    // A comment on a component instance can apply to more than that instance (AGENTS.md, "Scope").
    let scope;
    if (options.scope && options.scope !== 'instance') {
      if (!SCOPES.includes(options.scope)) fail(`--scope is instance, ${SCOPES.join(', ')}`);
      const name = options.component || options.tag;
      if (!name) fail('--scope needs --component, the component name such as Heading');
      const componentPath = options['component-path'];
      if (componentPath && !existsSync(resolve(root, componentPath))) fail(`${componentPath} does not exist in this project`);
      // `site` and `component` are one choice since 1.6.2 (every instance, and the component file): stored as `component`.
      const kind = options.scope === 'site' ? 'component' : options.scope;
      scope = { kind, component: { name, ...(componentPath ? { path: componentPath } : {}) }, page: file };
      if (options.scope === 'matches') {
        // Every element of the component's own markup like the one pinned (AGENTS.md, "Scope").
        if (!componentPath) fail('--scope matches needs --component-path, the file whose markup is matched');
        if (!options['match-tag']) fail('--scope matches needs --match-tag, such as a');
        const within = options.within || 'instance';
        if (!['instance', 'all'].includes(within)) fail('--within is instance or all');
        scope.match = { tag: options['match-tag'], ...(options['match-class'] ? { class: options['match-class'] } : {}) };
        scope.within = within;
      }
      if (options.scope === 'section') {
        if (!options['section-key'] && !options['section-class']) fail('--scope section needs --section-key or --section-class');
        scope.section = options['section-key']
          ? { key: options['section-key'] }
          : { target: { name: 'section', classes: [options['section-class']], text: '', index: 0 } };
      }
    }
    // An element inside a component instance (the link NavLink renders in the header's Nav): a Stacki
    // ref, the open page's element first. AGENTS.md, "Pinning inside a component".
    const ref = options.ref ? parseRef(options.ref, file) : undefined;
    const refAt = options['ref-at'] ? parsePoint(options['ref-at'], '--ref-at') : undefined;
    if (refAt && !ref) fail('--ref-at needs --ref');
    const first = comment(body(options), actor, now);
    const thread = {
      schemaVersion: SCHEMA_VERSION,
      id: newId('t'),
      page: file,
      ...(options.key ? { key: options.key } : {}),
      ...(target ? { target } : {}),
      ...(at ? { at: { x: at[0], y: at[1] } } : {}),
      ...(ref ? { ref } : {}),
      ...(refAt ? { refAt } : {}),
      ...(ref && options['ref-name'] ? { refName: String(options['ref-name']).slice(0, 64) } : {}),
      ...(scope ? { scope } : {}),
      status: 'open',
      createdAt: now,
      updatedAt: now,
      comments: [first],
      activity: [],
    };
    log(thread, 'comment', actor, now, first.id);
    save(values, thread);
    writeStore(path, values);
    process.stdout.write(`${thread.id}\n`);
    return;
  }

  const thread = loadThread(values, options.thread);
  if (command === 'reply') {
    if (thread.comments.length >= LIMITS.comments) fail(`a thread holds at most ${LIMITS.comments} comments`);
    const reply = comment(body(options), actor, now);
    thread.comments.push(reply);
    thread.updatedAt = now;
    log(thread, 'reply', actor, now, reply.id);
    process.stdout.write(`${reply.id}\n`);
  } else if (command === 'resolve' || command === 'reopen') {
    thread.status = command === 'resolve' ? 'resolved' : 'open';
    thread.updatedAt = now;
    if (command === 'resolve') {
      thread.resolvedAt = now;
      thread.resolvedBy = `${actor.person.name || 'someone'}'s agent (${actor.agent.name})`;
    } else {
      delete thread.resolvedAt;
      delete thread.resolvedBy;
    }
    log(thread, command, actor, now);
  } else if (command === 'delete') {
    // Soft: the record survives with deletedAt and a log entry.
    if (options.comment) {
      const target = thread.comments.find((entry) => entry.id === options.comment);
      if (!target) fail(`no comment ${options.comment} in ${thread.id}`);
      target.deletedAt = now;
      log(thread, 'delete', actor, now, target.id);
    } else {
      thread.deletedAt = now;
      log(thread, 'delete', actor, now);
    }
    thread.updatedAt = now;
  } else {
    fail(`unknown command ${command}; use list, add, reply, resolve, reopen or delete`);
  }
  save(values, thread);
  writeStore(path, values);
};

run();

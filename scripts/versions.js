// The Versions panel's list: every READY production build of the churchnetwork project on Vercel, newest first,
// one row per commit, each with a plain summary. Summaries come from the repo's versions.json (by commit SHA),
// else a "Version: ..." line in the commit message, else the commit's first line. A notes entry can also give a
// `path` for a build whose root doesn't serve the hero (the first build had no rewrite from / to it).
// build-static.js writes the list into dist/versions.json.
import { existsSync, readFileSync } from 'node:fs';

const PROJECT_ID = 'prj_l343H91mwTjs9V7niqkw3HG62tL4';
const TEAM_ID = 'team_JLMQ6yNjpfOz24KRC3kiBMdu';

export function summaryOf(message, notes, sha) {
  if (notes[sha]?.summary) return notes[sha].summary;
  const line = /^Version:\s*(.+)$/m.exec(message || '');
  if (line) return line[1].trim();
  return (message || '').split('\n')[0].trim();
}

export function buildVersionList({ deployments, current, notes }) {
  const bySha = new Map();
  for (const d of deployments) {
    const sha = d.meta?.githubCommitSha;
    if (!sha) continue;
    const prev = bySha.get(sha);
    if (prev && prev.created >= d.created) continue;
    bySha.set(sha, { sha, url: d.url, created: d.created, message: d.meta.githubCommitMessage });
  }
  if (current) bySha.set(current.sha, current);
  const list = [...bySha.values()]
    .sort((a, b) => b.created - a.created)
    .map(v => ({
      sha: v.sha,
      href: `https://${v.url}${notes[v.sha]?.path || '/'}`,
      createdAt: v.created,
      summary: summaryOf(v.message, notes, v.sha),
      current: false,
    }));
  const head = current ? list.find(v => v.sha === current.sha) : list[0];
  if (head) head.current = true;
  return list;
}

export async function fetchDeployments({ token, fetch = globalThis.fetch }) {
  if (!token) throw new Error('VERCEL_VERSIONS_TOKEN is not set');
  const base = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}`
    + '&target=production&state=READY&limit=100';
  const all = [];
  let until = null;
  do {
    const res = await fetch(until ? `${base}&until=${until}` : base, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Vercel API answered ${res.status}`);
    const body = await res.json();
    all.push(...body.deployments);
    until = body.pagination?.next ?? null;
  } while (until);
  return all;
}

export function readNotes(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(JSON.parse(readFileSync(path, 'utf8')).map(({ sha, ...note }) => [sha, note]));
}

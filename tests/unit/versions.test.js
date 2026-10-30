import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildVersionList, fetchDeployments, readNotes, summaryOf } from '../../scripts/versions.js';

const dep = (sha, created, message = `Subject ${sha}\n\nBody`) =>
  ({ url: `cn-${sha}.vercel.app`, created, meta: { githubCommitSha: sha, githubCommitMessage: message } });

describe('summaryOf', () => {
  test('summary prefers the notes file, then a Version line, then the subject', () => {
    expect(summaryOf('Fix it\n\nVersion: New logo\n\nMore', { a: 'From notes' }, 'a')).toBe('From notes');
    expect(summaryOf('Fix it\n\nVersion: New logo\n\nMore', {}, 'a')).toBe('New logo');
    expect(summaryOf('Fix it\n\nBody', {}, 'a')).toBe('Fix it');
  });
});

describe('buildVersionList', () => {
  test('list is newest first, one row per sha, href is the deploy root', () => {
    const list = buildVersionList({ deployments: [dep('a', 1), dep('b', 3), dep('a', 2)], current: null, notes: {} });
    expect(list.map(v => [v.sha, v.createdAt])).toEqual([['b', 3], ['a', 2]]);
    expect(list[0]).toMatchObject({ href: 'https://cn-b.vercel.app/', current: true });
    expect(list[1].current).toBe(false);
  });

  test('the build being made is the current row and replaces its own sha', () => {
    const current = { url: 'cn-new.vercel.app', created: 9, sha: 'b', message: 'X\n\nVersion: Today' };
    const list = buildVersionList({ deployments: [dep('a', 1), dep('b', 3)], current, notes: {} });
    expect(list[0]).toEqual({ sha: 'b', href: 'https://cn-new.vercel.app/', createdAt: 9, summary: 'Today', current: true });
    expect(list).toHaveLength(2);
    expect(list.filter(v => v.current)).toHaveLength(1);
  });
});

describe('fetchDeployments', () => {
  test('fetchDeployments follows pagination and sends the token', async () => {
    const calls = [];
    const pages = [
      { deployments: [dep('a', 2), dep('b', 1)], pagination: { next: 5 } },
      { deployments: [dep('c', 0)], pagination: { next: null } },
    ];
    const fetch = async (url, init) => {
      calls.push({ url, auth: init.headers.Authorization });
      return { ok: true, json: async () => pages[calls.length - 1] };
    };
    const all = await fetchDeployments({ token: 't', fetch });
    expect(all).toHaveLength(3);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain('projectId=prj_l343H91mwTjs9V7niqkw3HG62tL4');
    expect(calls[0].url).toContain('target=production');
    expect(calls[0].url).toContain('state=READY');
    expect(calls[1].url).toContain('until=5');
    expect(calls.every(c => c.auth === 'Bearer t')).toBe(true);
  });

  test('fetchDeployments rejects without a token or on a non-OK response', async () => {
    await expect(fetchDeployments({ token: '', fetch: async () => ({ ok: true }) })).rejects.toThrow();
    await expect(fetchDeployments({ token: 't', fetch: async () => ({ ok: false, status: 403 }) })).rejects.toThrow(/403/);
  });
});

describe('readNotes', () => {
  test('readNotes maps sha to summary and tolerates a missing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cn-notes-'));
    const path = join(dir, 'versions.json');
    writeFileSync(path, JSON.stringify([{ sha: 'a', summary: 'One' }, { sha: 'b', summary: 'Two' }]));
    expect(readNotes(path)).toEqual({ a: 'One', b: 'Two' });
    expect(readNotes(join(dir, 'missing.json'))).toEqual({});
  });
});

// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, test } from 'vitest';
import { api } from './_generated/api.js';
import schema from './schema.js';

const modules = import.meta.glob(['./**/*.js', '!./**/*.test.js']);

const at = { path: '#top > h1:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 };
const comment = (over = {}) => ({
  page: 'home', kind: 'comment', at, text: 'Make the cursor easier to see', author: 'Ana', deviceId: 'device-a', ...over,
});

// The ConvexError code a call rejects with, or null when it succeeds
async function code(promise) {
  try { await promise; return null; } catch (e) { return e.data ?? e.message; }
}

beforeEach(() => { process.env.OWNER_KEY = 'owner-secret'; });

describe('marks', () => {
  test('creates a comment and lists it', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.marks.create, comment());
    const marks = await t.query(api.marks.list, { page: 'home' });
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ kind: 'comment', resolved: false, author: 'Ana', text: 'Make the cursor easier to see' });
  });

  test('rejects a comment with empty text', async () => {
    const t = convexTest(schema, modules);
    expect(await code(t.mutation(api.marks.create, comment({ text: '   ' })))).toBe('INVALID');
  });

  test('rejects text over 2000 chars', async () => {
    const t = convexTest(schema, modules);
    expect(await code(t.mutation(api.marks.create, comment({ text: 'x'.repeat(2001) })))).toBe('INVALID');
  });

  test('rejects a name over 60 chars', async () => {
    const t = convexTest(schema, modules);
    expect(await code(t.mutation(api.marks.create, comment({ author: 'n'.repeat(61) })))).toBe('INVALID');
  });

  test('rejects an arrow without to', async () => {
    const t = convexTest(schema, modules);
    expect(await code(t.mutation(api.marks.create, { page: 'home', kind: 'arrow', from: at, author: 'Ana', deviceId: 'device-a' }))).toBe('INVALID');
  });

  test('rejects a voice memo over 180000 ms', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'])));
    const memo = { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 180001 }, author: 'Ana', deviceId: 'device-a' };
    expect(await code(t.mutation(api.marks.create, memo))).toBe('INVALID');
  });

  test('rate limits an 11th mark from one device within a minute', async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 10; i++) expect(await code(t.mutation(api.marks.create, comment()))).toBe(null);
    expect(await code(t.mutation(api.marks.create, comment()))).toBe('RATE_LIMIT');
    expect(await code(t.mutation(api.marks.create, comment({ deviceId: 'device-b' })))).toBe(null);
  });

  test('setResolved needs the owner key', async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.marks.create, comment());
    expect(await code(t.mutation(api.marks.setResolved, { id, resolved: true, ownerKey: 'wrong' }))).toBe('NOT_OWNER');
    await t.mutation(api.marks.setResolved, { id, resolved: true, ownerKey: 'owner-secret' });
    const [mark] = await t.query(api.marks.list, { page: 'home' });
    expect(mark.resolved).toBe(true);
  });

  test('author can remove their own mark; others cannot', async () => {
    const t = convexTest(schema, modules);
    const mine = await t.mutation(api.marks.create, comment());
    await t.mutation(api.marks.remove, { id: mine, deviceId: 'device-a' });
    const theirs = await t.mutation(api.marks.create, comment());
    expect(await code(t.mutation(api.marks.remove, { id: theirs, deviceId: 'device-b' }))).toBe('NOT_OWNER');
    await t.mutation(api.marks.remove, { id: theirs, deviceId: 'device-b', ownerKey: 'owner-secret' });
    expect(await t.query(api.marks.list, { page: 'home' })).toHaveLength(0);
  });

  test('removing a voice memo deletes its file', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'])));
    const id = await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    await t.mutation(api.marks.remove, { id, deviceId: 'device-a' });
    expect(await t.run(ctx => ctx.storage.getUrl(storageId))).toBe(null);
  });

  test('list returns audioUrl for voice memos', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'])));
    await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    const [mark] = await t.query(api.marks.list, { page: 'home' });
    expect(typeof mark.audioUrl).toBe('string');
  });

  test('isOwner', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.marks.isOwner, { ownerKey: 'owner-secret' })).toBe(true);
    expect(await t.query(api.marks.isOwner, { ownerKey: 'nope' })).toBe(false);
    expect(await t.query(api.marks.isOwner, { ownerKey: null })).toBe(false);
  });
});

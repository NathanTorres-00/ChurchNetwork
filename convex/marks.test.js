// @vitest-environment edge-runtime
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, test } from 'vitest';
import { api, internal } from './_generated/api.js';
import schema from './schema.js';

const modules = import.meta.glob(['./**/*.js', '!./**/*.test.js']);

const at = { path: '#top > h1:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 };
const comment = (over = {}) => ({
  page: 'home', kind: 'comment', at, text: 'Make the cursor easier to see', author: 'Ana', deviceId: 'device-a', ...over,
});

const pen = (over = {}) => ({ ink: 'pen', at, size: 16, origin: { x: 10, y: 20 }, pts: [0, 0, 10, 2, 20, 0], ...over });
const drawing = (over = {}) => ({ page: 'home', kind: 'drawing', author: 'Ana', deviceId: 'device-a', strokes: [pen()], ...over });
const flat = n => Array.from({ length: n * 2 }, (_, i) => i % 7);

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
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'], { type: 'audio/mp4' })));
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
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'], { type: 'audio/mp4' })));
    const id = await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    await t.mutation(api.marks.remove, { id, deviceId: 'device-a' });
    expect(await t.run(ctx => ctx.storage.getUrl(storageId))).toBe(null);
  });

  test('list returns audioUrl for voice memos', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'], { type: 'audio/mp4' })));
    await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    const [mark] = await t.query(api.marks.list, { page: 'home' });
    expect(typeof mark.audioUrl).toBe('string');
  });

  test('list does not expose device ids or storage ids, and marks your own', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'], { type: 'audio/mp4' })));
    await t.mutation(api.marks.create, comment());
    await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    const mine = await t.query(api.marks.list, { page: 'home', deviceId: 'device-a' });
    for (const m of mine) {
      expect(m).not.toHaveProperty('deviceId');
      expect(m.mine).toBe(true);
    }
    expect(mine[1].audio).not.toHaveProperty('storageId');
    expect(mine[1].audio).toMatchObject({ mime: 'audio/mp4', durationMs: 4000 });
    const theirs = await t.query(api.marks.list, { page: 'home', deviceId: 'device-b' });
    expect(theirs.every(m => m.mine === false)).toBe(true);
  });

  test('posting twice with the same clientId keeps one mark', async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(api.marks.create, comment({ clientId: 'draft-1' }));
    const again = await t.mutation(api.marks.create, comment({ clientId: 'draft-1' }));
    expect(again).toBe(first);
    expect(await t.query(api.marks.list, { page: 'home' })).toHaveLength(1);
  });

  test('rejects a voice memo that is not audio', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['<html>'], { type: 'text/html' })));
    const memo = { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'text/html', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' };
    expect(await code(t.mutation(api.marks.create, memo))).toBe('INVALID');
  });

  test('rejects a voice memo over 10 MB', async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'audio/mp4' })));
    const memo = { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' };
    expect(await code(t.mutation(api.marks.create, memo))).toBe('INVALID');
  });

  test("rejects a voice memo using another memo's file or a missing file", async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob(['x'], { type: 'audio/mp4' })));
    const memo = { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' };
    await t.mutation(api.marks.create, memo);
    expect(await code(t.mutation(api.marks.create, { ...memo, deviceId: 'device-b' }))).toBe('INVALID');
    const gone = await t.run(async ctx => { const id = await ctx.storage.store(new Blob(['y'], { type: 'audio/mp4' })); await ctx.storage.delete(id); return id; });
    expect(await code(t.mutation(api.marks.create, { ...memo, audio: { ...memo.audio, storageId: gone } }))).toBe('INVALID');
  });

  test('rejects an unknown page', async () => {
    const t = convexTest(schema, modules);
    expect(await code(t.mutation(api.marks.create, comment({ page: 'x'.repeat(5000) })))).toBe('INVALID');
  });

  test('caps marks across all devices per minute', async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 60; i++) await t.mutation(api.marks.create, comment({ deviceId: `device-${i}` }));
    expect(await code(t.mutation(api.marks.create, comment({ deviceId: 'device-new' })))).toBe('RATE_LIMIT');
  });

  test('list returns at most the newest 500 marks', async () => {
    const t = convexTest(schema, modules);
    await t.run(async ctx => {
      for (let i = 0; i < 502; i++) await ctx.db.insert('marks', { ...comment({ text: `mark ${i}` }), resolved: false });
    });
    const marks = await t.query(api.marks.list, { page: 'home' });
    expect(marks).toHaveLength(500);
    expect(marks.at(-1).text).toBe('mark 501');
  });

  test('cleanup removes uploads no mark uses', async () => {
    const t = convexTest(schema, modules);
    const [used, unused] = await t.run(async ctx => [
      await ctx.storage.store(new Blob(['a'], { type: 'audio/mp4' })),
      await ctx.storage.store(new Blob(['b'], { type: 'audio/mp4' })),
    ]);
    await t.mutation(api.marks.create, { page: 'home', kind: 'voice', at, audio: { storageId: used, mime: 'audio/mp4', durationMs: 4000 }, author: 'Ana', deviceId: 'device-a' });
    // a cutoff just ahead of now, since files made this millisecond can carry a fractional later timestamp
    await t.mutation(internal.marks.cleanupUploads, { olderThanMs: -1000 });
    expect(await t.run(ctx => ctx.storage.getUrl(unused))).toBe(null);
    expect(typeof await t.run(ctx => ctx.storage.getUrl(used))).toBe('string');
  });

  test('isOwner', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.marks.isOwner, { ownerKey: 'owner-secret' })).toBe(true);
    expect(await t.query(api.marks.isOwner, { ownerKey: 'nope' })).toBe(false);
    expect(await t.query(api.marks.isOwner, { ownerKey: null })).toBe(false);
  });

  describe('drawings', () => {
    const post = d => convexTest(schema, modules).mutation(api.marks.create, d);

    test('creates a drawing with no note and lists its strokes', async () => {
      const t = convexTest(schema, modules);
      await t.mutation(api.marks.create, drawing());
      const marks = await t.query(api.marks.list, { page: 'home' });
      expect(marks).toHaveLength(1);
      expect(marks[0].kind).toBe('drawing');
      expect(marks[0].strokes[0].pts).toEqual([0, 0, 10, 2, 20, 0]);
    });

    test('rejects a drawing with no strokes', async () => {
      expect(await code(post(drawing({ strokes: [] })))).toBe('INVALID');
    });

    test('rejects 41 strokes', async () => {
      expect(await code(post(drawing({ strokes: Array.from({ length: 41 }, () => pen()) })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: Array.from({ length: 40 }, () => pen()) })))).toBe(null);
    });

    test('rejects more than 6000 points in all', async () => {
      const strokes = Array.from({ length: 4 }, () => pen({ pts: flat(1501) }));
      expect(await code(post(drawing({ strokes })))).toBe('INVALID');
    });

    test('rejects a stroke over 2000 points, an odd pts length, or fewer than 2 points', async () => {
      expect(await code(post(drawing({ strokes: [pen({ pts: flat(2001) })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ pts: flat(2000) })] })))).toBe(null);
      expect(await code(post(drawing({ strokes: [pen({ pts: [0, 0, 1, 1, 2] })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ pts: [0, 0] })] })))).toBe('INVALID');
    });

    test('rejects a coordinate beyond 20000', async () => {
      expect(await code(post(drawing({ strokes: [pen({ pts: [0, 0, 20001, 0] })] })))).toBe('INVALID');
    });

    test('rejects an origin beyond 1e6 page px', async () => {
      expect(await code(post(drawing({ strokes: [pen({ origin: { x: 1e6 + 1, y: 0 } })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ origin: { x: 0, y: -1e6 - 1 } })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ origin: { x: -1e6, y: 1e6 } })] })))).toBe(null);
    });

    test('rejects pressure outside 0-1 or a pressure list of the wrong length', async () => {
      expect(await code(post(drawing({ strokes: [pen({ pr: [0.5, 1.5, 0.2] })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ pr: [0.5, 0.5] })] })))).toBe('INVALID');
      expect(await code(post(drawing({ strokes: [pen({ pr: [0.5, 1, 0] })] })))).toBe(null);
    });

    test('rejects a drawing with at, from or to', async () => {
      expect(await code(post(drawing({ at })))).toBe('INVALID');
      expect(await code(post(drawing({ from: at })))).toBe('INVALID');
      expect(await code(post(drawing({ to: at })))).toBe('INVALID');
    });

    test('rejects strokes on a comment', async () => {
      expect(await code(post(comment({ strokes: [pen()] })))).toBe('INVALID');
    });

    test('still accepts a box highlight', async () => {
      expect(await code(post({ page: 'home', kind: 'highlight', from: at, to: at, author: 'Ana', deviceId: 'device-a' }))).toBe(null);
    });
  });
});

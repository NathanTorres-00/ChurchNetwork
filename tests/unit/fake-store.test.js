// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { createFakeStore } from '../../review/fake-store.js';

const at = { path: '#top > h1:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 };
const comment = { page: 'home', kind: 'comment', at, text: 'Bigger cursor', author: 'Ana', deviceId: 'device-a' };
const audioBlob = () => new Blob(['x'], { type: 'audio/mp4' });

describe('fake store', () => {
  test('fake store matches the backend rules', async () => {
    const store = createFakeStore();
    let latest = [];
    const unsubscribe = store.subscribe({ page: 'home', deviceId: 'device-a' }, marks => { latest = marks; });

    const id = await store.create(comment);
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({ _id: id, kind: 'comment', resolved: false, mine: true });
    expect(latest[0]).not.toHaveProperty('deviceId');

    store.failNext('NETWORK');
    await expect(store.create(comment)).rejects.toMatchObject({ code: 'NETWORK' });
    await store.create(comment);
    expect(latest).toHaveLength(2);

    await expect(store.create({ ...comment, text: '' })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.setResolved(id, true, 'wrong')).rejects.toMatchObject({ code: 'NOT_OWNER' });
    await store.setResolved(id, true, 'test-owner');
    expect(latest.find(m => m._id === id).resolved).toBe(true);

    await expect(store.remove(id, { deviceId: 'device-b' })).rejects.toMatchObject({ code: 'NOT_OWNER' });
    await store.remove(id, { deviceId: 'device-a' });
    expect(latest.find(m => m._id === id)).toBeUndefined();

    const storageId = await store.uploadAudio(audioBlob(), 'audio/mp4', 'device-a');
    await store.create({ page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 3000 }, author: 'Ana', deviceId: 'device-a' });
    expect(latest.at(-1).audioUrl).toMatch(/^blob:/);
    expect(latest.at(-1).audio).not.toHaveProperty('storageId');

    expect(await store.isOwner('test-owner')).toBe(true);
    expect(await store.isOwner(null)).toBe(false);

    // after unsubscribing, new marks no longer arrive
    expect(latest).toHaveLength(2);
    unsubscribe();
    await store.create(comment);
    expect(latest).toHaveLength(2);
  });

  test("other devices' marks are not marked as theirs", async () => {
    const store = createFakeStore();
    await store.create(comment);
    let seen = [];
    store.subscribe({ page: 'home', deviceId: 'device-b' }, marks => { seen = marks; });
    expect(seen[0].mine).toBe(false);
  });

  test('a retried post with the same clientId keeps one mark', async () => {
    const store = createFakeStore();
    const a = await store.create({ ...comment, clientId: 'draft-1' });
    const b = await store.create({ ...comment, clientId: 'draft-1' });
    expect(b).toBe(a);
    expect(store.marks).toHaveLength(1);
  });

  test("a voice memo can't reuse another memo's file", async () => {
    const store = createFakeStore();
    const storageId = await store.uploadAudio(audioBlob(), 'audio/mp4', 'device-a');
    const memo = { page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 3000 }, author: 'Ana', deviceId: 'device-a' };
    await store.create(memo);
    await expect(store.create({ ...memo, deviceId: 'device-b' })).rejects.toMatchObject({ code: 'INVALID' });
  });

  test('holdNext keeps the next post waiting until released', async () => {
    const store = createFakeStore();
    store.holdNext();
    let done = false;
    const posting = store.create(comment).then(() => { done = true; });
    await new Promise(r => setTimeout(r, 20));
    expect(done).toBe(false);
    store.release();
    await posting;
    expect(done).toBe(true);
  });

  test('failNext also fails the next upload', async () => {
    const store = createFakeStore();
    store.failNext('NETWORK');
    await expect(store.uploadAudio(audioBlob(), 'audio/mp4', 'device-a')).rejects.toMatchObject({ code: 'NETWORK' });
    await expect(store.uploadAudio(audioBlob(), 'audio/mp4', 'device-a')).resolves.toMatch(/\S/);
  });

  test('rate limits an 11th mark from one device', async () => {
    const store = createFakeStore();
    for (let i = 0; i < 10; i++) await store.create(comment);
    await expect(store.create(comment)).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });
});

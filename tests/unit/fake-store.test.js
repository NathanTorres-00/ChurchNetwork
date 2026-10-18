// @vitest-environment jsdom
import { beforeAll, describe, expect, test } from 'vitest';
import { createFakeStore } from '../../review/fake-store.js';

const at = { path: '#top > h1:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 };
const comment = { page: 'home', kind: 'comment', at, text: 'Bigger cursor', author: 'Ana', deviceId: 'device-a' };

beforeAll(() => {
  // jsdom has no object URLs
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:fake';
});

describe('fake store', () => {
  test('fake store matches the backend rules', async () => {
    const store = createFakeStore();
    let latest = [];
    const unsubscribe = store.subscribe('home', marks => { latest = marks; });

    const id = await store.create(comment);
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({ _id: id, kind: 'comment', resolved: false });

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

    const storageId = await store.uploadAudio(new Blob(['x'], { type: 'audio/mp4' }), 'audio/mp4', 'device-a');
    await store.create({ page: 'home', kind: 'voice', at, audio: { storageId, mime: 'audio/mp4', durationMs: 3000 }, author: 'Ana', deviceId: 'device-a' });
    expect(latest.at(-1).audioUrl).toMatch(/^blob:/);

    expect(await store.isOwner('test-owner')).toBe(true);
    expect(await store.isOwner(null)).toBe(false);

    // after unsubscribing, new marks no longer arrive
    expect(latest).toHaveLength(2);
    unsubscribe();
    await store.create(comment);
    expect(latest).toHaveLength(2);
  });

  test('failNext also fails the next upload', async () => {
    const store = createFakeStore();
    store.failNext('NETWORK');
    await expect(store.uploadAudio(new Blob(['x']), 'audio/mp4', 'device-a')).rejects.toMatchObject({ code: 'NETWORK' });
    await expect(store.uploadAudio(new Blob(['x']), 'audio/mp4', 'device-a')).resolves.toMatch(/\S/);
  });

  test('rate limits an 11th mark from one device', async () => {
    const store = createFakeStore();
    for (let i = 0; i < 10; i++) await store.create(comment);
    await expect(store.create(comment)).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });
});

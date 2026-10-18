// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createConvexStore, POST_TIMEOUT_MS } from '../../review/store.js';

// Stands in for Convex's browser bundle. Like the real client while offline, its mutations never settle.
let calls;
beforeEach(() => {
  calls = [];
  globalThis.convex = {
    ConvexClient: class {
      mutation(name, args) { calls.push([name, args]); return new Promise(() => {}); }
      query() { return Promise.resolve(false); }
      onUpdate() { return () => {}; }
      close() {}
    },
  };
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); delete globalThis.convex; });

describe('Convex store', () => {
  test('a post that gets no answer fails with TIMEOUT instead of hanging', async () => {
    const store = await createConvexStore('https://x.convex.cloud');
    const posting = store.create({ page: 'home', kind: 'comment', text: 'hi', author: 'Ana', deviceId: 'd', clientId: 'draft-1' });
    const result = expect(posting).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(POST_TIMEOUT_MS + 1);
    await result;
    expect(calls[0]).toEqual(['marks:create', expect.objectContaining({ clientId: 'draft-1' })]);
  });

  test('subscribing asks only for this device to be told which marks are its own', async () => {
    const seen = [];
    globalThis.convex.ConvexClient.prototype.onUpdate = (name, args) => { seen.push([name, args]); return () => {}; };
    const store = await createConvexStore('https://x.convex.cloud');
    store.subscribe({ page: 'home', deviceId: 'device-a' }, () => {});
    expect(seen).toEqual([['marks:list', { page: 'home', deviceId: 'device-a' }]]);
  });
});

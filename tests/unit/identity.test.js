// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

let identity;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  identity = await import('../../review/identity.js');
});
afterEach(() => vi.restoreAllMocks());

describe('identity', () => {
  test('name persists', async () => {
    expect(identity.getName()).toBe(null);
    identity.setName('Ana');
    vi.resetModules();
    const fresh = await import('../../review/identity.js');
    expect(fresh.getName()).toBe('Ana');
  });

  test('device id is stable across calls', async () => {
    const id = identity.getDeviceId();
    expect(id).toMatch(/\S{8,}/);
    expect(identity.getDeviceId()).toBe(id);
    vi.resetModules();
    const fresh = await import('../../review/identity.js');
    expect(fresh.getDeviceId()).toBe(id);
  });

  test('captureOwnerKey stores the key and strips only ?owner', () => {
    history.replaceState(null, '', '/?comment&owner=abc#app');
    expect(identity.captureOwnerKey()).toBe('abc');
    expect(location.search).toBe('?comment');
    expect(location.hash).toBe('#app');
    expect(identity.getOwnerKey()).toBe('abc');
  });

  test('captureOwnerKey leaves the address alone without ?owner', () => {
    history.replaceState(null, '', '/?comment');
    expect(identity.captureOwnerKey()).toBe(null);
    expect(location.search).toBe('?comment');
  });

  test('identity works when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.resetModules();
    const blocked = await import('../../review/identity.js');
    expect(blocked.getName()).toBe(null);
    expect(() => blocked.setName('Ana')).not.toThrow();
    const id = blocked.getDeviceId();
    expect(blocked.getDeviceId()).toBe(id);
  });
});

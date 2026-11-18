// Old addresses keep working once the site moves: Vercel's clean URLs turn /hero.html and /groups.html into
// /hero and /groups, and /hero redirects to Home.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

describe('vercel.json', () => {
  test('uses clean URLs and the framework build (no Convex build command)', () => {
    expect(vercel.cleanUrls).toBe(true);
    expect(vercel.buildCommand).toBeUndefined();
  });

  test('sends /hero to Home, permanently', () => {
    expect(vercel.redirects).toContainEqual({ source: '/hero', destination: '/', permanent: true });
  });

  test('has no rewrites left from the old site', () => {
    expect(vercel.rewrites ?? []).toEqual([]);
  });
});

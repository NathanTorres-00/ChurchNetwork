// After `npm run build`, nothing the site serves still points at the old pages or comment mode.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const DEMOS = /^network-(multiply|globe|globe-pins|gallery)\.(html|js)$/;   // the Wix demos and the gallery engine they share are kept byte for byte

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe.skipIf(!existsSync(DIST))('the built site', () => {
  const served = files(DIST).filter(f => /\.(html|js|css)$/.test(f) && !DEMOS.test(f.split('/').pop()));

  test('has pages and scripts to check', () => {
    expect(served.some(f => f.endsWith('index.html'))).toBe(true);
    expect(served.some(f => f.includes('/scripts/'))).toBe(true);
  });

  test('never mentions hero.html, groups.html, review/ or versions/', () => {
    const hits = served.filter(f => /hero\.html|groups\.html|review\/|versions\//.test(readFileSync(f, 'utf8')));
    expect(hits.map(f => f.replace(DIST, ''))).toEqual([]);
  });
});

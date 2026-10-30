import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildStatic } from '../../scripts/build-static.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cn-build-'));
  const put = (path, text = 'x') => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text); };
  put('hero.html', '<html>hero</html>');
  put('network-globe.html');
  put('assets/logo.png');
  put('review/comment-mode.js', 'export {}');
  put('review/config.js', "export const CONVEX_URL = 'https://local.convex.cloud';");
  put('convex/marks.js');
  put('convex/limits.js', 'export const MAX_TEXT = 2000;');
  put('node_modules/convex/index.js');
  put('docs/notes.md');
  put('versions/versions-panel.js', 'export {}');
  put('versions.json', '[{"sha":"a","summary":"S"}]');
  return { root, out: join(root, 'dist') };
}

describe('buildStatic', () => {
  test('build writes dist with pages, review modules and config', () => {
    const { root, out } = fixture();
    buildStatic({ root, out, convexUrl: 'https://x.convex.cloud' });
    expect(readFileSync(join(out, 'hero.html'), 'utf8')).toBe('<html>hero</html>');
    expect(existsSync(join(out, 'network-globe.html'))).toBe(true);
    expect(existsSync(join(out, 'assets/logo.png'))).toBe(true);
    expect(existsSync(join(out, 'review/comment-mode.js'))).toBe(true);
    const config = readFileSync(join(out, 'review/config.js'), 'utf8');
    expect(config).toContain('https://x.convex.cloud');
    expect(config).not.toContain('local.convex.cloud');
    // review/ imports the shared limits from ../convex/limits.js; the rest of convex/ stays out
    expect(existsSync(join(out, 'convex/limits.js'))).toBe(true);
    expect(existsSync(join(out, 'convex/marks.js'))).toBe(false);
    expect(existsSync(join(out, 'node_modules'))).toBe(false);
    expect(existsSync(join(out, 'docs'))).toBe(false);
  });

  test('build fails without a Convex URL', () => {
    const { root, out } = fixture();
    expect(() => buildStatic({ root, out, convexUrl: '' })).toThrow();
  });

  test('build copies versions/ and writes the list', () => {
    const { root, out } = fixture();
    const entry = { sha: 'a', href: 'https://x/', createdAt: 1, summary: 'S', current: true };
    buildStatic({ root, out, convexUrl: 'https://x.convex.cloud', versions: [entry], versionsAvailable: true });
    expect(existsSync(join(out, 'versions/versions-panel.js'))).toBe(true);
    expect(JSON.parse(readFileSync(join(out, 'versions.json'), 'utf8'))).toEqual({ versions: [entry], available: true });
  });

  test('build writes an unavailable list by default', () => {
    const { root, out } = fixture();
    buildStatic({ root, out, convexUrl: 'https://x.convex.cloud' });
    // the repo's versions.json (summary notes) never ships as the list
    expect(JSON.parse(readFileSync(join(out, 'versions.json'), 'utf8'))).toEqual({ versions: [], available: false });
  });
});

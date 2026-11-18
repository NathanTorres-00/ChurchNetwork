// Leadership is hidden on the live site for now (as on main since bbadf7e): production leaves out the page and
// every link and section that leads to it; local and preview builds keep them.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { showLeadership } from '../../src/utils/leadership.ts';

describe('showLeadership', () => {
  test('is on locally and on previews, off in production', () => {
    expect(showLeadership({})).toBe(true);
    expect(showLeadership({ VERCEL_ENV: 'preview' })).toBe(true);
    expect(showLeadership({ VERCEL_ENV: 'production' })).toBe(false);
  });
});

describe('a production build', () => {
  let out;
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'rn-prod-'));
    execFileSync('npx', ['astro', 'build', '--outDir', out], {
      cwd: new URL('../..', import.meta.url).pathname,
      env: { ...process.env, VERCEL_ENV: 'production' },
      stdio: 'ignore',
    });
  }, 180_000);
  afterAll(() => out && rmSync(out, { recursive: true, force: true }));

  test('has no Leadership page', () => {
    expect(existsSync(join(out, 'leadership'))).toBe(false);
    expect(existsSync(join(out, 'index.html'))).toBe(true);
  });

  test('Home and Groups have no Leadership link or section', () => {
    for (const page of ['index.html', 'groups/index.html']) {
      const html = readFileSync(join(out, page), 'utf8');
      expect(html).not.toContain('/leadership');
      expect(html).not.toContain('See all our leaders');
    }
  });
});

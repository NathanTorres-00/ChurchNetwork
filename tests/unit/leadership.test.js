// Leadership is on the live site again (main 49ae49e, after bbadf7e had hidden it): production builds the page
// and every link and section that leads to it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { showLeadership } from '../../src/utils/leadership.ts';

describe('showLeadership', () => {
  test('is on everywhere, production included', () => {
    expect(showLeadership({})).toBe(true);
    expect(showLeadership({ VERCEL_ENV: 'preview' })).toBe(true);
    expect(showLeadership({ VERCEL_ENV: 'production' })).toBe(true);
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

  test('has the Leadership page', () => {
    expect(existsSync(join(out, 'leadership', 'index.html'))).toBe(true);
  });

  test('Home and Groups link to Leadership, and Groups shows its leadership team', () => {
    for (const page of ['index.html', 'groups/index.html']) {
      expect(readFileSync(join(out, page), 'utf8')).toContain('/leadership');
    }
    expect(readFileSync(join(out, 'groups/index.html'), 'utf8')).toContain('Rock Groups Leadership Team');
  });
});

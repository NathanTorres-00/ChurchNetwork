// The content collections hold every piece of copy an admin will later edit, taken word for word from the old pages.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';

const CONTENT = new URL('../../src/content/', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, CONTENT), 'utf8'));
const jsonFiles = (dir) => existsSync(new URL(dir, CONTENT))
  ? readdirSync(new URL(dir, CONTENT)).filter((f) => f.endsWith('.json'))
  : [];

// every string anywhere inside a JSON value
function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

// The old pages as the last legacy commit on main held them (dc5b9f5, before the Astro cutover)
const LEGACY = 'dc5b9f5';
const oldPage = (file) => new JSDOM(execFileSync('git', ['show', `${LEGACY}:${file}`], { encoding: 'utf8' })).window.document;
const clean = (text) => text.replace(/\s+/g, ' ').trim();

describe('content collections', () => {
  test('the weekly video is this week’s Network Video', () => {
    expect(readJson('weekly-video.json').youtubeId).toBe('qo52gy0Gq74');
  });

  test('Groups shows four leaders, and every leader the pages list has an entry', () => {
    const leaders = new Set(jsonFiles('leaders/').map((f) => f.replace(/\.json$/, '')));
    const groups = readJson('pages/groups.json');
    const leadership = readJson('pages/leadership.json');
    expect(groups.team.people).toHaveLength(4);
    const overseers = leadership.overseers.groups.flatMap((g) => g.assignments.flatMap((a) => a.people));
    const team = leadership.team.people.map((p) => p.leader);
    for (const id of [...groups.team.people.map((p) => p.leader), ...leadership.network.people, ...team, ...overseers]) expect(leaders).toContain(id);
    expect(leadership.network.people).toHaveLength(9);
    expect(team).toHaveLength(4);
    expect(overseers).toHaveLength(18);
  });

  test('group stories hold Anastasia (Home) and the church group member (Groups)', () => {
    expect(jsonFiles('group-stories/').sort()).toEqual(['anastasia.json', 'church-group-member.json']);
  });

  test('every Groups heading is in the Groups page copy', () => {
    const copy = strings(readJson('pages/groups.json'));
    for (const heading of ['Church Groups', 'What are Rock Network Groups?', 'Discipleship Groups', 'Network Video', 'Rock Groups Leadership Team']) {
      expect(copy).toContain(heading);
    }
  });

  test('every Home section title is in the Home page copy', () => {
    const copy = strings(readJson('pages/home.json'));
    // a title set in two spans (How we got started) is two strings
    const titles = [...oldPage('hero.html').querySelectorAll('h2.section-title')]
      .flatMap((h) => (h.querySelector('span') ? [...h.querySelectorAll('span')] : [h]))
      .map((h) => clean(h.textContent));
    expect(titles).toHaveLength(6);
    for (const title of titles) expect(copy).toContain(title);
  });

  test('every Groups paragraph, list item and button label is in the Groups page copy', () => {
    const copy = strings(readJson('pages/groups.json'));
    const main = oldPage('groups.html').querySelector('main');
    const texts = [...main.querySelectorAll('h1, h2, h3, p, li, a.button')]
      .filter((el) => !el.closest('#story, #team .team'))   // the quote and the team are their own collections
      .map((el) => clean(el.textContent))
      .filter(Boolean);
    for (const text of texts) expect(copy).toContain(text);
  });

  test('the footer copy matches the old footer', () => {
    const footer = readJson('footer.json');
    expect(footer.tagline).toBe('A New Testament Church Network returning to the original model.');
    expect(footer.columns.map((c) => c.label)).toEqual(['Explore', 'Connect', 'Policy']);
    expect(footer.copyright).toBe('© 2026 The Rock Network');
  });
});

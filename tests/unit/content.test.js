// The content collections hold every piece of copy an admin will later edit, taken word for word from the old pages.
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

const oldPage = (file) => new JSDOM(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')).window.document;
const clean = (text) => text.replace(/\s+/g, ' ').trim();

describe('content collections', () => {
  test('the weekly video is this week’s Network Video', () => {
    expect(readJson('weekly-video.json').youtubeId).toBe('qo52gy0Gq74');
  });

  test('the team has four members, each in its own place', () => {
    const team = jsonFiles('team/').map((f) => readJson(`team/${f}`));
    expect(team).toHaveLength(4);
    expect(new Set(team.map((m) => m.order)).size).toBe(4);
  });

  test('group stories hold Anastasia (Home) and the church group member (Groups)', () => {
    expect(jsonFiles('group-stories/').sort()).toEqual(['anastasia.json', 'church-group-member.json']);
  });

  test('every Groups heading is in the Groups page copy', () => {
    const copy = strings(readJson('pages/groups.json'));
    for (const heading of ['Church Groups', 'What are Rock Network Groups?', 'Discipleship Groups', 'Network Video', 'Meet the team']) {
      expect(copy).toContain(heading);
    }
  });

  test('every Home section title is in the Home page copy', () => {
    const copy = strings(readJson('pages/home.json'));
    const titles = [...oldPage('hero.html').querySelectorAll('h2.section-title')].map((h) => clean(h.textContent));
    expect(titles).toHaveLength(5);
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

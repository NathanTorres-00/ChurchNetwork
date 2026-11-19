// @vitest-environment jsdom
// The Leadership orbit builds one ring-dot per person from the lists on the page. A leader without a photo (the
// content allows it) must still get a dot, and must not stop the orbit from appearing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

// read from the project folder (under jsdom, import.meta.url isn't a file address)
const script = readFileSync(resolve(process.cwd(), 'public/scripts/leadership-orbit.js'), 'utf8');

test('a leader without a photo gets a placeholder dot, and the orbit still grows', () => {
  document.body.innerHTML = `
    <div class="orbit" id="orbit"></div>
    <ul class="people people-group people-team">
      <li class="person is-group" id="p-a"><img src="/a.jpg" alt=""><span class="person-name">A</span></li>
      <li class="person is-group" id="p-b"><span class="person-empty"></span><span class="person-name">B</span></li>
    </ul>
    <ul class="people people-group people-assignment">
      <li class="person is-group" id="p-c"><span class="person-empty"></span><span class="person-name">C</span></li>
      <li class="person is-group"><span class="person-empty"></span><span class="person-name">A</span></li>
    </ul>`;
  let observed = null;
  window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { observed = el; this.cb([{ isIntersecting: true }], this); } disconnect() {} };
  expect(() => window.eval(script)).not.toThrow();
  const nodes = [...document.querySelectorAll('#orbit .node')];
  expect(nodes.map(n => n.getAttribute('aria-label'))).toEqual(['A', 'B', 'C']);
  expect(nodes[0].querySelector('img').getAttribute('src')).toBe('/a.jpg');
  expect(nodes[1].querySelector('img')).toBeNull();
  expect(nodes[1].querySelector('.node-empty')).not.toBeNull();
  expect(observed.classList.contains('is-growing')).toBe(true);
});

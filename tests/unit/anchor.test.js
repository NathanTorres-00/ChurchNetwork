// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { findByPath, fromFraction, pathFor, resolveAnchor, stableTarget, toFraction } from '../../review/anchor.js';

beforeEach(() => {
  document.body.innerHTML = `
    <main>
      <section id="story"><ol>
        <li><h3>One</h3></li><li><h3>Two</h3></li><li><p>note</p><h3>Three</h3></li>
      </ol></section>
      <div class="loose"><p>first</p><p>second</p></div>
      <h1><span class="solo">Multiplying <span id="slot"><span class="ch">D</span></span></span></h1>
    </main>`;
});

describe('anchor paths', () => {
  test('pathFor and findByPath round-trip', () => {
    const h3 = document.querySelectorAll('#story li')[2].querySelector('h3');
    const path = pathFor(h3);
    expect(path).toBe('#story > ol:nth-of-type(1) > li:nth-of-type(3) > h3:nth-of-type(1)');
    expect(findByPath(path)).toBe(h3);
  });

  test('pathFor falls back to body', () => {
    const second = document.querySelectorAll('.loose p')[1];
    const path = pathFor(second);
    expect(path).toBe('body > main:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)');
    expect(findByPath(path)).toBe(second);
    expect(pathFor(document.body)).toBe('body');
  });

  test('findByPath returns null for a missing or broken path', () => {
    expect(findByPath('#nope > div:nth-of-type(1)')).toBe(null);
    expect(findByPath('>>> not a selector')).toBe(null);
  });

  test('marks inside the typed headline attach to the stable headline instead', () => {
    const letter = document.querySelector('.ch');
    expect(stableTarget(letter)).toBe(document.querySelector('.solo'));
    const h3 = document.querySelector('#story h3');
    expect(stableTarget(h3)).toBe(h3);
  });
});

describe('fractions', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  test('toFraction/fromFraction round-trip', () => {
    expect(toFraction(rect, 150, 75)).toEqual({ fx: 0.25, fy: 0.25 });
    expect(fromFraction(rect, 0.25, 0.25)).toEqual({ x: 150, y: 75 });
  });

  test('toFraction clamps outside points to 0–1', () => {
    expect(toFraction(rect, 0, 500)).toEqual({ fx: 0, fy: 1 });
  });

  test('resolveAnchor returns null for a missing path', () => {
    expect(resolveAnchor({ path: '#nope > div:nth-of-type(1)', fx: 0.5, fy: 0.5, vw: 1440 })).toBe(null);
  });
});

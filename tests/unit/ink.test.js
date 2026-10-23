import { describe, expect, test } from 'vitest';
import { INK, bounds, centerline, fromFlat, inkWidth, isAlongText, penOutline, simplify, sketchSvg, toFlat } from '../../review/ink.js';

// Endpoints of each M/L/A command in a path: left side forward, cap, right side back, cap.
function endpoints(d) {
  return [...d.matchAll(/([MLQA])([^MLQAZ]*)/g)].map(m => {
    const n = m[2].match(/-?\d*\.?\d+/g).map(Number);
    return { cmd: m[1], x: n[n.length - 2], y: n[n.length - 1] };
  });
}
const line = n => Array.from({ length: n }, (_, i) => [i * 2, 0]);

describe('flat points', () => {
  test('simplify drops points under 1px apart and keeps the last', () => {
    expect(simplify([[0, 0], [0.4, 0], [2, 0], [2.3, 0]])).toEqual([[0, 0], [2, 0], [2.3, 0]]);
  });
  test('toFlat and fromFlat round-trip at scale 1 and double at scale 2', () => {
    const origin = { x: 10, y: 20 };
    const pts = [[10, 20], [12.5, 24], [30, 21.5]];
    const flat = toFlat(pts, origin);
    expect(flat).toEqual([0, 0, 2.5, 4, 20, 1.5]);
    expect(fromFlat(flat, origin)).toEqual(pts);
    expect(fromFlat(flat, origin, 2)).toEqual([[10, 20], [15, 28], [50, 23]]);
  });
  test('toFlat rounds to halves', () => {
    expect(toFlat([[1.26, 0]], { x: 0, y: 0 })).toEqual([1.5, 0]);
  });
  test('bounds', () => {
    expect(bounds([[2, 3], [10, 1], [5, 9]])).toEqual({ x: 2, y: 1, w: 8, h: 8 });
  });
});

describe('penOutline', () => {
  test('is closed and thinner at the ends than the middle', () => {
    const d = penOutline(line(40), { width: 4 });
    expect(d.endsWith('Z')).toBe(true);
    const left = endpoints(d).slice(0, 40);
    expect(Math.abs(left[0].y)).toBeLessThan(1.2);
    expect(Math.abs(left[39].y)).toBeLessThan(1.2);
    expect(Math.abs(left[20].y)).toBeGreaterThan(1.6);
  });
  test('uses pressure when given', () => {
    const half = p => Math.max(...endpoints(penOutline(line(40), { width: 4, pressures: Array(40).fill(p) })).map(e => Math.abs(e.y)));
    expect(half(1)).toBeGreaterThan(half(0.2));
  });
  test('a single point is a small closed circle', () => {
    expect(penOutline([[5, 5]], { width: 4 }).endsWith('Z')).toBe(true);
  });
});

describe('centerline', () => {
  test('smooths through midpoints', () => {
    expect(centerline([[0, 0], [10, 0], [20, 10]])).toBe('M0 0 Q10 0 15 5 L20 10');
  });
});

describe('isAlongText', () => {
  test('an underline yes, a circle no, a back-and-forth scribble no', () => {
    const underline = Array.from({ length: 30 }, (_, i) => [i * 5, 100 + (i % 2)]);
    const circle = Array.from({ length: 40 }, (_, i) => [50 + 40 * Math.cos(i / 39 * 2 * Math.PI), 50 + 40 * Math.sin(i / 39 * 2 * Math.PI)]);
    const scribble = [[0, 0], [100, 5], [0, 10], [100, 15], [10, 20]];
    expect(isAlongText(underline)).toBe(true);
    expect(isAlongText(circle)).toBe(false);
    expect(isAlongText(scribble)).toBe(false);
  });
});

describe('inkWidth', () => {
  test('is wider at 390 than at 1440', () => {
    for (const ink of ['pen', 'highlighter']) {
      expect(inkWidth(ink, 390)).toBeGreaterThan(inkWidth(ink, 1440));
      expect(inkWidth(ink, 759)).toBe(INK[ink].phoneWidth);
      expect(inkWidth(ink, 760)).toBe(INK[ink].width);
    }
  });
});

describe('sketchSvg', () => {
  test('fits two strokes far apart into the box', () => {
    const a = { ink: 'pen', size: 1, origin: { x: 100, y: 100 }, pts: [0, 0, 10, 5, 20, 0, 30, 8] };
    const b = { ink: 'highlighter', size: 1, origin: { x: 1500, y: 900 }, pts: [0, 0, 60, 4, 120, 0] };
    const svg = sketchSvg([a, b]);
    expect(svg.startsWith('<svg viewBox="0 0 96 56"')).toBe(true);
    const ds = [...svg.matchAll(/ d="([^"]*)"/g)].map(m => m[1]);
    expect(ds.length).toBe(2);
    for (const d of ds) for (const e of endpoints(d)) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(96);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(56);
    }
  });
});

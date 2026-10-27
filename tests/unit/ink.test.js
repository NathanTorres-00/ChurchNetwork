import { describe, expect, test } from 'vitest';
import { INK, bounds, centerline, eraseLine, fromFlat, inkWidth, isAlongText, linesNear, penOutline, segmentDistance, simplify, sketchSvg, toFlat } from '../../review/ink.js';

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
  test('a pressures array shorter than the points gives no NaN', () => {
    expect(penOutline(line(10), { width: 4, pressures: [1, 1, 1] })).not.toContain('NaN');
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
    for (const ink of ['pen', 'highlighter', 'eraser']) {
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

describe('segmentDistance and linesNear', () => {
  test('crossing segments are 0 apart, parallel ones their gap, and a segment end the distance to the other', () => {
    expect(segmentDistance([0, 0], [10, 10], [0, 10], [10, 0])).toBe(0);
    expect(segmentDistance([0, 0], [10, 0], [0, 5], [10, 5])).toBe(5);
    expect(segmentDistance([0, 0], [10, 0], [13, 4], [20, 4])).toBe(5);
    expect(segmentDistance([3, 4], [3, 4], [0, 0], [0, 0])).toBe(5);
  });
  test('a sweep across a circle is near it; one beside it, or through its middle, is not', () => {
    const circle = Array.from({ length: 40 }, (_, i) => [50 + 40 * Math.cos(i / 39 * 2 * Math.PI), 50 + 40 * Math.sin(i / 39 * 2 * Math.PI)]);
    expect(linesNear([[0, 50], [20, 50]], circle, 8)).toBe(true);
    expect(linesNear([[120, 0], [120, 100]], circle, 8)).toBe(false);
    expect(linesNear([[50, 40], [50, 60]], circle, 8)).toBe(false);
  });
  test('a single point counts', () => {
    expect(linesNear([[5, 3]], [[0, 0], [10, 0]], 4)).toBe(true);
    expect(linesNear([[5, 3]], [[0, 0], [10, 0]], 2)).toBe(false);
  });
});

describe('eraseLine', () => {
  const flatLine = Array.from({ length: 11 }, (_, i) => [i * 10, 0]);   // 0..100 along y = 0
  const ends = pieces => pieces.map(p => [p[0][0], p[p.length - 1][0]]);

  test('a dab in the middle cuts the line in two, as wide as the eraser, with the ends at its edge', () => {
    const pieces = eraseLine(flatLine, 1, [[50, 0]], 8);
    expect(pieces).toHaveLength(2);
    const [[a0, a1], [b0, b1]] = ends(pieces);
    expect(a0).toBe(0);
    expect(b1).toBe(100);
    expect(a1).toBeGreaterThanOrEqual(41);
    expect(a1).toBeLessThan(43);
    expect(b0).toBeGreaterThan(57);
    expect(b0).toBeLessThanOrEqual(59);
  });
  test('the eraser touching only the edge of thick ink still cuts it', () => {
    expect(eraseLine(flatLine, 10, [[50, 15]], 8)).toHaveLength(2);
    expect(eraseLine(flatLine, 10, [[50, 19]], 8)).toBeNull();
  });
  test('a sweep along the whole line wipes it; one off the end trims it', () => {
    expect(eraseLine(flatLine, 1, [[-10, 0], [110, 0]], 8)).toEqual([]);
    const [piece] = eraseLine(flatLine, 1, [[100, 0], [130, 0]], 8);
    expect(piece[0][0]).toBe(0);
    expect(piece[piece.length - 1][0]).toBeLessThan(93);
  });
  test('keeps the line\'s own points and carries pressure to the new ends', () => {
    const pressed = flatLine.map(([x, y]) => [x, y, x / 100]);
    const [left] = eraseLine(pressed, 1, [[50, 0]], 8);
    expect(left.slice(0, 5)).toEqual(pressed.slice(0, 5));
    const end = left[left.length - 1];
    expect(end[2]).toBeCloseTo(end[0] / 100, 5);
  });
  test('misses return null', () => {
    expect(eraseLine(flatLine, 1, [[50, 30]], 8)).toBeNull();
  });
});

describe('penOutline cut ends', () => {
  test('a cut end is square and full width instead of a tapered round tip', () => {
    const pts = line(12);
    const round = penOutline(pts, { width: 10 });
    const square = penOutline(pts, { width: 10, cut: 3 });
    expect(round).toMatch(/A/);
    expect(square).not.toMatch(/A/);
    const firstY = d => Math.abs(endpoints(d)[0].y);
    expect(firstY(square)).toBeGreaterThan(firstY(round));
  });
});

// Geometry for freehand marks: ink styles, point simplifying, smoothing and the pen's tapered outline. Pure
// functions on points ([x, y] pairs) with no DOM, so they can be tested without a browser.

export const INK = {
  pen: { color: '#D93A22', width: 2.6, phoneWidth: 4 },
  highlighter: { color: 'rgba(255, 205, 40, .5)', width: 16, phoneWidth: 24 },
  eraser: { width: 16, phoneWidth: 24 },          // no ink of its own: how wide a path it clears
};

const PHONE = 759;
const r2 = v => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function inkWidth(ink, viewportWidth = globalThis.innerWidth) {
  return viewportWidth <= PHONE ? INK[ink].phoneWidth : INK[ink].width;
}

export function simplify(points, minDist = 1) {
  const out = [];
  points.forEach((p, i) => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDist || i === points.length - 1) out.push(p);
  });
  return out;
}

export function bounds(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function toFlat(points, origin) {
  const half = v => Math.round(v * 2) / 2;
  return points.flatMap(p => [half(p[0] - origin.x), half(p[1] - origin.y)]);
}

export function fromFlat(flat, origin, scale = 1) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push([origin.x + flat[i] * scale, origin.y + flat[i + 1] * scale]);
  return out;
}

export function centerline(points) {
  if (!points.length) return '';
  const [first, ...rest] = points;
  let d = `M${r2(first[0])} ${r2(first[1])}`;
  rest.forEach((p, i) => {
    const next = rest[i + 1];
    d += next
      ? ` Q${r2(p[0])} ${r2(p[1])} ${r2((p[0] + next[0]) / 2)} ${r2((p[1] + next[1]) / 2)}`
      : ` L${r2(p[0])} ${r2(p[1])}`;
  });
  return d;
}

// cut: 1 when the line starts where the eraser cut it, 2 when it ends there, 3 for both. A cut end is square, at
// full width, rather than tapering to a rounded tip.
export function penOutline(points, { width, pressures, cut = 0 } = {}) {
  const n = points.length;
  if (!n) return '';
  if (n === 1) {
    const [x, y] = points[0];
    const r = r2(width / 2);
    return `M${r2(x - r)} ${r2(y)} A${r} ${r} 0 1 0 ${r2(x + r)} ${r2(y)} A${r} ${r} 0 1 0 ${r2(x - r)} ${r2(y)} Z`;
  }
  const left = [];
  const right = [];
  const half = [];
  let normal = [0, 1];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len) normal = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    const taper = 0.35 + 0.65 * Math.min(1, cut & 1 ? 1 : i / 6, cut & 2 ? 1 : (n - 1 - i) / 6);
    const seg = i ? Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) : 0;
    const pr = pressures?.[i];
    const factor = Number.isFinite(pr) ? 0.4 + 0.9 * pr : clamp(1.15 - seg / 30, 0.55, 1.15);
    const h = (width * taper * factor) / 2;
    half.push(h);
    left.push([p[0] + normal[0] * h, p[1] + normal[1] * h]);
    right.push([p[0] - normal[0] * h, p[1] - normal[1] * h]);
  });
  const pt = p => `${r2(p[0])} ${r2(p[1])}`;
  const cap = (h, to) => `A${r2(h)} ${r2(h)} 0 0 0 ${pt(to)}`;
  return [
    `M${pt(left[0])}`,
    ...left.slice(1).map(p => `L${pt(p)}`),
    cut & 2 ? `L${pt(right[n - 1])}` : cap(half[n - 1], right[n - 1]),
    ...right.slice(0, -1).reverse().map(p => `L${pt(p)}`),
    cut & 1 ? `L${pt(left[0])}` : cap(half[0], left[0]),
    'Z',
  ].join(' ');
}

// A stroke that runs along a line of text (an underline or a strike) rather than circling or scribbling.
export function isAlongText(points) {
  if (points.length < 2) return false;
  const { w, h } = bounds(points);
  if (w < 24 || h > Math.max(40, 0.35 * w)) return false;
  return Math.abs(points[points.length - 1][0] - points[0][0]) >= 0.6 * w;
}

function pointToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// The shortest distance between segments ab and cd: 0 where they cross
export function segmentDistance(a, b, c, d) {
  if (cross(c, d, a) * cross(c, d, b) < 0 && cross(a, b, c) * cross(a, b, d) < 0) return 0;
  return Math.min(pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b));
}

// Whether two lines of points come within `reach` of each other anywhere (a single point is a line too)
export function linesNear(p, q, reach) {
  const segments = pts => (pts.length === 1 ? [[pts[0], pts[0]]] : pts.slice(1).map((pt, i) => [pts[i], pt]));
  const qs = segments(q);
  return segments(p).some(([a, b]) => qs.some(([c, d]) => segmentDistance(a, b, c, d) <= reach));
}

// Rubs out a line where an eraser of radius `reach` passed along `path`. The line's points are [x, y] or [x, y,
// pressure]; `half` is half the ink's width. Each point is wiped when the eraser reaches any part of the ink across
// the line there, so the ink is cut straight across, as wide as the eraser. Returns the pieces left (each two
// points or more, the new ends placed where the eraser's edge crossed), or null when the eraser missed it.
const ERASE_STEP = 1;          // px between the points tried near the eraser
export function eraseLine(points, half, path, reach) {
  if (points.length < 2 || !linesNear(path, points, reach + half)) return null;
  const sweep = path.length === 1 ? [[path[0], path[0]]] : path.slice(1).map((p, i) => [path[i], p]);
  // the line's points, with more in between near the eraser so it cuts where its edge is, not at the next point
  const dense = [];
  points.forEach((p, i) => {
    dense.push({ p, kept: true });
    const q = points[i + 1];
    if (!q || !sweep.some(([a, b]) => segmentDistance(p, q, a, b) <= reach + half)) return;
    const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / ERASE_STEP);
    for (let k = 1; k < n; k++) dense.push({ p: p.map((v, j) => v + (q[j] - v) * k / n), kept: false });
  });
  let normal = [0, 1];
  const wiped = dense.map(({ p }, i) => {
    const a = dense[Math.max(0, i - 1)].p, b = dense[Math.min(dense.length - 1, i + 1)].p;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len) normal = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    const across = [[p[0] - normal[0] * half, p[1] - normal[1] * half], [p[0] + normal[0] * half, p[1] + normal[1] * half]];
    return sweep.some(([c, d]) => segmentDistance(across[0], across[1], c, d) <= reach);
  });
  if (!wiped.some(Boolean)) return null;
  // runs of what's left, keeping the line's own points and each run's ends
  const pieces = [];
  let run = [];
  dense.forEach((d, i) => {
    if (wiped[i]) { if (run.length) pieces.push(run); run = []; return; }
    const last = i === dense.length - 1 || wiped[i + 1];
    if (d.kept || !run.length || last) run.push(d.p);
  });
  if (run.length) pieces.push(run);
  return pieces.filter(r => r.length >= 2);
}

// A small preview of strokes (each { ink, origin, pts }) scaled into a w x h box with 4px padding.
export function sketchSvg(strokes, { w = 96, h = 56 } = {}) {
  const pad = 4;
  const placed = strokes.map(s => ({ s, pts: fromFlat(s.pts, s.origin) }));
  const all = placed.flatMap(p => p.pts);
  if (!all.length) return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  const b = bounds(all);
  const scale = Math.min((w - pad * 2) / (b.w || 1), (h - pad * 2) / (b.h || 1));
  const dx = (w - b.w * scale) / 2 - b.x * scale;
  const dy = (h - b.h * scale) / 2 - b.y * scale;
  const paths = placed.map(({ s, pts }) => {
    const fit = pts.map(p => [p[0] * scale + dx, p[1] * scale + dy]);
    const { color } = INK[s.ink];
    const width = INK[s.ink].width * (s.w ?? 1);
    if (s.ink === 'pen') return `<path d="${penOutline(fit, { width: clamp(width * scale, 1, 4), pressures: s.pr, cut: s.cut })}" fill="${color}"/>`;
    return `<path d="${centerline(fit)}" fill="none" stroke="${color}" stroke-width="${r2(clamp(width * scale, 2, 10))}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
}

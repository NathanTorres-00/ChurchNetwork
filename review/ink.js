// Geometry for freehand marks: ink styles, point simplifying, smoothing and the pen's tapered outline. Pure
// functions on points ([x, y] pairs) with no DOM, so they can be tested without a browser.

export const INK = {
  pen: { color: '#D93A22', width: 2.6, phoneWidth: 4 },
  highlighter: { color: 'rgba(255, 205, 40, .5)', width: 16, phoneWidth: 24 },
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

export function penOutline(points, { width, pressures } = {}) {
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
    const taper = 0.35 + 0.65 * Math.min(1, i / 6, (n - 1 - i) / 6);
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
    cap(half[n - 1], right[n - 1]),
    ...right.slice(0, -1).reverse().map(p => `L${pt(p)}`),
    cap(half[0], left[0]),
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
    const { color, width } = INK[s.ink];
    if (s.ink === 'pen') return `<path d="${penOutline(fit, { width: clamp(width * scale, 1, 3), pressures: s.pr })}" fill="${color}"/>`;
    return `<path d="${centerline(fit)}" fill="none" stroke="${color}" stroke-width="${r2(clamp(width * scale, 3, 8))}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
}

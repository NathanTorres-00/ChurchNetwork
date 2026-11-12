/* The Gallery engine: a close-up of a pale globe turning, with networks of dots growing across it and dots
   opening into photos. Shared by the Gallery tab (network-gallery.html) and the hero (hero.html).
   d3 and d3-geo-projection are globals from the CDN; nothing here touches the DOM until createGallery() runs. */

// Placeholder landscapes (Unsplash). Later: photos of house churches and campuses in the network.
export const PHOTO_IDS = [
  '1506905925346-21bda4d32df4', '1501785888041-af3ef285b470', '1470071459604-3b5ec3a7fe05',
  '1441974231531-c6227db76b6e', '1472214103451-9374bd1c798e', '1469474968028-56623f02e42e',
  '1447752875215-b2761acb3c5d', '1433086966358-54859d0ed716', '1500534314209-a25ddb2bd429',
  '1464822759023-fed622ff2c3b', '1426604966848-d7adac402bff', '1418065460487-3e41a6c84dc5',
  '1505765050516-f72dcac9c60e', '1501854140801-50d01698950b', '1476514525535-07fb3b4ae5f1',
  '1439066615861-d1af74d74000', '1454496522488-7a8e488e8606', '1500382017468-9049fed747ef',
  '1507525428034-b723cf961d3e', '1475924156734-496f6cac6ec1', '1465146344425-f00d5f5c8f07',
  '1490750967868-88aa4486c946', '1482192505345-5655af888cc4', '1444464666168-49d633b86797',
];
export const photoUrl = id => `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&q=70&auto=format`;

const pct = v => Math.round(v * 100) + '%';
const sec = v => v.toFixed(1) + 's';
const times = v => '×' + v.toFixed(2);
export const GALLERY_CONTROLS = [
  { group: 'Camera', items: [
    { key: 'spin', label: 'Spin speed', type: 'range', min: 0, max: 12, step: 0.1, fmt: v => v.toFixed(1) + '°/s' },
    { key: 'zoom', label: 'Zoom', type: 'range', min: 0.5, max: 4, step: 0.05, fmt: times },
    { key: 'distance', label: 'Camera distance (curve)', type: 'range', min: 1.15, max: 6, step: 0.05, fmt: v => v.toFixed(2) },
    { key: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 35, step: 1, fmt: v => v + '°' },
  ]},
  { group: 'Globe position', items: [
    { key: 'offsetX', label: 'Move sideways', type: 'range', min: -60, max: 60, step: 1, fmt: v => v + '%' },
    { key: 'offsetY', label: 'Move up or down', type: 'range', min: -60, max: 60, step: 1, fmt: v => v + '%' },
    { key: 'latitude', label: 'Latitude facing camera', type: 'range', min: -70, max: 70, step: 1, fmt: v => v + '°' },
    { key: 'roll', label: 'Roll (travel direction)', type: 'range', min: -180, max: 180, step: 1, fmt: v => v + '°' },
    { key: 'startLon', label: 'Starting longitude', type: 'range', min: -180, max: 180, step: 1, fmt: v => v + '°' },
  ]},
  { group: 'Grid', items: [
    { key: 'gridStep', label: 'Grid spacing', type: 'range', min: 4, max: 30, step: 0.5, fmt: v => v + '°', rebuild: true },
    { key: 'wobble', label: 'Hand-drawn wobble', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct, rebuild: true },
    { key: 'wobbleScale', label: 'Wobble frequency', type: 'range', min: 0.3, max: 3, step: 0.05, fmt: times, rebuild: true },
    { key: 'lineWidth', label: 'Grid line width', type: 'range', min: 0, max: 4, step: 0.05, fmt: v => v.toFixed(2) + 'px' },
    { key: 'lineColor', label: 'Line color', type: 'color' },
    { key: 'globeColor', label: 'Globe color', type: 'color' },
    { key: 'bgColor', label: 'Background', type: 'color' },
  ]},
  { group: 'Dots', items: [
    { key: 'layout', label: 'Dot layout (grid lines)', type: 'select', options: [['random', 'Random'], ['checker', 'Checkerboard']], rebuild: true },
    { key: 'dotShare', label: 'Dots at crossings (random layout)', type: 'range', min: 0.05, max: 1, step: 0.01, fmt: pct, rebuild: true },
    { key: 'dotSize', label: 'Dot size', type: 'range', min: 0.08, max: 0.6, step: 0.01, fmt: pct, rebuild: true },
    { key: 'sizeVariety', label: 'Size variety', type: 'range', min: 0, max: 0.5, step: 0.01, fmt: pct, rebuild: true },
    { key: 'dotColor', label: 'Dot color', type: 'color' },
  ]},
  { group: 'Network', items: [
    { key: 'connect', label: 'Lines', type: 'select', options: [['grid', 'Grid'], ['networks', 'Networks']], rebuild: true },
    { key: 'growth', label: 'Growth', type: 'select', options: [['grown', 'Fully grown'], ['growing', 'Growing']], regrow: true },
    { key: 'growStart', label: 'Growth starts (growing)', type: 'select', options: [['edge', 'At the edge'], ['wave', 'Wave'], ['inview', 'In view']], regrow: true },
    { key: 'revealLine', label: 'Reveal line, in from the edge', type: 'range', min: 0, max: 0.6, step: 0.01, fmt: pct },
    { key: 'lineStyle', label: 'Line style', type: 'select', options: [['arc', 'Arched'], ['straight', 'Straight'], ['s', 'S-curve'], ['grid', 'Along the grid']] },
    { key: 'netLineWidth', label: 'Network line width', type: 'range', min: 0, max: 6, step: 0.05, fmt: v => v.toFixed(2) + 'px' },
    { key: 'arch', label: 'Arch amount', type: 'range', min: 0, max: 0.8, step: 0.01, fmt: pct },
    { key: 'sentStyle', label: 'Sent-out lines', type: 'select', options: [['dashed', 'Dashed'], ['solid', 'Solid']] },
    { key: 'sentArch', label: 'Sent-out arch', type: 'range', min: 0, max: 0.8, step: 0.01, fmt: pct },
    { key: 'generations', label: 'Generations', type: 'range', min: 1, max: 7, step: 1, fmt: v => v, rebuild: true },
    { key: 'sendCount', label: 'New networks sent out (up to)', type: 'range', min: 0, max: 6, step: 1, fmt: v => v, rebuild: true },
    { key: 'genTime', label: 'Time per generation (growing)', type: 'range', min: 0.2, max: 3, step: 0.05, fmt: v => v.toFixed(2) + 's' },
    { key: 'genPause', label: 'Pause between generations (growing)', type: 'range', min: 0, max: 2, step: 0.05, fmt: v => v.toFixed(2) + 's' },
    { key: 'gridStrength', label: 'Grid behind networks', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
  ]},
  { group: 'Openings', items: [
    { key: 'autoEvery', label: 'Time between openings', type: 'range', min: 0.5, max: 10, step: 0.1, fmt: sec },
    { key: 'autoJitter', label: 'Timing randomness', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
    { key: 'openFor', label: 'Stays open', type: 'range', min: 0.5, max: 10, step: 0.1, fmt: sec },
    { key: 'openTime', label: 'Open / close time', type: 'range', min: 0.1, max: 2.5, step: 0.05, fmt: v => v.toFixed(2) + 's' },
    { key: 'maxOpen', label: 'Most open at once', type: 'range', min: 1, max: 8, step: 1, fmt: v => v },
    { key: 'autoSize', label: 'Automatic opening size', type: 'range', min: 1.2, max: 5, step: 0.05, fmt: times },
    { key: 'hoverSize', label: 'Hover opening size', type: 'range', min: 1.2, max: 6, step: 0.05, fmt: times },
    { key: 'edgeRoom', label: 'Room from the edges', type: 'range', min: 0, max: 200, step: 2, fmt: v => v + 'px' },
    { key: 'pauseAutoOnHover', label: 'Pause automatic openings on hover', type: 'check' },
    { key: 'slowOnHover', label: 'Stop the globe on hover', type: 'check' },
  ]},
];

/* ---------- Helpers (pure) ---------- */

// Settings stored under a prefix (the hero keeps `gallerySpin` beside the Pins globe's own `spin`), read without it
export function prefixedConfig(cfg, prefix) {
  const full = k => prefix + k[0].toUpperCase() + k.slice(1);
  return new Proxy(cfg, {
    get: (o, k) => typeof k === 'string' ? o[full(k)] : undefined,
    set: (o, k, v) => { o[full(k)] = v; return true; },
    has: (o, k) => typeof k === 'string' && full(k) in o,
    ownKeys: o => Object.keys(o).filter(k => k.startsWith(prefix) && k.length > prefix.length)
      .map(k => k[prefix.length].toLowerCase() + k.slice(prefix.length + 1)),
    getOwnPropertyDescriptor: (o, k) => {
      const d = typeof k === 'string' ? Object.getOwnPropertyDescriptor(o, full(k)) : undefined;
      return d && { ...d, configurable: true };
    },
  });
}

/* The quiet centre: an ellipse q = { cx, cy, rx, ry } (canvas px) around the hero's copy where the gallery recedes.
   quietFactor is 0 deep inside, 1 outside, easing across a soft band `softness` (share of the radius) wide. */
export function quietFactor(x, y, q, softness) {
  if (!q) return 1;
  const e = Math.hypot((x - q.cx) / q.rx, (y - q.cy) / q.ry), inner = 1 - softness;
  if (e <= inner) return 0;
  if (e >= 1) return 1;
  const u = (e - inner) / (1 - inner);
  return u * u * (3 - 2 * u);
}
// A circle of radius R at (x, y) stays clear of the ellipse (the ellipse grown by R holds every touching circle)
export function clearOfQuiet(x, y, R, q) {
  if (!q) return true;
  return ((x - q.cx) / (q.rx + R)) ** 2 + ((y - q.cy) / (q.ry + R)) ** 2 >= 1;
}
// Clear of the ellipse but within `width` px of it
export function inHalo(x, y, R, q, width) {
  if (!q) return true;
  return clearOfQuiet(x, y, R, q) && ((x - q.cx) / (q.rx + R + width)) ** 2 + ((y - q.cy) / (q.ry + R + width)) ** 2 <= 1;
}
// Wholly above or wholly below the ellipse (phones, where the copy fills the width)
export function aboveOrBelow(y, R, q) {
  return y + R <= q.cy - q.ry || y - R >= q.cy + q.ry;
}

const hexRgb = h => { const n = parseInt(h.replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// a at t = 0, b at t = 1
export function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/* createGallery({ canvas, stage, cfg, photos, ... }) draws into `canvas`, sized to `stage`.
   `cfg` is read live every frame (the keys of the Gallery tab's CONFIG). Nothing loads until loadPhotos().
   Optional, for the hero (left out, the gallery behaves as on the Gallery tab):
     insets()          px the Adjust panel covers on the right (r) and bottom (b)
     onStatus(text)    a one-line status for the panel
     quiet()           the quiet-centre ellipse { cx, cy, rx, ry } in canvas px, or null
     viewBottom()      px from the canvas top that count as the bottom of the view for openings
     hoverBlocked(x,y) true where hovering or tapping must not open a dot (canvas px)
     autoGate()        automatic openings wait while this is false
     tapSlop           px a touch may move and still count as a tap (opens on lift); unset, a touch opens on press */
export function createGallery({ canvas, stage, cfg, photos, insets, onStatus, quiet, viewBottom, hoverBlocked, autoGate, tapSlop }) {
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMq = window.matchMedia('(max-width: 640px)');
  let Q = null;                              // this frame's quiet-centre ellipse (hero only)

  /* ---------- Photos (created by loadPhotos) ---------- */
  const images = photos.map(() => null);
  const ready = img => !!img && img.complete && img.naturalWidth > 0;
  function loadPhotos() {
    photos.forEach((url, i) => {
      if (images[i]) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      images[i] = img;
    });
  }

  /* ---------- Grid + dots ----------
     Grid lines run along meridians and parallels, nudged by a smooth wander so they read as hand-drawn.
     The wander depends only on the undisplaced position, so lines still cross exactly where a dot sits. */
  let gridShape = null;     // MultiLineString in lon/lat
  let dots = [];

  function wanderFor(seed) {
    const r = mulberry32(seed * 7919 + 13);
    const ph = Array.from({ length: 8 }, () => r() * TAU);
    return (lon, lat) => {
      const amp = cfg.wobble * cfg.gridStep * 0.22, f = cfg.wobbleScale;
      const a = lon * DEG, b = lat * DEG;
      const dLat = amp * (0.6 * Math.sin(a * 3.1 * f + b * 1.7 * f + ph[0]) + 0.4 * Math.sin(a * 7.3 * f - b * 4.1 * f + ph[1]));
      const dLon = amp * (0.6 * Math.sin(b * 3.4 * f - a * 1.9 * f + ph[2]) + 0.4 * Math.sin(b * 6.7 * f + a * 4.3 * f + ph[3]))
        / Math.max(0.2, Math.cos(b));
      return [lon + dLon, lat + dLat];
    };
  }

  function build() {
    const step = cfg.gridStep, wander = wanderFor(cfg.seed);
    const rng = mulberry32(cfg.seed);
    const latMax = Math.floor(80 / step) * step;
    const lines = [];
    // Meridians from pole cap to pole cap; parallels all the way round
    for (let lon = -180; lon < 180 - 1e-6; lon += step) {
      const line = [];
      for (let lat = -latMax; lat <= latMax + 1e-6; lat += 1) line.push(wander(lon, lat));
      lines.push(line);
    }
    for (let lat = -latMax; lat <= latMax + 1e-6; lat += step) {
      const line = [];
      for (let lon = -180; lon <= 180 + 1e-6; lon += 1) line.push(wander(lon, lat));
      lines.push(line);
    }
    gridShape = { type: 'MultiLineString', coordinates: lines };

    dots = [];
    let n = 0, nCols = 0;
    const net = cfg.connect === 'networks';
    const checker = net || cfg.layout === 'checker';     // networks always sit on the checkerboard
    const cell = new Map();
    for (let i = 0, lon = -180; lon < 180 - 1e-6; i++, lon += step) {
      nCols = i + 1;
      for (let j = 0, lat = -latMax; lat <= latMax + 1e-6; j++, lat += step) {
        const pick = rng(), vary = rng(), ph = rng();
        if (checker ? (i + j) % 2 : pick > cfg.dotShare) continue;
        dots.push({
          i, j, node: null, shown: 1, geo: false, onScreen: false, r0: 0,
          ll: wander(lon, lat),
          rDeg: cfg.dotSize * step * (1 + cfg.sizeVariety * (vary * 2 - 1)),
          photo: Math.floor(ph * images.length),
          id: n++,
          amt: 0, size: 1, goal: 0, kind: null, until: 0,   // opening state
          vis: false, x: 0, y: 0, r: 0,                    // screen state, set each frame
        });
      }
    }
    dots.forEach(d => cell.set(d.i + ',' + d.j, d));
    networks = net ? buildNetworks(cell, nCols, wander, step, latMax) : [];
    if (net) dots = dots.filter(d => d.node);           // only dots that belong to a network are drawn
    // Neighbors never share a photo
    dots.forEach((d, i) => { d.photo = (d.photo + i) % images.length; });
  }

  /* ---------- Networks ----------
     On the checkerboard a dot's nearest neighbors are its four diagonals. A network starts at one dot; each dot
     takes up to two children on free diagonals further from the first dot, for `generations` rounds. Then up to
     `sendCount` last-generation dots each skip one spacing (the crossing they jump over stays empty) and start a
     new network there, which grows and sends in turn. When the sending runs out of room, a fresh network starts
     wherever there's space, until the globe is covered. */
  let networks = [];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  function buildNetworks(cell, nCols, wander, step, latMax) {
    const rng = mulberry32(cfg.seed * 31 + 5);
    const G = Math.round(cfg.generations);
    const wrapI = i => ((i % nCols) + nCols) % nCols;
    const at = (i, j) => cell.get(wrapI(i) + ',' + j);
    const lonOf = i => -180 + i * step, latOf = j => -latMax + j * step;
    const wrapDi = (a, b) => { let d = b - a; if (d > nCols / 2) d -= nCols; if (d < -nCols / 2) d += nCols; return d; };
    const dist = (a, b) => Math.hypot(wrapDi(a.i, b.i), b.j - a.j);
    const reserved = new Set();
    const free = d => d && !d.node && !reserved.has(d);
    const shuffle = a => {
      for (let k = a.length - 1; k > 0; k--) { const m = Math.floor(rng() * (k + 1)); [a[k], a[m]] = [a[m], a[k]]; }
      return a;
    };
    // The grid's own path from one crossing to another: along the parallel, then along the meridian
    const gridRoute = (from, di, dj, k) => {
      const pts = [], i0 = from.i, j0 = from.j, N = 8 * k;
      for (let s = 0; s <= N; s++) pts.push(wander(lonOf(i0 + di * k * s / N), latOf(j0)));
      for (let s = 1; s <= N; s++) pts.push(wander(lonOf(i0 + di * k), latOf(j0 + dj * k * s / N)));
      return pts;
    };

    const nets = [], queue = [];
    function start(rootDot, from) {
      const nw = { nodes: [], sends: [], from, state: 'dormant', start: 0, out: 0 };
      const root = { dot: rootDot, gen: 0, parent: null, net: nw };
      rootDot.node = root; nw.root = root; nw.nodes.push(root);
      nets.push(nw); queue.push(nw);
      return nw;
    }
    function grow(nw) {
      let frontier = [nw.root];
      for (let g = 1; g <= G && frontier.length; g++) {
        const next = [];
        for (const p of frontier) {
          const pd = dist(nw.root.dot, p.dot);
          const cands = shuffle(DIAG.map(([di, dj]) => [di, dj, at(p.dot.i + di, p.dot.j + dj)]))
            .filter(([, , d]) => free(d) && dist(nw.root.dot, d) > pd);
          for (const [di, dj, d] of cands.slice(0, 2)) {
            const node = { dot: d, gen: g, parent: p, net: nw, bow: rng() < 0.5 ? -1 : 1, route: gridRoute(p.dot, di, dj, 1) };
            d.node = node; nw.nodes.push(node); next.push(node);
          }
        }
        frontier = next;
      }
      let want = Math.round(cfg.sendCount);
      for (const n of shuffle(nw.nodes.filter(n => n.gen === G))) {
        if (want <= 0) break;
        // Carry on in the direction the branch was already heading, else try the other outward diagonals
        const di0 = Math.sign(wrapDi(n.parent.dot.i, n.dot.i)), dj0 = Math.sign(n.dot.j - n.parent.dot.j);
        const dirs = [[di0, dj0], ...shuffle(DIAG.filter(([a, b]) => !(a === di0 && b === dj0) && !(a === -di0 && b === -dj0)))];
        for (const [di, dj] of dirs) {
          const mid = at(n.dot.i + di, n.dot.j + dj), target = at(n.dot.i + 2 * di, n.dot.j + 2 * dj);
          if (!free(target) || (mid && !free(mid))) continue;
          if (mid) reserved.add(mid);
          const child = start(target, n);
          nw.sends.push({ from: n, to: child, bow: rng() < 0.5 ? -1 : 1, route: gridRoute(n.dot, di, dj, 2) });
          want--;
          break;
        }
      }
    }

    // The first network starts in front of the camera, so it's the one you see first
    const all = [...cell.values()];
    let first = all[0], best = Infinity;
    for (const d of all) {
      const g = d3.geoDistance(d.ll, [cfg.startLon, cfg.latitude]);
      if (g < best) { best = g; first = d; }
    }
    if (first) start(first, null);
    const order = shuffle(all);
    for (;;) {
      while (queue.length) grow(queue.shift());
      const roomy = order.find(d => free(d) && DIAG.every(([a, b]) => { const o = at(d.i + a, d.j + b); return !o || free(o); }));
      if (!roomy) break;
      start(roomy, null);
    }
    return nets;
  }

  /* Growing: a network starts when any of its dots turns into view (its branches grow in from its first dot), unless the network that sent it is already
     growing; then it waits for the sent-out line to arrive. Lines draw out one generation at a time and each
     dot pops in as its line reaches it. A network that has been out of view for a while resets. */
  const ROOT_IN = 0.6, POP = 0.35;
  let gt = 0;                                           // growth clock; stops while paused
  const growingMode = () => cfg.growth === 'growing' && !reduceMotion;
  const genStart = (nw, g) => nw.start + (g === 0 ? 0 : ROOT_IN + (g - 1) * (cfg.genTime + cfg.genPause));
  const sendAt = nw => genStart(nw, Math.round(cfg.generations)) + cfg.genTime + cfg.genPause;
  const sendDur = () => cfg.genTime * 1.6;

  /* The way the ground travels across the screen, so the reveal line sits in from the edge it comes in at.
     depth() is 0 at that edge and 1 at the far one. */
  const flow = { u: [-1, 0], min: 0, ext: 1 };
  function updateFlow() {
    const W = view.w - view.insetR, H = view.h - view.insetB;
    const c = proj.invert([W / 2, H / 2]);
    if (c && cfg.spin > 0) {
      const a = proj(c), b = proj([c[0] - 0.5, c[1]]);     // where the ground at the center goes next
      const vx = b[0] - a[0], vy = b[1] - a[1], m = Math.hypot(vx, vy);
      if (m > 1e-6) flow.u = [vx / m, vy / m];
    }
    const ds = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => x * flow.u[0] + y * flow.u[1]);
    flow.min = Math.min(...ds); flow.ext = Math.max(...ds) - flow.min || 1;
  }
  const depth = d => (d.x * flow.u[0] + d.y * flow.u[1] - flow.min) / flow.ext;
  const wave = () => cfg.growStart === 'wave';
  // Wave: a line draws once both its dots have popped in
  const pairP = (a, b) => a.revealed && b.revealed
    ? clamp((gt - Math.max(a.revealT, b.revealT) - POP * 0.5) / cfg.genTime) : 0;

  function lineP(n) {
    if (!growingMode()) return 1;
    if (wave()) return pairP(n.parent.dot, n.dot);
    return n.net.state === 'active' ? clamp((gt - genStart(n.net, n.gen)) / cfg.genTime) : 0;
  }
  function dotP(n) {
    if (!growingMode()) return 1;
    if (wave()) return n.dot.revealed ? clamp((gt - n.dot.revealT) / POP) : 0;
    if (n.net.state !== 'active') return 0;
    if (n.gen === 0) return clamp((gt - n.net.start) / ROOT_IN);
    return clamp((gt - genStart(n.net, n.gen) - cfg.genTime * 0.8) / POP);
  }
  function sendP(s) {
    if (!growingMode()) return 1;
    if (wave()) return pairP(s.from.dot, s.to.root.dot);
    return s.from.net.state === 'active' ? clamp((gt - sendAt(s.from.net)) / sendDur()) : 0;
  }

  function resetNetworks() {
    for (const nw of networks) { nw.state = 'dormant'; nw.out = 0; }
    for (const d of dots) { d.revealed = false; d.away = 0; }
  }

  function updateNetworks(dt) {
    if (!networks.length || !growingMode()) return;
    updateFlow();
    if (wave()) {
      // Each dot pops in as it crosses the reveal line, and clears once it has been out of view a while
      for (const d of dots) {
        if (d.onScreen) {
          d.away = 0;
          if (!d.revealed && depth(d) >= cfg.revealLine) {
            d.revealed = true;
            d.revealT = gt + (gt < 0.5 ? Math.random() * 1.2 : 0);
          }
        } else if (d.revealed && playing && (d.away = (d.away || 0) + dt) > 2.5) d.revealed = false;
      }
      return;
    }
    const inView = cfg.growStart === 'inview';
    const begins = nw => inView
      // In view: once the first dot crosses the reveal line (or, if it never shows, once its dots reach the middle)
      ? (nw.root.dot.onScreen && depth(nw.root.dot) >= cfg.revealLine) || nw.nodes.some(n => n.dot.onScreen && depth(n.dot) >= 0.5)
      : nw.nodes.some(n => n.dot.onScreen);
    for (const nw of networks) {
      if (nw.state === 'dormant') {
        const waiting = nw.from && nw.from.net.state === 'active';
        if (!waiting && begins(nw)) {
          nw.state = 'active'; nw.out = 0;
          nw.start = gt + Math.random() * (gt < 0.5 ? 1.2 : 0.4);
        }
        continue;
      }
      if (playing) nw.out = nw.nodes.some(n => n.dot.onScreen) ? 0 : nw.out + dt;
      if (nw.out > 2.5) { nw.state = 'dormant'; nw.out = 0; continue; }
      for (const s of nw.sends) {
        if (s.to.state === 'dormant' && gt >= sendAt(nw) + sendDur()) {
          s.to.state = 'active'; s.to.start = gt; s.to.out = 0;
        }
      }
    }
  }

  // Each dot's size in growing mode (0 = not yet there); dots that aren't there can't be seen, hovered or opened
  function applyShown() {
    for (const d of dots) {
      d.shown = d.node ? dotP(d.node) : 1;
      const s = d.shown;
      d.r = d.r0 * (s < 1 ? 1 + 2.70158 * Math.pow(s - 1, 3) + 1.70158 * Math.pow(s - 1, 2) : 1);   // ease out, slight overshoot
      if (Q) d.r *= lerp(cfg.quietDotScale ?? 1, 1, quietFactor(d.x, d.y, Q, cfg.quietSoftness ?? 0.35));
      d.vis = d.geo && s > 0.01;
    }
  }


  /* ---------- Canvas + projection ---------- */
  const ctx = canvas.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1, insetR: 0, insetB: 0, cap: { shift: 0, radius: 90, CA: 90 } };

  const proj = d3.geoSatellite().precision(0.5);
  const path = d3.geoPath(proj, ctx);
  const SPHERE = { type: 'Sphere' };

  /* A tilted camera sees ground ahead of it but not the ground behind; d3 clips only at the horizon,
     so ground behind the image plane would wrap round the screen. Clip to a cap shifted forward instead
     (the same fix as the Pins page). */
  function forwardCapClip(shift, radius) {
    const clip = d3.geoClipCircle(radius * DEG);
    const toCap = d3.geoRotation([0, -shift]), fromCap = toCap.invert;
    const R = 180 / Math.PI;
    const relay = (s, map) => ({
      point(x, y) { const p = map([x * R, y * R]); s.point(p[0] / R, p[1] / R); },
      lineStart() { s.lineStart(); }, lineEnd() { s.lineEnd(); },
      polygonStart() { s.polygonStart(); }, polygonEnd() { s.polygonEnd(); },
      sphere() { s.sphere(); },
    });
    return stream => relay(clip(relay(stream, fromCap)), toCap);
  }

  function refit() {
    const alt = Math.max(1.05, cfg.distance);
    const CA = Math.acos(1 / alt) / DEG;
    // Rim radius at scale 1, looking straight down: zoom 1 puts the rim on the view's corners
    const unit = d3.geoSatellite().distance(alt).tilt(0).clipAngle(CA - 1e-6).scale(1).translate([0, 0]);
    const rim = Math.hypot(...unit([CA - 0.01, 0]));
    const scale = cfg.zoom * Math.hypot(view.w, view.h) / 2 / rim;

    let back = CA;
    for (let a = 0.25; a < CA; a += 0.25) {
      const beta = Math.atan2(Math.sin(a * DEG), alt - Math.cos(a * DEG)) / DEG;
      if (beta >= 90 - cfg.tilt - 4) { back = Math.max(0.5, a - 1); break; }
    }
    const radius = (CA + back) / 2, shift = (CA - back) / 2;
    proj.distance(alt).tilt(cfg.tilt).preclip(forwardCapClip(shift, radius)).scale(scale);
    view.cap = { shift, radius, CA };
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = r.width; view.h = r.height;
    canvas.width = Math.round(r.width * view.dpr);
    canvas.height = Math.round(r.height * view.dpr);
    refit();
  }
  new ResizeObserver(resize).observe(stage);

  /* ---------- Time + motion ---------- */
  let t = 0, lon = 0, cruise = 1, playing = true, nextAuto = 0;
  let hovered = null, pointer = null;

  function place() {
    const cx = (view.w - view.insetR) / 2 + cfg.offsetX / 100 * view.w;
    const cy = view.h / 2 + cfg.offsetY / 100 * view.h - view.insetB * 0.35;
    proj.translate([cx, cy]);
    proj.rotate([-(cfg.startLon + lon), -cfg.latitude, cfg.roll]);
  }

  // Each dot's place on screen and its radius there. Dots stay round (they face the camera) and shrink
  // with distance by the larger of the two ground directions, the one perspective doesn't squash.
  function locate() {
    const rot = d3.geoRotation(proj.rotate());
    const capC = [0, view.cap.shift], capR = view.cap.radius * DEG;
    const W = view.w, H = view.h;
    for (const d of dots) {
      d.geo = false; d.onScreen = false;
      if (d3.geoDistance(rot(d.ll), capC) > capR - 0.02) continue;
      const c = proj(d.ll);
      if (!c || !Number.isFinite(c[0])) continue;
      const e = d.rDeg, cl = Math.max(0.1, Math.cos(d.ll[1] * DEG));
      const pe = proj([d.ll[0] + e / cl, d.ll[1]]), pn = proj([d.ll[0], d.ll[1] + e]);
      const r = Math.max(Math.hypot(pe[0] - c[0], pe[1] - c[1]), Math.hypot(pn[0] - c[0], pn[1] - c[1]));
      if (!Number.isFinite(r)) continue;
      d.x = c[0]; d.y = c[1]; d.r0 = r;
      d.geo = c[0] > -r * 6 && c[0] < W + r * 6 && c[1] > -r * 6 && c[1] < H + r * 6;
      d.onScreen = c[0] > -r && c[0] < W + r && c[1] > -r && c[1] < H + r;
    }
  }

  /* ---------- Openings ---------- */
  const isOpen = d => d.goal === 1 || d.amt > 0;
  const autoOpen = () => dots.filter(d => d.kind === 'auto' && d.goal === 1).length;

  function open(d, kind) {
    d.kind = kind; d.goal = 1;
    d.until = kind === 'auto' ? t + cfg.openTime + cfg.openFor : kind === 'tap' ? t + cfg.openTime + cfg.openFor + 1.5 : Infinity;
  }
  function close(d) { d.goal = 0; }

  function tryAutoOpen() {
    const W = view.w - view.insetR, m = cfg.edgeRoom;
    const H = viewBottom ? Math.min(view.h - view.insetB, viewBottom()) : view.h - view.insetB;
    const phone = Q && mobileMq.matches;
    if (phone && cfg.phoneOpenings === 'off') return false;
    const busy = dots.filter(isOpen);
    const fits = d => {
      const R = d.r * cfg.autoSize;
      if (d.x - R < m || d.x + R > W - m || d.y - R < m || d.y + R > H - m) return false;
      // Never on the hero's copy: clear of the quiet centre, in the ring around it, above or below it on phones
      if (Q) {
        if (!clearOfQuiet(d.x, d.y, R, Q)) return false;
        if (phone ? !aboveOrBelow(d.y, R, Q) : cfg.halo && !inHalo(d.x, d.y, R, Q, cfg.haloWidth)) return false;
      }
      // Keep clear of photos already open, so two never overlap
      return busy.every(o => Math.hypot(o.x - d.x, o.y - d.y) > R + o.r * Math.max(o.size, cfg.autoSize) + 8);
    };
    const pool = dots.filter(d => d.vis && d.shown >= 1 && !isOpen(d) && fits(d));
    if (!pool.length) return false;
    open(pool[Math.floor(Math.random() * pool.length)], 'auto');
    return true;
  }

  function scheduleNext() {
    const j = cfg.autoJitter;
    nextAuto = t + Math.max(0.2, cfg.autoEvery * (1 + j * (Math.random() * 2 - 1)));
  }

  function updateOpenings(dt) {
    const pausedForHover = hovered && cfg.pauseAutoOnHover;
    if (playing && !pausedForHover && t >= nextAuto && (!autoGate || autoGate())) {
      if (autoOpen() < cfg.maxOpen && tryAutoOpen()) scheduleNext();
      else nextAuto = t + 0.25;               // nothing fits right now; look again shortly
    }
    const speed = dt / Math.max(0.05, cfg.openTime);
    const k = 1 - Math.exp(-dt * 5 / Math.max(0.05, cfg.openTime));
    for (const d of dots) {
      if (d.goal === 1 && d.until !== Infinity && t >= d.until) close(d);
      if (d.goal === 1 && !d.vis) close(d);     // turned out of view
      if (d.goal === 0 && d.amt === 0 && d.size === 1) { d.kind = null; continue; }
      d.amt = clamp(d.amt + (d.goal ? speed : -speed));
      const target = d.goal ? (d.kind === 'auto' ? cfg.autoSize : cfg.hoverSize) : 1;
      d.size += (target - d.size) * k;
      if (d.goal === 0 && d.amt === 0 && Math.abs(d.size - 1) < 0.01) d.size = 1;
    }
  }

  /* ---------- Pointer ---------- */
  function dotAt(x, y) {
    // Open dots sit on top, so they win; among them the biggest
    let best = null, bestR = 0;
    for (const d of dots) {
      if (!d.vis) continue;
      const R = d.r * d.size;
      if (Math.hypot(d.x - x, d.y - y) <= R && (!best || R > bestR)) { best = d; bestR = R; }
    }
    return best;
  }

  function setHover(d) {
    if (d === hovered) return;
    if (hovered && hovered.kind === 'hover') close(hovered);
    hovered = d;
    if (d) open(d, 'hover');
    canvas.classList.toggle('is-pointing', !!d);
  }

  // Where a pointer may open a dot: not on the hero's copy and not inside its quiet centre
  const openableAt = (x, y) => !(hoverBlocked && hoverBlocked(x, y)) && quietFactor(x, y, Q, 0) >= 1;
  const local = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  function tap(x, y) {
    const d = openableAt(x, y) ? dotAt(x, y) : null;
    if (d) open(d, 'tap');
  }

  let press = null;
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    pointer = local(e);
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; setHover(null); });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const [x, y] = local(e);
    if (tapSlop == null) tap(x, y);
    else press = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  // With tapSlop, a touch opens on lift, and only if it didn't move more than tapSlop px (otherwise it was a scroll)
  canvas.addEventListener('pointerup', e => {
    if (!press || press.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    press = null;
    if (moved <= tapSlop) tap(...local(e));
  });
  canvas.addEventListener('pointercancel', () => { press = null; });

  /* ---------- Drawing ---------- */
  let shownStatus = '';

  function drawPhoto(img, x, y, R) {
    const iw = img.naturalWidth, ih = img.naturalHeight, s = (2 * R) / Math.min(iw, ih);
    ctx.drawImage(img, x - iw * s / 2, y - ih * s / 2, iw * s, ih * s);
  }

  // A line from one dot to another in the chosen style, drawn `p` of the way along (0–1)
  function addLink(out, a, b, p, arch, bow, route) {
    if (p <= 0 || !a.geo || !b.geo) return;
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, k = arch * len * bow;
    let pts;
    if (cfg.lineStyle === 'grid') {
      pts = route.map(ll => proj(ll));
      if (pts.some(q => !q || !Number.isFinite(q[0]))) pts = [[ax, ay], [bx, by]];
    } else if (cfg.lineStyle === 'arc') {
      const cx = ax + dx / 2 + nx * k, cy = ay + dy / 2 + ny * k;
      pts = [];
      for (let s = 0; s <= 20; s++) {
        const u = s / 20, v = 1 - u;
        pts.push([v * v * ax + 2 * v * u * cx + u * u * bx, v * v * ay + 2 * v * u * cy + u * u * by]);
      }
    } else if (cfg.lineStyle === 's') {
      const c1x = ax + dx / 3 + nx * k, c1y = ay + dy / 3 + ny * k;
      const c2x = ax + 2 * dx / 3 - nx * k, c2y = ay + 2 * dy / 3 - ny * k;
      pts = [];
      for (let s = 0; s <= 24; s++) {
        const u = s / 24, v = 1 - u;
        pts.push([v * v * v * ax + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * bx,
                  v * v * v * ay + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * by]);
      }
    } else {
      pts = [[ax, ay], [bx, by]];
    }
    // Trim to the share drawn so far
    if (p < 1) {
      let total = 0;
      for (let s = 1; s < pts.length; s++) total += Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]);
      let left = total * p;
      const cut = [pts[0]];
      for (let s = 1; s < pts.length && left > 0; s++) {
        const seg = Math.hypot(pts[s][0] - pts[s - 1][0], pts[s][1] - pts[s - 1][1]);
        if (seg >= left) {
          const f = left / (seg || 1);
          cut.push([lerp(pts[s - 1][0], pts[s][0], f), lerp(pts[s - 1][1], pts[s][1], f)]);
          left = 0;
        } else { cut.push(pts[s]); left -= seg; }
      }
      pts = cut;
    }
    out.moveTo(pts[0][0], pts[0][1]);
    for (let s = 1; s < pts.length; s++) out.lineTo(pts[s][0], pts[s][1]);
  }

  /* A line that is drawing out takes the headline word's colour (setWordColor), then eases back to the line colour
     over colorSettle seconds once it has finished. */
  let wordColor = null;
  function tintFor(o, p) {
    if (cfg.wordColor && wordColor && p > 0 && p < 1) { o.tint = wordColor; o.tintDone = null; return wordColor; }
    if (!o.tint) return cfg.lineColor;
    if (o.tintDone == null) o.tintDone = gt;
    const k = clamp((gt - o.tintDone) / Math.max(0.05, cfg.colorSettle ?? 2.5));
    if (k >= 1) { o.tint = null; return cfg.lineColor; }
    return mixHex(o.tint, cfg.lineColor, k);
  }
  function clearTints() {
    for (const nw of networks) for (const o of [...nw.nodes, ...nw.sends]) { o.tint = null; o.tintDone = null; }
  }

  // Lines are stroked in groups that share a colour, a strength (faded in the quiet centre) and dashing
  function drawLinks() {
    const dashed = cfg.sentStyle === 'dashed';
    const groups = new Map();
    const link = (o, a, b, p, arch, bow, route, dash) => {
      if (p <= 0 || !a.geo || !b.geo) return;
      let alpha = 1;
      if (Q) {
        const f = quietFactor((a.x + b.x) / 2, (a.y + b.y) / 2, Q, cfg.quietSoftness ?? 0.35);
        alpha = lerp(cfg.quietLineAlpha ?? 1, 1, f);
        if (alpha <= 0.01) return;
        alpha = Math.ceil(alpha * 8) / 8;
      }
      const color = tintFor(o, p), key = color + '|' + alpha + '|' + dash;
      let g = groups.get(key);
      if (!g) groups.set(key, g = { path: new Path2D(), color, alpha, dash });
      addLink(g.path, a, b, p, arch, bow, route);
    };
    for (const nw of networks) {
      for (const n of nw.nodes) if (n.parent) link(n, n.parent.dot, n.dot, lineP(n), cfg.arch, n.bow, n.route, false);
      for (const s of nw.sends) link(s, s.from.dot, s.to.root.dot, sendP(s), cfg.sentArch, s.bow, s.route, dashed);
    }
    const w = Math.max(1, cfg.netLineWidth);
    for (const g of groups.values()) {
      ctx.globalAlpha = g.alpha;
      ctx.strokeStyle = g.color;
      ctx.setLineDash(g.dash ? [w * 3, w * 3.5] : []);
      ctx.stroke(g.path);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cfg.lineColor;
  }

  function draw() {
    const W = view.w, H = view.h, dpr = view.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cfg.bgColor;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath(); path(SPHERE);
    ctx.fillStyle = cfg.globeColor; ctx.fill();

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = cfg.lineColor;
    const gridAlpha = networks.length ? cfg.gridStrength : 1;
    if (cfg.lineWidth > 0 && gridAlpha > 0) {
      ctx.lineWidth = cfg.lineWidth;
      ctx.globalAlpha = gridAlpha;
      ctx.beginPath(); path(gridShape); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (networks.length && cfg.netLineWidth > 0) {
      ctx.lineWidth = cfg.netLineWidth;
      drawLinks();
    }

    // Closed dots in one fill, then open ones on top, smallest first
    const shut = new Path2D(), opened = [];
    let inView = 0;
    for (const d of dots) {
      if (!d.vis) continue;
      if (d.x > -d.r && d.x < W + d.r && d.y > -d.r && d.y < H + d.r) inView++;
      if (d.size !== 1 || d.amt > 0) { opened.push(d); continue; }
      shut.moveTo(d.x + d.r, d.y); shut.arc(d.x, d.y, d.r, 0, TAU);
    }
    ctx.fillStyle = cfg.dotColor; ctx.fill(shut);

    opened.sort((a, b) => a.r * a.size - b.r * b.size);
    for (const d of opened) {
      const R = d.r * d.size;
      ctx.beginPath(); ctx.arc(d.x, d.y, R, 0, TAU);
      ctx.fillStyle = cfg.dotColor; ctx.fill();
      const img = images[d.photo];
      const a = easeInOut(d.amt);
      if (a > 0 && ready(img)) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = a;
        drawPhoto(img, d.x, d.y, R);
        ctx.restore();
      }
    }

    // While tuning the hero: the quiet centre's outline
    if (Q && cfg.showQuiet) {
      ctx.beginPath(); ctx.ellipse(Q.cx, Q.cy, Q.rx, Q.ry, 0, 0, TAU);
      ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.strokeStyle = '#C2861A'; ctx.stroke(); ctx.globalAlpha = 1;
    }

    if (onStatus) {
      const open = dots.filter(d => d.goal === 1).length;
      const s = `${inView} dots in view · ${open} open${playing ? '' : ' · paused'}`;
      if (s !== shownStatus) { onStatus(s); shownStatus = s; }
    }
  }


  /* ---------- Loop ---------- */
  let last = performance.now(), raf = 0;

  function frame(now) {
    if (!raf) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    const inset = insets ? insets() : { r: 0, b: 0 };
    const tR = inset.r, tB = inset.b;
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.insetR += (tR - view.insetR) * ease;
    view.insetB += (tB - view.insetB) * ease;

    const want = hovered && cfg.slowOnHover ? 0 : 1;
    cruise += (want - cruise) * (1 - Math.exp(-dt * 4));
    t += dt;                                   // keeps running while paused, so open photos still close
    if (playing) { lon += cfg.spin * cruise * dt; gt += dt; }

    Q = quiet ? quiet() : null;
    place();
    locate();
    updateNetworks(dt);
    applyShown();
    if (pointer) setHover(openableAt(pointer[0], pointer[1]) ? dotAt(pointer[0], pointer[1]) : null);
    updateOpenings(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }


  function setPlaying(on) { playing = on; }
  function restart() {
    t = 0; lon = 0; cruise = 1; gt = 0;
    resetNetworks();
    dots.forEach(d => close(d));
    nextAuto = t + cfg.firstOpen;
    setPlaying(true);
  }

  build();
  resize();
  nextAuto = cfg.firstOpen;
  if (reduceMotion) setPlaying(false);      // a still view; hovering still opens dots

  return {
    start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    get running() { return !!raf; },
    get playing() { return playing; },
    setPlaying,
    restart,
    rebuild() { hovered = null; build(); },
    regrow() { gt = 0; resetNetworks(); clearTints(); },
    // The headline word's colour (#rrggbb) for lines that are drawing out, or null for none
    setWordColor(color) { wordColor = /^#[0-9a-f]{6}$/i.test(color || '') ? color : null; },
    refit,
    loadPhotos,
    debug() {
      return {
        open: dots.filter(d => d.goal === 1).map(d => ({ id: d.id, x: d.x, y: d.y, R: d.r * d.size, kind: d.kind })),
        dots: dots.filter(d => d.vis).map(d => ({ x: d.x, y: d.y, r: d.r })),
        inView: dots.filter(d => d.vis).length,
      };
    },
  };
}

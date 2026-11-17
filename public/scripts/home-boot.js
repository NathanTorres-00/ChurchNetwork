(() => {
  const root = document.documentElement, loader = document.getElementById('loader');
  /* ?embed=globe: just the hero's Pins globe, for other pages to show behind their own hero (/groups).
     No loading screen, header, copy or sections; see html.embed-globe in the styles. */
  if (new URLSearchParams(location.search).get('embed') === 'globe') {
    root.classList.add('embed-globe');
    const bg = new URLSearchParams(location.search).get('bg');
    if (/^[0-9a-f]{6}$/i.test(bg || '')) root.style.setProperty('--embed-bg', '#' + bg);
    loader.remove();
    return;
  }
  root.classList.add('is-loading');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Arriving from another page of the site (Groups → Home), the page opens straight away with the page
     transition; the full loading screen is for arriving from outside. */
  let returning = false;
  try {
    const from = document.referrer ? new URL(document.referrer) : null;
    returning = !!from && from.origin === location.origin && from.pathname !== location.pathname;
  } catch {}

  /* The loading network: one dot divides five times (1, 2, 4, 8, 16, 32), laid out like the flat view.
     Each of the four second-generation branches, and everything that grows from it, takes a headline color. */
  const GENS = 5, STEP = 0.55, NS = 'http://www.w3.org/2000/svg';
  const colors = ['var(--c-disciples)', 'var(--c-leaders)', 'var(--c-churches)', 'var(--c-movements)'];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = [{ gen: 0, x: 100, y: 100, a: Math.PI / 2, w: Math.PI * 2, r: 0, branch: -1 }];
  for (let g = 1, frontier = [0]; g <= GENS; g++) {
    const next = [], len = 21 * Math.pow(0.9, g - 1);
    for (const pi of frontier) {
      const p = nodes[pi];
      [-1, 1].forEach((side, k) => {
        const a = p.a + side * (p.w / 4) * (g === 1 ? 1 : 0.84) + (rand() - 0.5) * (p.w / 4) * 0.35;
        const r = p.r + len * (0.9 + rand() * 0.2);
        const branch = g === 2 ? (pi - 1) * 2 + k : p.branch;
        next.push(nodes.length);
        nodes.push({ gen: g, parent: pi, side, a, w: p.w / 2, r, branch, x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r });
      });
    }
    frontier = next;
  }
  const svg = document.getElementById('loader-net').firstElementChild;
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const threads = [], dots = [];
  for (const n of nodes) {
    const color = n.branch >= 0 ? colors[n.branch] : '#BEBEC2';
    const grow = n.gen ? 0.3 + (n.gen - 1) * STEP : 0.1;                 // when this generation starts
    const fold = (GENS - n.gen) * 0.2;                                    // outermost generation folds first
    if (n.gen) {
      const p = nodes[n.parent], dx = n.x - p.x, dy = n.y - p.y, k = 0.16 * n.side;
      threads.push(el('path', { class: 'thread', pathLength: 1, style: `--d:${grow}s; --c:${fold}s`,
        d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${((p.x + n.x) / 2 - dy * k).toFixed(1)} ${((p.y + n.y) / 2 + dx * k).toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}` }));
    }
    const p = n.gen ? nodes[n.parent] : n;
    const rr = 5.2 * Math.pow(0.8, n.gen), g = el('g', { class: 'node' + (n.gen ? '' : ' root'),
      style: `--d:${n.gen ? grow + 0.08 : 0.1}s; --c:${fold}s; --tx:${(p.x - n.x).toFixed(1)}px; --ty:${(p.y - n.y).toFixed(1)}px` });
    g.append(el('circle', { class: 'ring', cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: (rr * 1.56).toFixed(2), style: `stroke:${color}; stroke-width:${(rr * 0.42).toFixed(2)}` }),
             el('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: rr.toFixed(2), style: `fill:${color}` }));
    dots.push(g);
  }
  svg.append(...threads, ...dots.reverse());                              // threads under dots, parents on top

  const GROWN = (0.3 + (GENS - 1) * STEP + 0.08 + 0.55) * 1000;          // last generation finishes growing
  const FOLD = ((GENS - 1) * 0.2 + 0.45) * 1000 + 60;                    // folding back to the first dot
  const MIN = reduce ? 600 : GROWN, MAX = 8000, started = performance.now();
  let globe = false, fonts = false, done = false;

  function reveal() {
    loader.classList.add('is-leaving');
    loader.removeAttribute('role');
    root.classList.remove('is-loading');
    if (window.__lenis) window.__lenis.start();
    window.dispatchEvent(new Event('page:revealed'));                    // the headline starts as the page opens
    setTimeout(() => loader.remove(), reduce ? 500 : 1900);
  }
  // Fold the network back to its first dot, then open the page from it
  function finish() {
    if (done) return;
    done = true;
    if (reduce) return reveal();
    loader.classList.add('is-collapsing');
    setTimeout(reveal, FOLD);
  }
  // Leave once the globe has its first networks and the font is in: never before the network has fully grown, never after MAX
  const check = () => { if (globe && fonts) setTimeout(finish, Math.max(0, MIN - (performance.now() - started))); };
  if (returning) { loader.hidden = true; done = true; requestAnimationFrame(reveal); return; }
  window.addEventListener('globe:populated', () => { globe = true; check(); }, { once: true });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fonts = true; check(); });
  setTimeout(finish, MAX);
})();

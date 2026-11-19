/* ---------- Settings: the Adjust panel changes these; Copy settings gives a block to paste over this one ---------- */
const CONFIG = {
  // Hero
  heroArt: 'photo',         // 'photo' (the group photo card) or 'globe' (the home page's Pins globe behind the title)
  heroShape: 'full',        // 'full' (edge to edge, full height, curved bottom) or 'card' (rounded, inside the page margins)
  heroPins: true,           // with the globe: photo pins rise from its networks
  heroCurve: 5,             // vw, Full width: how far the hero's bottom edge dips at the center, as on Home
                            // (0 = straight, capped at 120px)

  // Page load
  loadStyle: 'rise',        // 'rise', 'reveal' (the hero opens out from its middle), 'fade' or 'none'
  loadSpeed: 0.9,           // seconds each piece takes to come in
  loadStagger: 0.09,        // seconds between one piece and the next
  scrollReveal: true,       // sections below the hero rise in as they scroll into view
};
const SHOW_CONTROLS = true;  // false hides the Adjust button (so does ?controls=0)

// Any setting can also come from the address, e.g. /groups?heroArt=globe&loadStyle=fade
const DEFAULTS = { ...CONFIG };
const cfg = { ...CONFIG };
(() => {
  const params = new URLSearchParams(location.search);
  for (const key of Object.keys(DEFAULTS)) {
    if (!params.has(key)) continue;
    const raw = params.get(key), def = DEFAULTS[key];
    if (typeof def === 'number') { const n = parseFloat(raw); if (Number.isFinite(n)) cfg[key] = n; }
    else if (typeof def === 'boolean') cfg[key] = raw === '1' || raw === 'true';
    else cfg[key] = raw;
  }
  // set before the first paint, so the load animation starts from its first frame
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cfg.loadStyle = 'none'; cfg.scrollReveal = false; }
  root.dataset.art = cfg.heroArt;
  root.dataset.shape = cfg.heroShape;
  root.style.setProperty('--hero-curve', cfg.heroCurve + 'vw');
  root.dataset.load = cfg.loadStyle;
  root.style.setProperty('--load-speed', cfg.loadSpeed + 's');
  root.style.setProperty('--load-stagger', cfg.loadStagger + 's');
  if (cfg.scrollReveal) root.dataset.scrollReveal = '';
})();

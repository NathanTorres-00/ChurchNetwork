/* Page transitions between the site's pages (Home ↔ Groups), with the browser's cross-document View Transitions.
   Load it in <head> on every page (with page-transition.css). The style and speed are set from the Groups page's
   Adjust panel and kept in localStorage, so every page uses the same one. Browsers without View Transitions
   (Firefox for now) just change pages as usual. */
(() => {
  const KEY = 'rn:pageTransition';
  const DEFAULT = { style: 'rise', duration: 0.6 };   // style: 'fade', 'rise', 'slide' or 'none'
  let t = DEFAULT;
  try { t = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const root = document.documentElement;
  root.dataset.transition = t.style;
  root.style.setProperty('--vt-duration', t.duration + 's');
  window.rnPageTransition = {
    get: () => ({ ...t }),
    set(next) {
      t = { ...t, ...next };
      root.dataset.transition = t.style;
      root.style.setProperty('--vt-duration', t.duration + 's');
      try { localStorage.setItem(KEY, JSON.stringify(t)); } catch {}
    },
    reset() { try { localStorage.removeItem(KEY); } catch {} this.set(DEFAULT); },
    DEFAULT,
  };
  // 'none' skips the transition on the page being arrived at
  window.addEventListener('pagereveal', e => { if (e.viewTransition && t.style === 'none') e.viewTransition.skipTransition(); });
})();

/* Site footer, shared by Home and Groups. Load it in <head> (not deferred) so the footer's look is set
   before it draws.
   Settings come from either page's Adjust panel ([data-footer-key] controls) and are kept in localStorage, so both
   pages match. DEFAULT is what a first visit sees:
   - mark:  'full' (the whole wordmark, copyright under it) or 'clip' (copyright first, then the wordmark running off
            the bottom edge)
   - clip:  share of the wordmark's height cut off when clipped (0.15–0.6)
   - shift: clipped wordmark moved down (+) or up (−), as a share of its height (−0.3–0.5)
   - scale: wordmark width against the content width (0.5–1.5)
   - theme: 'light', 'grey' or 'dark' (inverted); grey: the Grey's lightness (0.3–0.96; below 0.55 the text turns light)
   - anim:  'pins' (the Home hero's Pins globe behind the footer, multiplying) or 'off'; animStrength: its opacity (0.15–1)
   - reveal: 'on' (the footer slides out from under the last section as it scrolls into view) or 'off'
   - revealDistance: how far up under the section it starts, as a share of the footer's visible height (0.1–1)
   - revealShade: how dark it is while still tucked under (0–0.8)
   - edge:  'flat' or 'curve' (the last section ends in the Home hero's downward arc); curve: its depth in vw (0–10)
   The newsletter form isn't connected to a mailing list yet, so it checks the address and says so. */
(() => {
  const KEY = 'rn:footer';
  const DEFAULT = { mark: 'clip', clip: 0.35, shift: -0.08, scale: 1, theme: 'light', reveal: 'on', revealDistance: 0.6, revealShade: 0.2, edge: 'curve', curve: 5, grey: 0.9, anim: 'pins', animStrength: 0.2 };
  const SEGS = ['mark', 'theme', 'reveal', 'edge', 'anim'];
  let f = DEFAULT;
  try { f = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
  const root = document.documentElement;
  const bgHex = () => f.theme === 'dark' ? '#1F1F23' : f.theme === 'grey' ? greyHex(f.grey) : '#F7F7F8';
  const darkBg = () => f.theme === 'dark' || (f.theme === 'grey' && f.grey < 0.55);
  const paint = () => {
    root.dataset.footerMark = f.mark;
    root.dataset.footerTheme = f.theme;
    root.dataset.footerInk = darkBg() ? 'light' : 'dark';
    root.dataset.footerAnim = f.anim;
    root.style.setProperty('--footer-bg', bgHex());
    root.style.setProperty('--footer-anim-strength', f.animStrength);
    root.dataset.footerReveal = f.reveal;
    root.style.setProperty('--mark-clip', f.clip);
    root.style.setProperty('--mark-shift', f.shift);
    root.style.setProperty('--mark-scale', f.scale);
    root.style.setProperty('--reveal-shade', f.revealShade);
    root.dataset.footerEdge = f.edge;
    root.style.setProperty('--footer-curve', f.curve);
    layout();
    syncAnim();
  };

  /* ---------- Colours ---------- */
  // Grey: the site's cool grey (hue 240, 5% saturation) at lightness L
  function greyHex(L) {
    const s = 0.05, a = s * Math.min(L, 1 - L);
    const ch = n => { const k = (n + 240 / 30) % 12; return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return '#' + [ch(0), ch(8), ch(4)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function mix(hex, toward, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex), b = p(toward);
    return a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* ---------- Animation: the Home hero's Pins globe, recoloured to the footer ---------- */
  let animBox = null, animSrc = '', near = false, animTimer = 0;
  function animUrl() {
    const bg = bgHex(), ink = darkBg() ? '#FFFFFF' : '#000000';
    const q = new URLSearchParams({
      embed: 'globe', controls: '0', smoothScroll: '0', heroArt: 'pins', showPins: '1',
      bg: bg.slice(1), oceanColor: bg.slice(1), landColor: mix(bg, ink, 0.05), gridColor: mix(bg, ink, 0.1),
      lineColor: mix(bg, ink, 0.24), dotColor: mix(bg, ink, 0.28), newbornColor: mix(bg, ink, 0.38), pinColor: mix(bg, ink, 0.16),
    });
    return '/embed/globe?' + q;
  }
  function syncAnim() {
    if (!animBox) return;
    const want = f.anim === 'pins' && near && !matchMedia('(prefers-reduced-motion: reduce)').matches ? animUrl() : '';
    if (want === animSrc) return;
    clearTimeout(animTimer);
    // colour changes from the panel come in quick bursts: rebuild the globe once they settle
    animTimer = setTimeout(() => {
      animSrc = want;
      animBox.replaceChildren();
      if (!want) return;
      const frame = document.createElement('iframe');
      frame.name = 'rn-embed:' + want.split('?')[1];   // /embed/globe restores its settings from this if the address loses them
      frame.src = want; frame.tabIndex = -1; frame.title = ''; frame.setAttribute('aria-hidden', 'true');
      animBox.appendChild(frame);
    }, animSrc && want ? 250 : 0);
  }
  // Where the footer's text sits, in the globe frame's coordinates, so its pins keep clear
  function footerTextRects(frame) {
    const fr = frame.getBoundingClientRect();
    return [...footer.querySelectorAll('.footer-tagline, .footer-social a, .footer-signup, .footer-cols h2, .footer-cols a, .footer-bottom span, .footer-mark')]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width && r.height)
      .map(r => ({ left: r.left - fr.left, right: r.right - fr.left, top: r.top - fr.top, bottom: r.bottom - fr.top, width: r.width, height: r.height }));
  }

  /* ---------- Slide-out reveal ---------- */
  let footer = null, main = null, raf = 0;
  // Curved edge: mark the last visible section above the footer and make sure it has a solid background
  let above = null;
  function markAbove() {
    const want = f.edge === 'curve' ? [...main.children].filter(el => el.getClientRects().length).pop() : null;
    if (want === above) return;
    if (above) { above.classList.remove('footer-above'); above.style.removeProperty('background-color'); }
    above = want;
    if (!above) return;
    above.classList.add('footer-above');
    const c = getComputedStyle(above).backgroundColor;
    if (!c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c)) above.style.backgroundColor = 'var(--bg, #fff)';
  }
  function layout() {
    if (!footer) return;
    markAbove();
    if (f.reveal !== 'on') { root.style.removeProperty('--reveal-y'); root.style.removeProperty('--reveal-p'); return; }
    const h = Math.min(footer.offsetHeight, innerHeight);
    // the footer's natural top (main's bottom, less any overlap from the Curved edge), unaffected by its slide
    const shown = innerHeight - (main.getBoundingClientRect().bottom + parseFloat(getComputedStyle(main).marginBottom || 0));
    const p = Math.max(0, Math.min(1, shown / h));
    root.style.setProperty('--reveal-p', p.toFixed(4));
    root.style.setProperty('--reveal-y', (-f.revealDistance * h * (1 - p)).toFixed(1) + 'px');
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };

  /* ---------- Panel controls ---------- */
  const pct = v => Math.round(v * 100) + '%';
  const fmt = { clip: pct, shift: v => (v > 0 ? '+' : '') + pct(v), scale: v => v.toFixed(2) + '×', revealDistance: pct, revealShade: pct, curve: v => v + 'vw', grey: pct, animStrength: pct };
  const needs = { clip: () => f.mark === 'clip', shift: () => f.mark === 'clip', revealDistance: () => f.reveal === 'on', revealShade: () => f.reveal === 'on', curve: () => f.edge === 'curve', grey: () => f.theme === 'grey', animStrength: () => f.anim === 'pins' };
  function syncControls() {
    for (const k of SEGS) document.querySelectorAll(`[data-footer-key="${k}"] button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === f[k])));
    document.querySelectorAll('input[data-footer-key]').forEach(input => {
      const k = input.dataset.footerKey;
      input.value = f[k];
      input.style.setProperty('--p', ((input.value - input.min) / (input.max - input.min) * 100) + '%');
      const row = input.closest('[data-footer-row]');
      if (row) row.classList.toggle('is-off', needs[k] ? !needs[k]() : false);
      const out = row && row.querySelector('output');
      if (out) out.textContent = fmt[k](f[k]);
    });
  }

  window.rnFooter = {
    get: () => ({ ...f }),
    set(next) { f = { ...f, ...next }; paint(); syncControls(); try { localStorage.setItem(KEY, JSON.stringify(f)); } catch {} },
    reset() { try { localStorage.removeItem(KEY); } catch {} f = { ...DEFAULT }; paint(); syncControls(); },
    DEFAULT,
  };
  paint();

  document.addEventListener('DOMContentLoaded', () => {
    footer = document.querySelector('.site-footer');
    main = document.querySelector('main');
    if (footer && main) {
      animBox = document.createElement('div');
      animBox.className = 'footer-anim';
      animBox.setAttribute('aria-hidden', 'true');
      footer.prepend(animBox);
      // the globe runs only while the footer is on or near the screen
      new IntersectionObserver(([e]) => { near = e.isIntersecting; syncAnim(); }, { rootMargin: '200px 0px' }).observe(footer);
      const prev = window.rnHeroTextRects;
      window.rnHeroTextRects = frame => (animBox.contains(frame) ? footerTextRects(frame) : prev ? prev(frame) : []);
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll);
      new ResizeObserver(onScroll).observe(document.body);
      layout();
    }
    syncControls();
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-footer-key] button');
      if (b) window.rnFooter.set({ [b.parentElement.dataset.footerKey]: b.dataset.value });
    });
    document.addEventListener('input', e => {
      const k = e.target.matches && e.target.matches('input[data-footer-key]') && e.target.dataset.footerKey;
      if (k) window.rnFooter.set({ [k]: parseFloat(e.target.value) });
    });

    const form = document.querySelector('.footer-signup form');
    if (!form) return;
    const note = form.querySelector('.signup-note');
    form.addEventListener('submit', e => {
      e.preventDefault();
      note.textContent = note.dataset.notice || 'Thanks! Sign-up isn’t connected yet, so this address wasn’t saved.';
    });
  });
})();

  /* ---------- Hero art: the Pins globe loads (as an embed of the home page's globe) only when it's chosen ---------- */
  function syncHero() {
    const root = document.documentElement;
    root.dataset.art = cfg.heroArt;
    root.dataset.shape = cfg.heroShape;
    root.style.setProperty('--hero-curve', cfg.heroCurve + 'vw');
    const holder = document.getElementById('hero-globe');
    if (cfg.heroArt !== 'globe') { holder.replaceChildren(); return; }
    const src = `/embed/globe?embed=globe&controls=0&smoothScroll=0&heroArt=pins&showPins=${cfg.heroPins ? 1 : 0}`;
    const current = holder.querySelector('iframe');
    if (current && current.getAttribute('src') === src) return;
    const frame = document.createElement('iframe');
    frame.name = 'rn-embed:' + src.split('?')[1];   // /embed/globe restores its settings from this if the address loses them
    frame.src = src;
    frame.title = 'The Rock Network globe: networks of dots multiplying across the world';
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    holder.replaceChildren(frame);
  }
  syncHero();

  /* The globe's photo pins keep clear of the hero's text: the embedded globe asks for these boxes (in its own
     coordinates) each time it places a pin. One box per line of the title and tagline, the buttons and the header. */
  window.rnHeroTextRects = frame => {
    const f = frame.getBoundingClientRect(), range = document.createRange(), boxes = [];
    for (const el of document.querySelectorAll('.hero-card h1, .hero-card .sub')) {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) { range.selectNodeContents(n); boxes.push(...range.getClientRects()); }
    }
    for (const el of document.querySelectorAll('.hero-card .actions .button, .site-nav')) boxes.push(el.getBoundingClientRect());
    return boxes.map(r => ({ left: r.left - f.left, right: r.right - f.left, top: r.top - f.top, bottom: r.bottom - f.top, width: r.width, height: r.height }))
      .filter(b => b.width > 0 && b.height > 0);
  };

  /* ---------- Sections rise in as they scroll into view ---------- */
  const revealer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); } }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
    : null;
  function syncReveal() {
    const root = document.documentElement;
    if (!cfg.scrollReveal || !revealer) { delete root.dataset.scrollReveal; return; }
    root.dataset.scrollReveal = '';
    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => revealer.observe(el));
  }
  syncReveal();

  /* ---------- Page load animation ---------- */
  function syncLoad() {
    const root = document.documentElement;
    root.style.setProperty('--load-speed', cfg.loadSpeed + 's');
    root.style.setProperty('--load-stagger', cfg.loadStagger + 's');
    root.dataset.load = cfg.loadStyle;
  }
  function replay() {
    const root = document.documentElement;
    root.dataset.load = 'none';
    void root.offsetWidth;          // restart the animations from their first frame
    syncLoad();
  }

  /* ---------- Adjust panel ---------- */
  (() => {
    const adjust = document.getElementById('adjust'), panel = document.getElementById('panel');
    if (!adjust || !panel) return;
    if (new URLSearchParams(location.search).get('controls') === '0') { adjust.remove(); panel.remove(); return; }
    adjust.hidden = false;
    const open = on => { panel.classList.toggle('is-open', on); adjust.setAttribute('aria-expanded', String(on)); };
    adjust.addEventListener('click', () => open(true));
    document.getElementById('close').addEventListener('click', () => open(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });

    const fmt = { heroCurve: v => v + 'vw', loadSpeed: v => v.toFixed(2) + ' s', loadStagger: v => v.toFixed(2) + ' s', duration: v => v.toFixed(2) + ' s' };
    const fill = input => input.style.setProperty('--p', ((input.value - input.min) / (input.max - input.min) * 100) + '%');
    const vt = window.rnPageTransition;

    function syncPanel() {
      panel.querySelectorAll('.seg[data-key]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === cfg[seg.dataset.key]))));
      panel.querySelectorAll('input[data-key]').forEach(input => {
        const k = input.dataset.key;
        if (input.type === 'checkbox') input.checked = !!cfg[k];
        else { input.value = cfg[k]; fill(input); document.getElementById('o-' + k).textContent = fmt[k](cfg[k]); }
      });
      document.getElementById('row-heroPins').classList.toggle('is-off', cfg.heroArt !== 'globe');
      document.getElementById('row-heroCurve').classList.toggle('is-off', cfg.heroShape !== 'full');
      const t = vt.get();
      panel.querySelectorAll('.seg[data-transition-key] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === t.style)));
      const d = document.getElementById('c-vtDuration');
      d.value = t.duration; fill(d); document.getElementById('o-vtDuration').textContent = fmt.duration(t.duration);
    }
    const apply = key => {
      if (key.startsWith('hero')) syncHero();
      else if (key === 'scrollReveal') syncReveal();
      else if (key === 'loadStyle') replay();
      else syncLoad();
      syncPanel();
    };

    panel.addEventListener('click', e => {
      const b = e.target.closest('.seg button');
      if (!b) return;
      const seg = b.parentElement;
      if (seg.dataset.key) { cfg[seg.dataset.key] = b.dataset.value; apply(seg.dataset.key); }
      else if (seg.dataset.transitionKey) { vt.set({ style: b.dataset.value }); syncPanel(); }
    });
    panel.addEventListener('input', e => {
      const input = e.target;
      if (input.dataset.transitionKey) { vt.set({ duration: parseFloat(input.value) }); syncPanel(); return; }
      const k = input.dataset.key;
      if (!k) return;
      cfg[k] = input.type === 'checkbox' ? input.checked : parseFloat(input.value);
      apply(k);
    });
    document.getElementById('replay').addEventListener('click', replay);

    const copyBtn = document.getElementById('copy');
    copyBtn.addEventListener('click', async () => {
      const text = 'const CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n// public/scripts/page-transition.js DEFAULT: ' + JSON.stringify(vt.get()) + '\n// public/scripts/site-footer.js DEFAULT: ' + JSON.stringify(window.rnFooter.get());
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy settings'), 1800);
    });
    document.getElementById('reset').addEventListener('click', () => {
      Object.assign(cfg, DEFAULTS);
      vt.reset();
      window.rnFooter.reset();
      syncHero(); syncReveal(); replay(); syncPanel();
    });
    syncPanel();
  })();

/* What we do: each [data-count] number counts up from 0 as the stats scroll into view (once). The real number is in
   the HTML, so it reads right without JavaScript, and shows straight away for people who prefer reduced motion. */
(() => {
  const els = [...document.querySelectorAll('[data-count]')];
  if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const targets = els.map(el => +el.textContent.replace(/[^0-9.]/g, ''));
  els.forEach(el => { el.textContent = '0'; });
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    els.forEach((el, i) => {
      // hold the final width so the labels beside the numbers don't shift as digits are added
      el.textContent = fmt(targets[i]);
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.textContent = '0';
      const start = performance.now() + i * 120, dur = 1600;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - start) / dur));
        el.textContent = fmt(targets[i] * (1 - Math.pow(1 - p, 3)));   // ease out
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  io.observe(els[0].closest('.stats'));
})();

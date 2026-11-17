/* Smooth scrolling with Lenis (https://github.com/darkroomengineering/lenis). Switched on and tuned from the
   Page group in the Adjust panel; off for people who prefer reduced motion. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis = null, glide = null;

  window.syncSmoothScroll = cfg => {
    const on = cfg.smoothScroll && !reduce && typeof window.Lenis === 'function';
    if (!on) { if (lenis) { lenis.destroy(); lenis = null; window.__lenis = null; } return; }
    if (lenis && glide === cfg.scrollGlide) return;
    if (lenis) lenis.destroy();
    glide = cfg.scrollGlide;
    lenis = new window.Lenis({ autoRaf: true, lerp: 0.2 - 0.16 * glide });   // more glide = slower easing
    window.__lenis = lenis;
    if (document.documentElement.classList.contains('is-loading')) lenis.stop();   // until the loading screen opens
  };

  // In-page links ("Learn more", the header) glide to their section; placeholder links stay put
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-placeholder') || a.getAttribute('href').length < 2) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });
})();

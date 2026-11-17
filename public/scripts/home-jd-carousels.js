/* Jesus Disciple carousels: the arrow buttons page through a row (and grey out at its ends), and a mouse can drag a
   row sideways. Trackpads, touch and Tab scroll it natively. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.reel-group').forEach(group => {
    const reel = group.querySelector('.reel');
    const [prev, next] = group.querySelectorAll('.reel-btn');
    const update = () => {
      const max = reel.scrollWidth - reel.clientWidth;
      prev.disabled = reel.scrollLeft <= 2;
      next.disabled = reel.scrollLeft >= max - 2;
      group.classList.toggle('is-static', max <= 2);
    };
    const page = dir => {
      const step = reel.querySelector('li').getBoundingClientRect().width + parseFloat(getComputedStyle(reel).columnGap || 0);
      const cards = Math.max(1, Math.floor(reel.clientWidth * 0.75 / step));
      reel.scrollBy({ left: dir * cards * step, behavior: reduce ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    reel.addEventListener('scroll', update, { passive: true });
    // Lenis (the page's smooth scroll) cancels every wheel event that has any vertical movement, and a trackpad swipe
    // sideways nearly always has a little. So a mostly sideways swipe stops here, before Lenis sees it, and the row
    // scrolls natively. Mostly vertical swipes still reach Lenis and scroll the page.
    reel.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
    }, { passive: true });
    addEventListener('resize', update);
    update();

    // Mouse drag. A drag of more than a few pixels doesn't count as a click on the card it started on.
    let drag = null, quietUntil = 0;
    reel.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: reel.scrollLeft, moved: false };
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; reel.classList.add('is-dragging'); }
      if (drag.moved) reel.scrollLeft = drag.left - dx;
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) { quietUntil = performance.now() + 250; reel.classList.remove('is-dragging'); }
      drag = null;
    });
    reel.addEventListener('click', e => {
      if (performance.now() < quietUntil) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  });
})();

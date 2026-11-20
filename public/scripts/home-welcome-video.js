/* What is a New Testament Church Network?: the welcome video. It shows its poster until the preview is activated,
   then plays with the browser's own controls; it pauses when scrolled out of view. Nothing downloads until play. */
(() => {
  const box = document.getElementById('intro-video');
  if (!box) return;
  const video = box.querySelector('video'), play = box.querySelector('.play');
  box.addEventListener('click', () => {
    box.classList.add('is-started');
    play.disabled = true;
    video.controls = true;
    video.play().catch(() => {});
    video.focus({ preventScroll: true });
  }, { once: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (!e.isIntersecting && !video.paused) video.pause(); }, { threshold: 0.25 }).observe(box);
  }
})();

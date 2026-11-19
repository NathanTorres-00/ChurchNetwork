/* What is a New Testament Church Network?: the welcome video. It shows its poster until the play button is pressed,
   then plays with the browser's own controls; it pauses when scrolled out of view. Nothing downloads until play. */
(() => {
  const box = document.getElementById('intro-video');
  if (!box) return;
  const video = box.querySelector('video'), play = box.querySelector('.play');
  play.addEventListener('click', () => {
    box.classList.add('is-started');
    video.controls = true;
    video.play().catch(() => {});
    video.focus({ preventScroll: true });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (!e.isIntersecting && !video.paused) video.pause(); }, { threshold: 0.25 }).observe(box);
  }
})();

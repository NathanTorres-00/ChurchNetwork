  // Network Video: the YouTube thumbnail until play is pressed, then YouTube's player in its place (nothing from
  // YouTube's player loads before that). The thumbnail follows data-youtube, so a new week is one ID to change.
  (() => {
    const box = document.getElementById('network-video');
    if (!box) return;
    const id = box.dataset.youtube;
    box.querySelector('.play').addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      frame.title = box.dataset.title || 'Network video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      box.replaceChildren(frame);
      box.classList.add('is-started');
      frame.focus();
    });
  })();

  // Links still to be built go nowhere for now (as on the home page)
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('a[data-placeholder]')) e.preventDefault();
  });

(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('embed') === 'globe') return;
  const root = document.documentElement;
  const options = { page: root.dataset.reviewPage };
  let loading;
  const load = () => {
    if (!loading) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'review/review.css';
      document.head.appendChild(css);
      loading = import('../review/comment-mode.js');
    }
    return loading;
  };
  document.getElementById('comment-toggle').addEventListener('click', () => load().then(module => module.toggle(options)));
  if (params.has('owner')) import('../review/identity.js').then(module => module.captureOwnerKey());
  if (params.has('comment')) {
    const open = () => load().then(module => module.enter(options));
    if (root.classList.contains('is-loading')) window.addEventListener('page:revealed', open, { once: true });
    else open();
  }
})();

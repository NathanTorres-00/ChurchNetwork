  /* Embedded as the Groups hero's or the site footer's globe, the frame is named "rn-embed:<settings>". Some servers
     (the `serve` dev server, clean-URL redirects) drop an address's ?settings on the way from hero.html to /hero, so
     put them back before anything reads them; otherwise the whole page would show inside the frame. */
  (() => {
    const tag = 'rn-embed:';
    if (window.name.startsWith(tag) && !new URLSearchParams(location.search).has('embed'))
      history.replaceState(null, '', location.pathname + '?' + window.name.slice(tag.length) + location.hash);
  })();

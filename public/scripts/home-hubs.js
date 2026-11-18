(() => {
  const lists = [...document.querySelectorAll('.hub-list')];       // Find a hub and How we do it
  const rows = [...document.querySelectorAll('.hub-list .hub-row')];
  const cursor = document.getElementById('hub-cursor');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const photoUrl = (source, width = 640, height = 484) => source.startsWith('assets/') ? source
    : `https://images.unsplash.com/photo-${source}?w=${width}&h=${height}&fit=crop&q=70&auto=format`;
  const tallUrl = source => photoUrl(source, 360, 480);

  // The pin: the same artwork as the globe's pins, with its own clip path id
  const pin = document.getElementById('pin-template').content.firstElementChild.cloneNode(true);
  pin.querySelector('clipPath').id = 'hub-pin-clip';
  const photo = pin.querySelector('.pin-photo');
  photo.setAttribute('clip-path', 'url(#hub-pin-clip)');
  cursor.appendChild(pin);

  // Load each hub's photos up front (the pin's crop and the Photo cursor's) so neither ever opens empty
  const loaded = new Set();
  rows.forEach(row => {
    const source = row.dataset.photo, pinUrl = photoUrl(source), tall = tallUrl(source);
    const img = new Image();
    img.onload = () => loaded.add(source);
    img.src = pinUrl;
    if (tall !== pinUrl) new Image().src = tall;
  });

  // The Photo cursor's two layers: a new hub's photo fades in over the last one
  const layers = [...cursor.querySelectorAll('.photo img')];
  let front = 0;
  function showTall(id) {
    const url = tallUrl(id), prev = layers[front], next = layers[front ^ 1];
    if (prev.dataset.id === id) return;
    front ^= 1;
    next.dataset.id = id;
    next.style.zIndex = 1; prev.style.zIndex = 0;
    const reveal = () => { if (next.dataset.id !== id) return; next.style.opacity = 1; setTimeout(() => { if (layers[front] === next) prev.style.opacity = 0; }, 320); };
    next.style.opacity = 0;
    next.src = url;
    next.complete ? requestAnimationFrame(reveal) : next.decode().then(reveal, reveal);
  }

  // Ring-dots for each row, fitted beside the name: as many of the 12 columns as there's room for between the
  // name and "Get directions" (none under 4)
  const DOT = 20, DOT_STEP = 47, DOT_ROWS = 4;
  const textRight = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().right; };
  rows.forEach(row => {
    const dots = document.createElement('span');
    dots.className = 'hub-dots';
    dots.setAttribute('aria-hidden', 'true');
    row.appendChild(dots);
  });
  function fitDots() {
    rows.forEach(row => {
      const dots = row.querySelector('.hub-dots'), go = row.querySelector('.go');
      const gap = parseFloat(getComputedStyle(row).columnGap) || 36;
      const goLeft = go.getBoundingClientRect().left, rowRight = row.getBoundingClientRect().right;
      const textEnd = Math.max(textRight(row.querySelector('h3')), textRight(row.querySelector('p')));
      const cols = Math.min(12, Math.floor((goLeft - textEnd - 2 * gap + DOT_STEP - DOT) / DOT_STEP));
      dots.hidden = cols < 4 || go.offsetTop > row.querySelector('h3').offsetTop + 40;   // or "Get directions" sits below the name
      if (dots.hidden) return;
      dots.style.setProperty('--dots-cols', cols);
      dots.style.setProperty('--dots-right', `${rowRight - goLeft + gap}px`);
      if (dots.children.length !== cols * DOT_ROWS) dots.innerHTML = '<i></i>'.repeat(cols * DOT_ROWS);
    });
  }
  const fitter = new ResizeObserver(fitDots);
  lists.forEach(list => fitter.observe(list));
  document.fonts?.ready.then(fitDots);

  // The dots ripple out from (px, py): where the pointer came in, or the hub's dot for the keyboard
  function ripple(row, px, py) {
    for (const d of row.querySelectorAll('.hub-dots i')) {
      const r = d.getBoundingClientRect();
      d.style.setProperty('--d', still ? '0ms' : `${Math.round(Math.hypot(r.left + DOT / 2 - px, r.top + DOT / 2 - py) * 0.55)}ms`);
    }
  }

  let current = null, mode = '', x = 0, y = 0, tx = 0, ty = 0, raf = 0, last = 0;
  const pointer = { x: 0, y: 0, known: false };            // where the mouse is, anywhere in the window

  function show(row) {
    if (row === current) return;
    current = row;
    cursor.style.setProperty('--hc', getComputedStyle(row).getPropertyValue('--hc'));
    ripple(row, tx, ty);
    showTall(row.dataset.photo);
    const url = photoUrl(row.dataset.photo);
    photo.style.opacity = 0;                                 // quick crossfade to the new hub's photo
    const swap = () => {
      if (current !== row) return;
      photo.setAttribute('href', url);
      photo.style.opacity = 1;
    };
    loaded.has(row.dataset.photo) ? setTimeout(swap, 120) : Object.assign(new Image(), { onload: swap, src: url });
    cursor.style.setProperty('--s', finePointer ? 1 : 0);
    cursor.style.setProperty('--p', 1);
  }
  function hide() {
    current = null;
    cursor.style.setProperty('--s', 0);
    cursor.style.setProperty('--p', 0);
  }

  // Follow the pointer with a slight, smooth lag
  function follow(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const k = still ? 1 : 1 - Math.exp(-dt * 14);
    x += (tx - x) * k; y += (ty - y) * k;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    // Near either edge of the window, slide the pin inward so it stays fully in view
    const left = x - 240 * 0.4846, right = left + 240, edge = 12, vw = document.documentElement.clientWidth;
    cursor.style.setProperty('--dx', (left < edge ? edge - left : right > vw - edge ? vw - edge - right : 0) + 'px');
    if (current || Math.abs(tx - x) + Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(follow);
    else { raf = 0; last = 0; }
  }
  const run = () => { if (!raf) raf = requestAnimationFrame(follow); };

  if (finePointer) {
    document.documentElement.classList.add('has-hub-cursor');
    for (const list of lists) {
      list.addEventListener('pointermove', e => {
        tx = e.clientX; ty = e.clientY;
        if (!current || mode !== 'pointer') { x = tx; y = ty; }   // appear right under the pointer
        mode = 'pointer';
        const row = e.target.closest('.hub-row');
        row ? show(row) : hide();
        run();
      });
      list.addEventListener('pointerleave', hide);
    }
    window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.known = true; }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer.known = false; });
  }
  /* Scrolling moves the rows under a still pointer without any pointer event, so re-check what's
     under it: the circle stays put, and the pin switches to the hub row now beneath it (or closes
     when the pointer is off the list). A keyboard pin rides along with its row. */
  window.addEventListener('scroll', () => {
    if (mode === 'keyboard' && current) { placeAtDot(current); run(); return; }
    if (!finePointer || !pointer.known || mode === 'keyboard') return;
    const el = document.elementFromPoint(pointer.x, pointer.y);
    const row = el && el.closest('.hub-row');
    tx = pointer.x; ty = pointer.y;
    if (row && row.closest('.hub-list')) {
      if (!current) { x = tx; y = ty; }
      mode = 'pointer';
      show(row);
      run();
    } else if (current) hide();
  }, { passive: true });

  function placeAtDot(row) {
    const g = row.querySelector('.glyph').getBoundingClientRect();
    tx = g.left + g.width / 2; ty = g.top + g.height / 2 + 30;
  }

  // Keyboard: the pin rises over the focused hub's dot, without the cursor circle
  for (const list of lists) {
    list.addEventListener('focusin', e => {
      const row = e.target.closest('.hub-row');
      if (!row || !row.matches(':focus-visible')) return;
      mode = 'keyboard';
      placeAtDot(row);
      x = tx; y = ty;
      show(row);
      cursor.style.setProperty('--s', 0);
      run();
    });
    list.addEventListener('focusout', e => { if (!list.contains(e.relatedTarget)) hide(); });
  }
})();

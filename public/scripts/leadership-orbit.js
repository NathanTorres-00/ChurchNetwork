  /* The orbits: one ring-dot per person, the network's leaders on the inner circle and its other group leaders on
     the outer one, read from the lists above (so names and photos are kept in one place). Each links to the
     person's place in the list. */
  (() => {
    const orbit = document.getElementById('orbit');
    const inner = [...document.querySelectorAll('.people-network .person')];
    const outer = [...document.querySelectorAll('.people-group .person[id]')];   // network leaders are on the inner circle
    let i = 0;
    const place = (people, r, cls, turn) => people.forEach((li, k) => {
      const a = (k / people.length + turn) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
      const name = li.querySelector('.person-name').textContent;
      const node = document.createElement('a');
      node.className = 'node ' + cls;
      node.href = '#' + li.id;
      node.setAttribute('aria-label', name);
      node.style.cssText = `--x:${x}%;--y:${y}%;--i:${i++};--fx:${(50 - x).toFixed(2)}cqi;--fy:${(50 - y).toFixed(2)}cqi`;
      // a leader without a photo gets a plain dot (the content allows it; main's page always had photos)
      const photo = li.querySelector('img');
      node.innerHTML = (photo ? `<img src="${photo.getAttribute('src')}" alt="">` : '<span class="node-empty"></span>') +
        '<span class="node-name" aria-hidden="true"></span>';
      node.querySelector('.node-name').textContent = name;
      orbit.appendChild(node);
    });
    place(inner, 27, 'is-network', 0);
    place(outer, 45, 'is-group', 1 / 30);
    // grow once, when the orbit is first on screen
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { orbit.classList.add('is-growing'); io.disconnect(); } }, { threshold: 0.2 }).observe(orbit);
  })();

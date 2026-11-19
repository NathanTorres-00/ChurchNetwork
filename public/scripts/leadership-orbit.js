  /* The orbit: one ring-dot per anchored person in the Groups lists below (so names and photos are kept in one
     place); each links to the person's place in the list. Unanchored repeats stay in the directory only. */
  (() => {
    const orbit = document.getElementById('orbit');
    if (!orbit) return;
    const people = [...document.querySelectorAll('.people-group .person[id]')];
    people.forEach((li, i) => {
      const a = (i / people.length) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + 45 * Math.cos(a), y = 50 + 45 * Math.sin(a);
      const name = li.querySelector('.person-name').textContent;
      const node = document.createElement('a');
      node.className = 'node is-group';
      node.href = '#' + li.id;
      node.setAttribute('aria-label', name);
      node.style.cssText = `--x:${x}%;--y:${y}%;--i:${i};--fx:${(50 - x).toFixed(2)}cqi;--fy:${(50 - y).toFixed(2)}cqi`;
      // name tags near the sides open inward
      if (x < 25 || x > 75) node.style.setProperty('--name-offset', x < 25 ? '0%' : '-100%');
      // a leader without a photo gets a plain dot
      const photo = li.querySelector('img');
      node.innerHTML = (photo ? `<img src="${photo.getAttribute('src')}" alt="">` : '<span class="node-empty"></span>') +
        '<span class="node-name" aria-hidden="true"></span>';
      node.querySelector('.node-name').textContent = name;
      orbit.appendChild(node);
    });
    // grow once, when the orbit is first on screen
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { orbit.classList.add('is-growing'); io.disconnect(); } }, { threshold: 0.2 }).observe(orbit);
  })();

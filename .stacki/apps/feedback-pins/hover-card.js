// The hover card's page, drawn by the app as an overlay `frame` beside a hovered pin.
//
// It talks to the app with overlay.post (docs/apps.md, "Messages to overlay frames"):
// it says `ready`, the app answers with the thread's preview, and the card answers
// with its own height so the app sizes the frame to the content.
(() => {
  const FP = window.FP;
  const card = document.getElementById('card');
  /** The card's width in CSS pixels: the app sizes the frame from it. */
  const CARD_WIDTH_PX = 260;

  /** The preview is the app's own message, but it is still parsed before use. */
  const parse = (raw) => {
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || value.kind !== 'preview') return undefined;
      return {
        number: Number.isSafeInteger(value.number) ? value.number : undefined,
        author: typeof value.author === 'string' ? value.author.slice(0, 60) : '',
        github: typeof value.github === 'string' ? value.github.slice(0, 39) : undefined,
        agent: typeof value.agent === 'string' && value.agent.trim() !== '' ? value.agent.slice(0, 40) : undefined,
        avatar: FP.avatarURL(value.avatar),
        body: typeof value.body === 'string' ? value.body.slice(0, 400) : '',
        createdAt: Number.isSafeInteger(value.createdAt) ? value.createdAt : undefined,
        replies: Number.isSafeInteger(value.replies) ? value.replies : 0,
        snapshot: FP.snapshot(value.snapshot),
        scope: typeof value.scope === 'string' ? value.scope.slice(0, 80) : undefined,
        draggable: value.draggable === true,
      };
    } catch {
      return undefined;
    }
  };

  const draw = (preview) => {
    card.textContent = '';
    const line = document.createElement('div');
    line.className = 'byline';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = preview.github && preview.author === preview.github ? `@${preview.github}` : preview.author;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = preview.createdAt ? FP.ago(preview.createdAt) : '';
    line.append(FP.avatarElement(preview), name);
    if (preview.agent) {
      // The AI badge: a coding agent wrote this comment for the person named.
      const badge = document.createElement('span');
      badge.className = 'agent-badge';
      badge.textContent = `✦ ${preview.agent}`;
      line.append(badge);
    }
    line.append(time);
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = preview.body;
    card.append(line, body);
    if (preview.snapshot) {
      // Natural CSS size, never wider than the card's content box (its width less the padding).
      card.append(FP.snapshotImage(preview.snapshot, CARD_WIDTH_PX - 24, ''));
    }
    const parts = [];
    if (preview.scope) parts.push(preview.scope);
    if (preview.replies > 0) parts.push(`${preview.replies} ${preview.replies === 1 ? 'reply' : 'replies'}`);
    if (preview.draggable) parts.push('Drag the pin to move it');
    if (parts.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = parts.join(' · ');
      card.append(meta);
    }
    card.hidden = false;
    // The snapshot has its size set, so layout is final now: report the height for the frame.
    requestAnimationFrame(() => {
      const height = Math.ceil(card.getBoundingClientRect().height);
      void stacki.overlay.post({ data: JSON.stringify({ kind: 'height', height }) }).catch(() => {});
    });
  };

  stacki.on('overlay.message', ({ data }) => {
    const preview = parse(data);
    if (preview) draw(preview);
  });
  void stacki.overlay.post({ data: JSON.stringify({ kind: 'ready' }) }).catch(() => {});
})();

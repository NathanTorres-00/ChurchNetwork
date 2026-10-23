// Ties a point on the page to an element, so a mark stays on the thing it points at when the layout changes.
// An anchor is { path, fx, fy, vw }: a CSS path to the element, the point as fractions of its box, and the
// window width when the mark was made.

// Parts of the page that change on their own (typed letters, moving pins). A point inside one attaches to the
// nearest ancestor outside it, which stays put.
export const VOLATILE = '#slot, #pins, #pin-areas, .hub-cursor';

const ID = /^[A-Za-z][\w-]*$/;

export function pathFor(el) {
  const steps = [];
  for (let node = el; node && node !== document.body && node.nodeType === 1; node = node.parentElement) {
    if (node.id && ID.test(node.id)) return ['#' + node.id, ...steps].join(' > ');
    const tag = node.tagName.toLowerCase();
    let n = 1;
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) if (sib.tagName === node.tagName) n++;
    steps.unshift(`${tag}:nth-of-type(${n})`);
  }
  return ['body', ...steps].join(' > ');
}

export function findByPath(path, doc = document) {
  try { return doc.querySelector(path); } catch { return null; }
}

export function stableTarget(el) {
  const volatile = el.closest(VOLATILE);
  return volatile ? volatile.parentElement || document.body : el;
}

const clamp01 = n => Math.min(1, Math.max(0, n));

export function toFraction(rect, x, y) {
  return {
    fx: rect.width ? clamp01((x - rect.left) / rect.width) : 0,
    fy: rect.height ? clamp01((y - rect.top) / rect.height) : 0,
  };
}

export function fromFraction(rect, fx, fy) {
  return { x: rect.left + fx * rect.width, y: rect.top + fy * rect.height };
}

// The anchor for a point in the window (client coordinates), ignoring comment mode's own interface
export function anchorAt(clientX, clientY) {
  const hit = document.elementsFromPoint(clientX, clientY)
    .find(el => !el.closest('[data-review-ui]') && el !== document.documentElement);
  const el = stableTarget(hit && document.body.contains(hit) ? hit : document.body);
  const { fx, fy } = toFraction(el.getBoundingClientRect(), clientX, clientY);
  return { path: pathFor(el), fx, fy, vw: window.innerWidth };
}

// The caret position (text node and offset) nearest a point in the window, or null when it isn't in text.
// Comment mode's own interface is looked through: parts of it under the point stop catching hits while the
// browser looks, and a caret that still lands inside it doesn't count.
export function caretAt(clientX, clientY) {
  const ui = document.elementsFromPoint(clientX, clientY).filter(el => el.closest('[data-review-ui]'));
  const saved = ui.map(el => [el, el.style.getPropertyValue('pointer-events'), el.style.getPropertyPriority('pointer-events')]);
  ui.forEach(el => el.style.setProperty('pointer-events', 'none', 'important'));
  let node = null;
  let offset = 0;
  try {
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos) ({ offsetNode: node, offset } = pos);
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range) ({ startContainer: node, startOffset: offset } = range);
    }
  } finally {
    saved.forEach(([el, value, priority]) => {
      if (value) el.style.setProperty('pointer-events', value, priority);
      else el.style.removeProperty('pointer-events');
    });
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentElement || node.parentElement.closest('[data-review-ui]')) return null;
  return { node, offset };
}

// Where an anchor sits now, in page coordinates, or null when its element is gone or hidden
export function resolveAnchor(anchor) {
  const el = anchor && findByPath(anchor.path);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (!rect.width && !rect.height && el !== document.body) return null;
  const { x, y } = fromFraction(rect, anchor.fx, anchor.fy);
  return { x: x + window.scrollX, y: y + window.scrollY };
}

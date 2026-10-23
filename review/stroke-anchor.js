// Ties a marker stroke to what it marks, so it stays on its word or element when the page is a different width.
//
// A stroke is stored as offsets from one origin point, so its hand-drawn shape never stretches. The origin is
// the top-left of a character when there is text where the stroke points (inside a loop, or just above an
// underline), else a point on an element (an anchor from anchor.js). Text moves within its element when it
// rewraps, so a character follows its word where fractions of the element's box wouldn't. The stroke scales
// with the font size where it's anchored, so a circle around a word still fits the word when the type is
// smaller. A highlighter stroke along a line of text also records the text it covers, and is drawn as one band
// per line of that text, like a selection.

import { MAX_STROKE_POINTS } from '../convex/limits.js';
import { VOLATILE, anchorAt, caretAt, findByPath, pathFor, resolveAnchor, stableTarget, toFraction } from './anchor.js';
import { bounds, fromFlat, isAlongText, simplify, toFlat } from './ink.js';

const ABOVE = [6, 14, 24];     // px above a flat stroke where the text it underlines may be, nearest first
const MIN_INSIDE = 16;         // a pen stroke this big on both sides records what it surrounds
const SHIFT_SLACK = 8;         // px a surrounded point may sit outside the stroke before it counts as split off
const LINE_SLOP = 2;           // px between the tops of text boxes on the same line
const BAND = 0.75;             // a highlighter band's height, as a share of its line's

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fontSize = el => Math.min(500, parseFloat(getComputedStyle(el).fontSize) || 16);

function textNodes(el) {
  const out = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) out.push(n);
  return out;
}

// The box of the character at offset o, or null when there isn't a visible one
function charRect(node, o) {
  if (o < 0 || o >= node.length) return null;
  const range = document.createRange();
  range.setStart(node, o);
  range.setEnd(node, o + 1);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

// The text at a point: the caret there and the character beside it (o), kept only when that character is within
// one font size of the point and outside the parts of the page that change on their own
function textNear(x, y) {
  const hit = caretAt(x, y);
  if (!hit || hit.node.parentElement.closest(VOLATILE)) return null;
  const limit = fontSize(hit.node.parentElement);
  let best = null;
  for (const o of [hit.offset, hit.offset - 1]) {
    const rect = charRect(hit.node, o);
    if (!rect) continue;
    const d = Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
    if (d <= limit && (!best || d < best.d)) best = { ...hit, o, rect, d };
  }
  return best;
}

// A place in text as { path, i, o }: the element, which of its text nodes, and the offset in that node
function textPos(node, o) {
  const el = stableTarget(node.parentElement);
  return { path: pathFor(el), i: textNodes(el).indexOf(node), o };
}

// An anchor on el at a point in the window. A character's top-left can sit just outside its element's box (the
// glyph rises above a tight line), where anchorAt would land on the section around it instead.
function anchorOn(el, x, y) {
  return { path: pathFor(el), ...toFraction(el.getBoundingClientRect(), x, y), vw: window.innerWidth };
}

function nodeAt(pos) {
  const el = findByPath(pos.path);
  const node = el && textNodes(el)[pos.i];
  return node && pos.o <= node.length ? node : null;
}

const inOrder = (a, b) => a.node === b.node
  ? a.offset <= b.offset
  : !!(a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING);

// points: the stroke as drawn, in client coordinates. pressures: one per point for a stylus, else null.
export function anchorStroke(points, ink, pressures = null) {
  let kept = simplify(points);
  for (let d = 2; kept.length > MAX_STROKE_POINTS; d *= 2) kept = simplify(points, d);
  const box = bounds(kept);
  const midX = box.x + box.w / 2;
  const midY = box.y + box.h / 2;
  const along = isAlongText(kept);

  // Where the stroke points: inside a loop, its middle; for an underline or a strike, the text just above it
  let probe = [midX, midY];
  let hit = null;
  if (along) {
    const probes = ABOVE.map(dy => [midX, box.y - dy]);
    const i = probes.findIndex(p => (hit = textNear(...p)));
    probe = probes[Math.max(0, i)];
  } else {
    hit = textNear(...probe);
  }

  const origin = hit ? { x: hit.rect.left, y: hit.rect.top } : { x: probe[0], y: probe[1] };
  // with a character, anchored on its element at the origin itself, so if the character can't be found later
  // its element puts the stroke back where the character was, at the same scale
  const el = hit ? stableTarget(hit.node.parentElement) : null;
  const at = el ? anchorOn(el, origin.x, origin.y) : anchorAt(...probe);
  const stroke = {
    ink,
    at,
    size: fontSize(el || findByPath(at.path) || document.body),
    origin: { x: origin.x + window.scrollX, y: origin.y + window.scrollY },
    pts: toFlat(kept, origin),
  };
  if (el) stroke.char = textPos(hit.node, hit.o);

  if (Array.isArray(pressures) && pressures.length >= points.length) {
    let j = 0;
    stroke.pr = kept.map(p => {
      while (j < points.length && points[j] !== p) j++;
      return Math.round(clamp(Number(pressures[j]) || 0, 0, 1) * 100) / 100;
    });
  }

  if (ink === 'highlighter' && along) {
    let start = textNear(box.x + 2, midY);
    let end = textNear(box.x + box.w - 2, midY);
    if (start && end) {
      if (!inOrder(start, end)) [start, end] = [end, start];
      stroke.text = { start: textPos(start.node, start.offset), end: textPos(end.node, end.offset) };
    }
  }

  if (ink === 'pen' && box.w >= MIN_INSIDE && box.h >= MIN_INSIDE) {
    const wide = box.w >= box.h;
    const spot = f => (wide ? [box.x + box.w * f, midY] : [midX, box.y + box.h * f]);
    const inside = [];
    for (const [x, y] of [[midX, midY], spot(0.25), spot(0.75)]) {
      const a = anchorAt(x, y);
      if (!inside.some(b => b.path === a.path)) inside.push(a);
    }
    stroke.inside = inside;
  }
  return stroke;
}

// One band per line of the text a highlighter stroke covers, in page coordinates, or null when it can't be found
function textBands(text) {
  const start = nodeAt(text.start);
  const end = nodeAt(text.end);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start, text.start.o);
  range.setEnd(end, text.end.o);
  // only the text's own boxes: a range over a whole element would also report the element's box
  const root = range.commonAncestorContainer;
  const nodes = root.nodeType === Node.TEXT_NODE ? [root] : textNodes(root).filter(n => range.intersectsNode(n));
  const lines = [];
  const part = document.createRange();
  for (const n of nodes) {
    part.setStart(n, n === start ? text.start.o : 0);
    part.setEnd(n, n === end ? text.end.o : n.length);
    for (const r of part.getClientRects()) {
      if (!r.width || !r.height) continue;
      const line = lines.find(l => Math.abs(l.top - r.top) <= LINE_SLOP);
      if (!line) lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      else Object.assign(line, {
        bottom: Math.max(line.bottom, r.bottom), left: Math.min(line.left, r.left), right: Math.max(line.right, r.right),
      });
    }
  }
  if (!lines.length) return null;
  return lines.sort((a, b) => a.top - b.top).map(l => ({
    x1: l.left + window.scrollX,
    x2: l.right + window.scrollX,
    y: (l.top + l.bottom) / 2 + window.scrollY,
    h: BAND * (l.bottom - l.top),
  }));
}

// Where a stroke is now: its points in page coordinates, the bands of text it highlights (or null to draw it as
// drawn) and how much it has scaled. Null when neither its character nor its element can be found.
export function resolveStroke(stroke) {
  let origin = null;
  let el = null;
  const node = stroke.char && nodeAt(stroke.char);
  const rect = node && charRect(node, stroke.char.o);
  if (rect) {
    origin = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
    el = node.parentElement;
  } else {
    origin = resolveAnchor(stroke.at);
    if (!origin) return null;
    el = findByPath(stroke.at.path);
  }
  const scale = clamp(fontSize(el) / stroke.size, 0.25, 4);
  return {
    points: fromFlat(stroke.pts, origin, scale),
    bands: stroke.text ? textBands(stroke.text) : null,
    scale,
  };
}

// Whether what a pen stroke surrounded when it was drawn has split apart at this width (two things side by side
// that stack): one of them has moved out from inside the stroke, or they no longer sit side by side. They were
// recorded along the stroke's middle line, so ones that have stacked since sit far apart across it, even when
// the stroke, which keeps its size, is still big enough to take them in.
export function strokeShifted(stroke, resolved) {
  if (!resolved || !stroke.inside?.length) return false;
  const b = bounds(resolved.points);
  const now = stroke.inside.map(resolveAnchor).filter(Boolean);
  const out = now.some(p => p.x < b.x - SHIFT_SLACK || p.x > b.x + b.w + SHIFT_SLACK ||
    p.y < b.y - SHIFT_SLACK || p.y > b.y + b.h + SHIFT_SLACK);
  if (out || now.length < 2) return out;
  const across = now.map(p => (b.w >= b.h ? p.y : p.x));
  return Math.max(...across) - Math.min(...across) > Math.min(b.w, b.h) / 2;
}

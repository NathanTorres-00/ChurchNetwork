// Limits for comment mode, shared by the Convex functions and the in-memory test store.
// Keep this file free of imports so the browser can load it as-is.

export const MAX_TEXT = 2000;          // characters in a comment or note
export const MAX_TITLE = 120;          // characters in a voice memo's title
export const MAX_NAME = 60;            // characters in a reviewer's name
export const MAX_VOICE_MS = 180000;    // longest voice memo (3 minutes)
export const RATE_WINDOW_MS = 60000;   // a device may post RATE_MAX marks per window
export const RATE_MAX = 10;
export const GLOBAL_RATE_MAX = 60;     // and everyone together GLOBAL_RATE_MAX, since device IDs are the caller's to choose
export const LIST_MAX = 500;           // newest marks a page shows
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export const MAX_STROKES = 40;         // strokes in one drawing
export const MAX_POINTS = 6000;        // points in one drawing, all strokes together
export const MAX_STROKE_POINTS = 2000; // points in one stroke
export const MAX_COORD = 20000;        // furthest a point may sit from its origin, in px
export const MAX_ORIGIN = 1e6;         // furthest a stroke's origin may sit from the page's top-left, in px
export const MAX_INSIDE = 4;           // anchors a stroke may record for the elements it was drawn inside
export const MIN_WIDTH = 0.25;         // thinnest and thickest a stroke or arrow may be drawn, as a share of its
export const MAX_WIDTH = 5;            // tool's usual width

export const KINDS = ['comment', 'voice', 'arrow', 'highlight', 'drawing'];
export const PAGES = ['home'];

const MAX_PATH = 500;
const MAX_DEVICE = 100;
const MAX_MIME = 100;
const MAX_CLIENT_ID = 64;

const isText = (s, max) => typeof s === 'string' && s.length <= max;
const isFraction = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function isAnchor(a) {
  return !!a && isText(a.path, MAX_PATH) && a.path.length > 0 && isFraction(a.fx) && isFraction(a.fy) &&
    typeof a.vw === 'number' && Number.isFinite(a.vw) && a.vw > 0;
}

const isNum = n => typeof n === 'number' && Number.isFinite(n);
const isWidth = w => w === undefined || (isNum(w) && w >= MIN_WIDTH && w <= MAX_WIDTH);

function isTextPos(p) {
  return !!p && isText(p.path, MAX_PATH) && p.path.length > 0 &&
    Number.isInteger(p.i) && p.i >= 0 && Number.isInteger(p.o) && p.o >= 0;
}

// Returns the number of points in the stroke, or -1 when the stroke is not acceptable
function strokePoints(s) {
  if (!s || (s.ink !== 'pen' && s.ink !== 'highlighter') || !isAnchor(s.at)) return -1;
  if (!isNum(s.size) || !(s.size > 0) || s.size > 500) return -1;
  if (!isWidth(s.w)) return -1;
  if (s.cut !== undefined && ![1, 2, 3].includes(s.cut)) return -1;
  if (!s.origin || ![s.origin.x, s.origin.y].every(n => isNum(n) && Math.abs(n) <= MAX_ORIGIN)) return -1;
  const pts = s.pts;
  if (!Array.isArray(pts) || pts.length % 2 || pts.length < 4 || pts.length > MAX_STROKE_POINTS * 2) return -1;
  if (!pts.every(n => isNum(n) && Math.abs(n) <= MAX_COORD)) return -1;
  if (s.pr !== undefined && (!Array.isArray(s.pr) || s.pr.length !== pts.length / 2 || !s.pr.every(n => isNum(n) && n >= 0 && n <= 1))) return -1;
  if (s.char !== undefined && !isTextPos(s.char)) return -1;
  if (s.text !== undefined && (!s.text || !isTextPos(s.text.start) || !isTextPos(s.text.end))) return -1;
  if (s.inside !== undefined && (!Array.isArray(s.inside) || s.inside.length > MAX_INSIDE || !s.inside.every(isAnchor))) return -1;
  return pts.length / 2;
}

// null when the mark is acceptable, 'INVALID' otherwise
export function validateMark(m) {
  if (!m || !KINDS.includes(m.kind) || !PAGES.includes(m.page)) return 'INVALID';
  if (m.clientId !== undefined && (!isText(m.clientId, MAX_CLIENT_ID) || !m.clientId)) return 'INVALID';
  const author = typeof m.author === 'string' ? m.author.trim() : '';
  if (!author || author.length > MAX_NAME) return 'INVALID';
  if (!isText(m.deviceId, MAX_DEVICE) || !m.deviceId) return 'INVALID';
  if (m.text !== undefined && !isText(m.text, MAX_TEXT)) return 'INVALID';
  if (m.w !== undefined && (m.kind !== 'arrow' || !isWidth(m.w))) return 'INVALID';

  if (m.kind === 'drawing') {
    if (m.at !== undefined || m.from !== undefined || m.to !== undefined) return 'INVALID';
    if (!Array.isArray(m.strokes) || m.strokes.length < 1 || m.strokes.length > MAX_STROKES) return 'INVALID';
    let points = 0;
    for (const s of m.strokes) {
      const n = strokePoints(s);
      if (n < 0) return 'INVALID';
      points += n;
    }
    if (points > MAX_POINTS) return 'INVALID';
  } else if (m.strokes !== undefined) {
    return 'INVALID';
  } else if (m.kind === 'comment' || m.kind === 'voice') {
    if (!isAnchor(m.at)) return 'INVALID';
  } else if (!isAnchor(m.from) || !isAnchor(m.to)) {
    return 'INVALID';
  }

  if (m.kind === 'comment' && !(m.text ?? '').trim()) return 'INVALID';
  if (m.kind === 'voice') {
    const a = m.audio;
    if (!a || !a.storageId || !isText(a.mime, MAX_MIME) || !a.mime.startsWith('audio/')) return 'INVALID';
    if (typeof a.durationMs !== 'number' || !(a.durationMs > 0) || a.durationMs > MAX_VOICE_MS) return 'INVALID';
    if (m.text !== undefined && m.text.length > MAX_TITLE) return 'INVALID';
  } else if (m.audio !== undefined) {
    return 'INVALID';
  }
  return null;
}

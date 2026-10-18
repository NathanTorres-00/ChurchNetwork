// Limits for comment mode, shared by the Convex functions and the in-memory test store.
// Keep this file free of imports so the browser can load it as-is.

export const MAX_TEXT = 2000;          // characters in a comment or note
export const MAX_TITLE = 120;          // characters in a voice memo's title
export const MAX_NAME = 60;            // characters in a reviewer's name
export const MAX_VOICE_MS = 180000;    // longest voice memo (3 minutes)
export const RATE_WINDOW_MS = 60000;   // a device may post RATE_MAX marks per window
export const RATE_MAX = 10;

export const KINDS = ['comment', 'voice', 'arrow', 'highlight'];

const MAX_PATH = 500;
const MAX_DEVICE = 100;
const MAX_MIME = 100;

const isText = (s, max) => typeof s === 'string' && s.length <= max;
const isFraction = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function isAnchor(a) {
  return !!a && isText(a.path, MAX_PATH) && a.path.length > 0 && isFraction(a.fx) && isFraction(a.fy) &&
    typeof a.vw === 'number' && Number.isFinite(a.vw) && a.vw > 0;
}

// null when the mark is acceptable, 'INVALID' otherwise
export function validateMark(m) {
  if (!m || !KINDS.includes(m.kind)) return 'INVALID';
  const author = typeof m.author === 'string' ? m.author.trim() : '';
  if (!author || author.length > MAX_NAME) return 'INVALID';
  if (!isText(m.deviceId, MAX_DEVICE) || !m.deviceId) return 'INVALID';
  if (m.text !== undefined && !isText(m.text, MAX_TEXT)) return 'INVALID';

  if (m.kind === 'comment' || m.kind === 'voice') {
    if (!isAnchor(m.at)) return 'INVALID';
  } else if (!isAnchor(m.from) || !isAnchor(m.to)) {
    return 'INVALID';
  }

  if (m.kind === 'comment' && !(m.text ?? '').trim()) return 'INVALID';
  if (m.kind === 'voice') {
    const a = m.audio;
    if (!a || !a.storageId || !isText(a.mime, MAX_MIME)) return 'INVALID';
    if (typeof a.durationMs !== 'number' || !(a.durationMs > 0) || a.durationMs > MAX_VOICE_MS) return 'INVALID';
    if (m.text !== undefined && m.text.length > MAX_TITLE) return 'INVALID';
  } else if (m.audio !== undefined) {
    return 'INVALID';
  }
  return null;
}

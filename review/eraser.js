// The Marker's eraser: rubs out the parts of the draft drawing's strokes it passes over, as wide as the eraser. A
// stroke it crosses is cut in two, and each piece left is tied to the page where it now lies, like a stroke just
// drawn. A highlight that follows text is cut along its bands, so what's left covers the words not rubbed out.
import { eraseLine, inkWidth } from './ink.js';
import { anchorStroke } from './stroke-anchor.js';

// The ink's width as drawn: the ink's usual width times the width it was drawn at. A band over text is as tall
// as its line, or thinner when the highlighter was set thinner than usual.
export const strokeWidth = stroke => inkWidth(stroke.ink) * (stroke.w ?? 1);
export const bandHeight = (stroke, band) => band.h * Math.min(1, stroke.w ?? 1);

// A piece of a stroke tied to the page again. points are in page coordinates, with pressure third for a stylus.
function piece(stroke, points, cut) {
  const client = points.map(([x, y]) => [x - scrollX, y - scrollY]);
  const pressures = stroke.pr ? points.map(p => p[2]) : null;
  const out = anchorStroke(client, stroke.ink, pressures);
  if (stroke.w != null) out.w = stroke.w;
  if (stroke.ink === 'pen' && cut) out.cut = cut;
  return out;
}

// strokes: the drawing's strokes. placed: where they're drawn now ({ stroke, at } from the marks layer).
// path: the eraser's points since last time, in client coordinates; reach: its radius. Returns the strokes left,
// or null when the eraser touched none.
export function rubOut(strokes, placed, path, reach) {
  const line = path.map(([x, y]) => [x + scrollX, y + scrollY]);
  let changed = false;
  const out = strokes.flatMap(stroke => {
    const at = placed.find(p => p.stroke === stroke)?.at;
    if (!at) return [stroke];
    if (at.bands) {
      const lines = at.bands.map(b => ({ pts: [[b.x1, b.y], [b.x2, b.y]], half: bandHeight(stroke, b) / 2 }));
      const cuts = lines.map(l => eraseLine(l.pts, l.half, line, reach));
      if (cuts.every(c => !c)) return [stroke];
      changed = true;
      return lines.flatMap((l, i) => cuts[i] ?? [l.pts]).map(pts => piece(stroke, pts, 0));
    }
    const points = stroke.pr ? at.points.map((p, i) => [...p, stroke.pr[i]]) : at.points;
    const pieces = eraseLine(points, strokeWidth(stroke) / 2, line, reach);
    if (!pieces) return [stroke];
    changed = true;
    // a piece's ends are cut where they aren't the stroke's own ends (which keep whether they were cut before)
    const first = points[0], last = points[points.length - 1];
    return pieces.map(pts => {
      const startCut = pts[0] === first ? (stroke.cut ?? 0) & 1 : 1;
      const endCut = pts[pts.length - 1] === last ? (stroke.cut ?? 0) & 2 : 2;
      return piece(stroke, pts, startCut | endCut);
    });
  });
  return changed ? out : null;
}

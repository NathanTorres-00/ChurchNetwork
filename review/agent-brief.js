// "Copy for agent": the open marks on a page as one Markdown task list to paste into a chat with a coding agent.
// Each item says what the reviewer said and where it is: the words near the mark and the element's CSS path, so
// the agent can find it in the source file.
import { findByPath } from './anchor.js';
import { textOf } from './stroke-anchor.js';

const KIND = { comment: 'Comment', voice: 'Voice memo', arrow: 'Arrow', highlight: 'Highlight', drawing: 'Drawing' };
const NEAR_MAX = 120;          // characters of nearby text quoted for an element

const squash = s => s.replace(/\s+/g, ' ').trim();
const cut = (s, max = NEAR_MAX) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s);
const quote = s => s.split('\n').map(line => '> ' + line).join('\n');
const duration = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// What an element is, in words: the text in it, else its label or alt text, else its tag
function describe(path) {
  if (path === 'body') return 'the page as a whole (`body`)';
  const el = findByPath(path);
  if (!el) return `couldn't locate on the current page (was \`${path}\`)`;
  const text = squash(el.textContent ?? '');
  const label = el.getAttribute('aria-label') || el.getAttribute('alt') || el.querySelector?.('img[alt]')?.getAttribute('alt');
  const what = text ? `"${cut(text)}"` : label ? `${el.tagName.toLowerCase()} "${cut(squash(label))}"` : `a <${el.tagName.toLowerCase()}>`;
  return `${what} (\`${path}\`)`;
}

function where(m) {
  const lines = [];
  if (m.kind === 'comment' || m.kind === 'voice') lines.push(`Points at: ${describe(m.at.path)}`);
  if (m.kind === 'arrow') lines.push(`From: ${describe(m.from.path)}`, `To: ${describe(m.to.path)}`);
  if (m.kind === 'highlight') lines.push(`Box from: ${describe(m.from.path)}`, `Box to: ${describe(m.to.path)}`);
  if (m.kind === 'drawing') {
    const words = new Set();
    const around = new Set();
    for (const s of m.strokes ?? []) {
      const marked = s.text && textOf(s.text);
      if (marked && squash(marked)) words.add(cut(squash(marked)));
      else around.add(s.char?.path ?? s.at.path);
    }
    for (const w of words) lines.push(`Marks the words: "${w}"`);
    for (const p of around) lines.push(`Drawn on: ${describe(p)}`);
  }
  const vw = (m.at ?? m.from ?? m.strokes?.[0]?.at)?.vw;
  if (vw) lines.push(`Made in a window ${vw}px wide`);
  return lines;
}

function item(m, n) {
  const head = `## ${n}. ${KIND[m.kind] ?? m.kind} from ${m.author}${m.kind === 'voice' && m.audio ? ` (${duration(m.audio.durationMs)})` : ''}`;
  const parts = [head];
  if (m.text) parts.push(quote(m.text));
  else if (m.kind !== 'voice') parts.push('_(No note: the mark itself is the feedback.)_');
  if (m.kind === 'voice') parts.push("_This is a voice memo, which can't be pasted here. Listen to it in comment mode._");
  parts.push(where(m).map(l => '- ' + l).join('\n'));
  return parts.join('\n\n');
}

// marks: the open marks, in the thread's order. title: the page's name. url: its address. file: its source file.
export function agentBrief(marks, { title, url, file }) {
  const count = `${marks.length} open ${marks.length === 1 ? 'item' : 'items'}`;
  return [
    `# Review feedback: ${title}`,
    `Page: ${url} (source file: \`${file}\`)`,
    `${count} from comment mode. Work through them in order. Each one says what the reviewer said and where it is ` +
      'on the page: the text near the mark and the CSS path of the element it was placed on. When you\'re done, ' +
      'list which ones you fixed and which you didn\'t, and why.',
    ...marks.map((m, i) => item(m, i + 1)),
  ].join('\n\n') + '\n';
}

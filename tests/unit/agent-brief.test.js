// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { agentBrief } from '../../review/agent-brief.js';

const opts = { title: 'Church Network — Home', url: 'https://example.com/', file: 'hero.html' };
const at = (path, vw = 1440) => ({ path, fx: 0.5, fy: 0.5, vw });
const brief = marks => agentBrief(marks, opts);

beforeEach(() => {
  document.body.innerHTML = `
    <main>
      <h1 id="title">Multiplying   disciples
        across the network</h1>
      <p id="long">${'word '.repeat(60)}</p>
      <figure id="photo"><img src="x.jpg" alt="A church gathering"></figure>
      <canvas id="globe"></canvas>
    </main>`;
});

describe('agentBrief', () => {
  test('heads the list with the page, its source file and how many items there are', () => {
    const out = brief([{ kind: 'comment', author: 'Ana', text: 'Bigger', at: at('#title') }]);
    expect(out).toMatch(/^# Review feedback: Church Network — Home\n/);
    expect(out).toContain('Page: https://example.com/ (source file: `hero.html`)');
    expect(out).toContain('1 open item from comment mode.');
  });

  test('a comment quotes the reviewer and the text it points at, with its path and window width', () => {
    const out = brief([{ kind: 'comment', author: 'Ana', text: 'Make this bigger\nand bolder', at: at('#title', 390) }]);
    expect(out).toContain('## 1. Comment from Ana');
    expect(out).toContain('> Make this bigger\n> and bolder');
    expect(out).toContain('- Points at: "Multiplying disciples across the network" (`#title`)');
    expect(out).toContain('- Made in a window 390px wide');
  });

  test('long text is cut short, and elements without text use their alt text or tag', () => {
    const out = brief([
      { kind: 'comment', author: 'A', text: 'x', at: at('#long') },
      { kind: 'comment', author: 'B', text: 'y', at: at('#photo') },
      { kind: 'comment', author: 'C', text: 'z', at: at('#globe') },
    ]);
    expect(out).toMatch(/Points at: "(word ){20,}word…" \(`#long`\)/);
    expect(out).toContain('Points at: figure "A church gathering" (`#photo`)');
    expect(out).toContain('Points at: a <canvas> (`#globe`)');
    expect(out).toContain('3 open items');
    expect(out).toContain('## 3. Comment from C');
  });

  test('an arrow gives both ends; a mark with no note says so', () => {
    const out = brief([{ kind: 'arrow', author: 'Bo', from: at('#photo'), to: at('#title') }]);
    expect(out).toContain('## 1. Arrow from Bo');
    expect(out).toContain('the mark itself is the feedback');
    expect(out).toContain('- From: figure "A church gathering" (`#photo`)\n- To: "Multiplying disciples across the network" (`#title`)');
  });

  test('a drawing gives the words it highlights, and what its other strokes were drawn on', () => {
    const pos = o => ({ path: '#title', i: 0, o });
    const out = brief([{
      kind: 'drawing', author: 'Cy', text: 'Love this',
      strokes: [
        { ink: 'highlighter', at: at('#title'), text: { start: pos(0), end: pos(23) } },
        { ink: 'pen', at: at('#globe') },
        { ink: 'pen', at: at('#globe') },
      ],
    }]);
    expect(out).toContain('- Marks the words: "Multiplying disciples"');
    expect(out.match(/Drawn on: a <canvas> \(`#globe`\)/g)).toHaveLength(1);
  });

  test('a voice memo gives its title and length and says to listen in comment mode', () => {
    const out = brief([{ kind: 'voice', author: 'Di', text: 'Thoughts on the hero', at: at('#title'), audio: { mime: 'audio/webm', durationMs: 72_400 } }]);
    expect(out).toContain('## 1. Voice memo from Di (1:12)');
    expect(out).toContain('> Thoughts on the hero');
    expect(out).toContain('Listen to it in comment mode.');
    expect(out).not.toContain('the mark itself is the feedback');
  });

  test('a mark whose element is gone says it could not be located', () => {
    const out = brief([{ kind: 'comment', author: 'Ed', text: 'Fix', at: at('#gone > p:nth-of-type(2)') }]);
    expect(out).toContain("Points at: couldn't locate on the current page (was `#gone > p:nth-of-type(2)`)");
  });
});

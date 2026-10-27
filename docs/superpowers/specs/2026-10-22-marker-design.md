# Marker tool for comment mode — design

Date: 2026-10-22
Page: `hero.html`, in comment mode (see `2026-10-18-comment-mode-design.md` and the README's Comment mode section)
Builds on: `review/` (workspace, placing, marks layer, anchors) and `convex/` (the `marks` table and its rules)

## Intent

Comment mode lets overseers mark up the live site with comments, voice memos, arrows and highlight boxes. Nathan
wants to mark up the page the way you would a printout with a pen: circle a word, underline a button, loop two
layout choices and write "this one, not that one" beside them. Today's tools all feel like stickers placed on
the page (a pin, a straight arrow, a box). The marker should feel like ink. The line goes exactly where the hand
moved, with no frame, handles or chrome around it.

It's mainly for pointing at specific words, choices and layout decisions on the page.

## Goals

- A new **Marker** tool in the tool rail with two inks:
  - **Pen**: thin, solid red-orange line that tapers at the ends and thins when moving fast (option B in the
    mockups).
  - **Highlighter**: wide, see-through yellow line with flat ends, blending with the page so text under it stays
    readable (option C).
- **One drawing, one note.** A drawing can hold many strokes in either ink: two circles and an underline that
  together make one point. They post together as a single mark with one optional note.
- **Flow:**
  - Pick Marker and draw. Lifting the pointer after the first stroke opens the note composer (desktop: in the
    sidebar, the same as Arrow and Highlight today; phone: see below).
  - While the composer is open, the reviewer can keep drawing. Every new stroke joins the same drawing.
  - **Undo** removes the last stroke only.
  - **Post** sends all strokes and the note together as one card in Review activity. The note is optional and
    the drawing needs at least one stroke.
  - **Cancel** or **Esc** throws the whole drawing away.
- **Ink, not stickers.** A posted drawing is just its strokes on the page: no box, pin or handles. Clicking the
  ink selects its card. A selected drawing gets a soft glow along its line, not a frame.
- **Stays on target.** Each stroke stays on what it was drawn around or under. A circle stays on its word and an
  underline stays under its button when the window is a different width, or the column narrows in comment
  mode. Strokes keep their hand-drawn shape: they never stretch out of proportion. When the marked text is a
  different size for the viewer (much of the hero's type scales with the window), the stroke scales evenly with
  it, so a circle drawn around "Disciples" on a computer still fits "Disciples" on a phone. If that part of the
  page is gone, the card says **Moved**, like other marks.
- **The card** in Review activity shows a small sketch of the strokes beside the note, the author and the time,
  with the same select, delete and resolve behavior as other cards.
- **Live like everything else.** Everyone in comment mode sees a drawing appear when it's posted. Authors can
  delete their own drawings, and the owner can resolve or delete any drawing.
- **Replaces the box Highlight tool.** Highlight comes off the tool rail and the Marker takes its place. Box
  highlights that have already been posted keep showing on the page and in Review activity, unchanged.

## Phones and tablets

- **One finger draws, two fingers scroll.** With Marker active on a touch screen, a one-finger drag draws and a
  two-finger drag scrolls the page. That way a reviewer can circle something in the hero, scroll down, and
  underline something further down as part of the same drawing. If a second finger lands while a stroke is
  being drawn, that stroke is dropped and the gesture becomes a scroll. Pinch-zoom should keep working if the
  browser allows it alongside the two-finger scroll. Two-finger scroll is the requirement.
- **The page stays visible while drawing.** On phones (the ≤759px layout), the Review activity sheet stays
  closed while drawing. After the first stroke, a slim bar rises just above the tool bar with **Undo**,
  **Add note** and **Post** (plus the ink switch, below). Tapping **Add note** opens a small text box in that
  bar, above the keyboard, not the full sheet. If the reviewer hasn't given a name on this device yet, the name
  field appears there too when they post.
- **Thicker lines on phones** so a fingertip line still reads.
- **Apple Pencil and other styluses.** When a stylus is drawing (`pointerType === 'pen'`), the stylus draws and
  fingers scroll the page normally, like a notes app. Two-finger scrolling is only needed for finger drawing.
- **Wide screens (1280px and up) don't change:** the composer opens in the sidebar and the reviewer keeps
  drawing on the page beside it.
- **Tablets and narrower computer windows (760–1279px)** use the slim drawing bar too, not the sidebar. At
  these widths the sidebar slides over the page, and opening it while drawing would cover half an iPad. The
  sidebar stays closed while drawing, and the bar sits at the bottom of the screen.

## Non-goals

- Color choices. There's exactly one pen color and one highlighter color. (Thickness was a non-goal too; on
  2026-10-27 a size slider was added for Pen, Highlighter, Eraser and Arrow.)
- Editing a drawing after posting (delete and redraw, as with other marks). An eraser was a non-goal too; one was
  added on 2026-10-27 for the drawing not yet posted. It rubs out the ink it passes over, cutting strokes in two,
  and Undo brings a sweep back.
- Shape recognition (snapping a wobbly circle into a perfect ellipse).
- Seeing other people's strokes while they're still drawing. Others see a drawing only when it's posted.
- Drawing anywhere outside comment mode, or on pages other than `hero.html`.

## Anti-goals (failures even if it technically works)

- The drawing feeling like a placed object: a bounding box, resize handles, a pin or a frame around ink, at rest
  or when selected.
- Strokes drifting off the word or button they marked when the layout reflows. This is the whole point of
  circling something.
- Losing a multi-stroke drawing to one stray tap, Esc or tool switch without being asked first.
- On a phone, being stuck: unable to scroll while Marker is on, or the composer covering the page so the
  reviewer can't keep drawing.
- Laggy ink. The stroke must follow the pointer with no visible delay while drawing.
- Anything new loading or showing outside comment mode (same rule as the rest of comment mode).

## Decided in conversation

- One tool, **Marker**, with two inks: Pen (red-orange) and Highlighter (yellow). Nathan picked both mockup
  options B and C. The ink look is in the mockup at `.superpowers/brainstorm/23554-1792707127/content/ink-style.html`
  (pen `#D93A22` at about 2.6px with taper; highlighter `rgba(255, 205, 40, .5)` at about 16px, flat caps,
  multiply blend). Exact values can be tuned to match on the real page.
- Fixed colors, one per ink.
- Many strokes post as one mark with one optional note. The composer opens after the first stroke, and drawing
  continues while it's open.
- The Marker replaces the box Highlight tool. Existing box highlights still render.
- The phone flow described above: one finger draws, two fingers scroll, a slim bar instead of the sheet, and a
  stylus draws while fingers scroll.
- **When text wraps differently:**
  - **A highlighter stroke across text follows the words**, like selected text. If a highlighted phrase breaks
    onto two lines at another width, the highlight breaks with it, covering the same words on each line. It
    still looks like highlighter (yellow, see-through, slightly uneven), but it doesn't keep the exact wobble of
    the original stroke.
  - **Pen strokes keep the shape that was drawn** (scaled with the text, see Goals), anchored to the word or
    element they center on.
  - If what a pen stroke surrounded has split apart at the viewer's width (two things side by side on a
    computer that stack on a phone), the drawing still shows as drawn, and its card says **Drawn on a wider
    screen** (or **narrower**).

## My calls (Nathan to check)

1. **Mixing inks in one drawing** is allowed. Switch between Pen and Highlighter mid-drawing and it all posts
   together.
2. **The ink switch.** On desktop, selecting Marker shows a small Pen / Highlighter choice beside the Marker
   button in the rail. On phones, it's in the slim drawing bar, which appears as soon as Marker is picked (Undo,
   Add note and Post join it after the first stroke). The last ink used is remembered on the device. Pen is the
   default.
3. **Undo shortcut.** Cmd/Ctrl+Z removes the last stroke while drawing (when focus isn't in the note box).
4. **Asking before losing strokes.** Cancel, Esc, switching tools or leaving comment mode with strokes drawn
   asks first, the way an unsent voice memo does today. With no strokes, they just close.
5. **Sidebar counts.** The stats row becomes Comments, Voice memos, Arrows, Drawings. Old box highlights count
   under Drawings. Their cards keep the "Highlight" label, and new ones say "Drawing".
6. **Selecting.** Clicks land on the ink itself, with a forgiving invisible hit area around each stroke (as
   arrows have now), never on the empty space inside a circle. While the Marker tool is active, a press on
   existing ink starts a new stroke instead of selecting.
7. **Phone line widths** are about 1.5× desktop. Exact values are the builder's call.
8. **Stylus pressure.** Where the device reports pressure (Apple Pencil), the pen uses it for line width instead
   of speed.
9. **Limits** keep one drawing reasonable: at most 40 strokes and 6,000 points in all. Points closer than about
   1px are thinned out as they're drawn. The rail shows a short message if a limit is hit. The backend enforces
   the same limits. It also rejects coordinates that aren't finite numbers or fall far outside a sane range.
10. **Scaling with the text.** A stroke stores a size reference from when it was drawn (for example, the font
    size of the text it's anchored to, or the element's width when there's no text). It's drawn scaled evenly by
    the ratio to that reference now. Line widths stay the same and don't scale.
11. **The slim bar below 1280px**, not only on phones (see Phones and tablets).

## Constraints

- Same as comment mode: plain ES modules in `review/`, no framework, no bundler. Any library loads from a pinned
  exact version from a CDN, the way `convex` and `lenis` do today.
- Limits are shared between the Convex functions and the in-memory test store through `convex/limits.js`, as
  they are now.
- Convex document limits: arrays hold at most 8,192 items and a document can be at most 1 MiB. The stroke data
  shape has to fit comfortably inside both at the limits in call 9.
- The validator must keep accepting `highlight` marks, since they exist in the database.
- Keep the existing behaviors: Esc backs out one step, page links and buttons don't fire while placing,
  `[data-review-ui]` stays clickable, the glide in and out, reduced motion, owner and device rules.
- Touch behavior lives in the same place as now (`html[data-rv-tool=…] body { touch-action: … }` and the
  pointer handlers in `placing.js`).
- Tests follow the existing split: backend and helper tests in Vitest/convex-test (`npm test`), browser flows in
  Playwright with the fake store (`npm run test:e2e`). Update the README's Comment mode section.

## Left to the builder

- **Anchoring strokes to words.** This is the hard part, and the bar is the anti-goal above: a circle around
  "Disciples" still circles it at another width. Today's anchors (an element path plus fractions of its box)
  work when the marked thing is its own element. A word inside a paragraph moves *within* its element when text
  reflows, so fractions of the paragraph's box won't follow it. Suggested direction: anchor each stroke to a
  point in the text when one is under or near it (`document.caretPositionFromPoint` /
  `caretRangeFromPoint` → text node + character offset, resolved later with a `Range`). Otherwise fall back to
  the existing element anchor. Store the stroke's points as pixel offsets from that anchor point so the shape
  doesn't stretch. Choosing the anchor point per stroke: for a loop, the word inside it (around the stroke's
  center); for a flat, wide stroke like an underline, the text just above it. The builder settles the exact
  rule and confirms it on the hero headline, statement, buttons and a timeline paragraph at several widths.
  `VOLATILE` areas (typed headline slot, pins) still anchor to their stable parent.
- **Which highlighter strokes follow the words.** A highlighter stroke that runs mostly along a line of text
  becomes a text range, from the character under its start to the character under its end. It's drawn as one
  band per line box of that range (`Range.getClientRects()`), using the stroke's height and with a slight
  hand-drawn unevenness. A highlighter stroke that isn't along text (a loop, a scribble over an image or empty
  space) is kept as drawn, like a pen stroke. The builder sets the thresholds. The stroke's original points are
  stored either way, for the card sketch and as a fallback when the range can't be found.
- **Telling when a pen stroke has split apart** (for the "Drawn on a wider screen" note). For example, record
  which elements or text the stroke surrounded when it was drawn, and check whether they still fall inside its
  shape now. Any reasonable test that catches the side-by-side-to-stacked case is fine.
- **Data shape.** A new `kind: 'drawing'` with a list of strokes, each carrying its ink, its anchor, its size
  reference, its points, and a start and end text position for highlighter strokes that follow the words, plus the usual `text`, `author` and so on. Points might be a flat number array per stroke, rounded to
  0.5px. The schema and validator are extended to match.
- **Rendering.** For example, one SVG per drawing in the marks layer. The pen is drawn as a filled outline so
  it can taper (`perfect-freehand`, pinned, is a fair option, or hand-rolled). The highlighter is a single path
  per stroke with `mix-blend-mode: multiply`, so it doesn't darken where it crosses itself. The live in-progress
  stroke is drawn without waiting on layout or the store.
- **Two-finger scroll and stylus handling on iOS.** `touch-action` alone may not give one-finger-draw plus
  two-finger-scroll (or stylus-draws/finger-scrolls) in Safari. The builder may need to scroll the page by hand
  from a two-pointer gesture, and use `Touch.touchType === 'stylus'` to tell a Pencil from a finger. Verify on a
  real iPhone and iPad, or say clearly that it couldn't be.
- **The card's sketch** (strokes scaled to fit a small box) and the glow for a selected drawing.
- **The slim phone bar's** exact look, following the existing bottom tool bar.
- Order of work and tests.

## Success looks like

On a computer, an overseer opens comment mode, picks Marker and circles "Disciples" in the pen. The composer
opens in the sidebar. They switch to the highlighter, drag it across a line of the statement, circle **Learn
more** with the pen, type "these three should match", and post. One card appears with a little sketch of the
three strokes. Nathan, on another computer with a narrower window, sees the drawing arrive with each stroke
still on its word. On a phone, the statement wraps onto more lines and the highlight wraps with it, over the
same words.

On a phone, another overseer picks Marker, circles a stat with a finger, scrolls down with two fingers,
underlines a hub name, taps **Add note**, types a line and posts, without the sheet ever covering the page. On
an iPad, a third draws with an Apple Pencil while scrolling with a finger.

Nobody sees a box, pin or handle on any of it. Leaving comment mode leaves the page exactly as it was.

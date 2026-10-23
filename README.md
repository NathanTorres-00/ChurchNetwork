# Network Multiply

A self-contained, embeddable animation of multiplication: one soft gray dot divides into two, each new dot
divides again, out to the 5th generation (1 → 2 → 4 → 8 → 16 → 32, 63 dots in all). Thin bowed threads
connect every dot to its parent. Motion is calm and eased, with a slow idle drift once the dots settle.
When fully grown, the network rests, fades back to the first dot, and grows again in a slightly different
shape.

## Files
- **`network-multiply.html`**: the entire component (HTML + CSS + vanilla JS on a canvas, no build step, no
  dependencies except the Geist webfont).
- **`network-globe.html`**: the globe riff (see [Network Globe](#network-globe) below).
- **`network-globe-pins.html`**: the globe with photo pins on hover (see [Network Pins](#network-pins) below).
- **`hero.html`**: a sample landing page with the Pins globe as its hero (see [Hero](#hero-sample-webpage) below).

## Embedding in Wix
1. Wix Editor → **Add → Embed Code → Embed HTML**.
2. Choose **Code** (not "Website address").
3. Open `network-multiply.html`, tune it with the **Adjust** panel, then click **Copy settings**.
4. Paste the copied block over the `CONFIG` block at the top of the `<script>`, and set
   `SHOW_CONTROLS = false` just below it so visitors don't see the panel.
5. Paste the full file contents into the embed, then **Apply** and publish.

## Parameters
All of these are in the `CONFIG` block and the Adjust panel. Any of them can also be set in the address, e.g.
`network-multiply.html?generations=4&layout=tree&controls=0`.

| Group  | Parameter          | What it does |
|--------|--------------------|--------------|
| Growth | `generations`      | Rounds of division (1–7). 5 ends with 32 outer dots. |
|        | `divisionDuration` | Seconds for one division. |
|        | `restDuration`     | Stillness between generations. |
|        | `holdDuration`     | How long the full network rests before looping. |
|        | `loop`, `reseedEachLoop` | Repeat, and grow a new variation each time. |
|        | `seed`             | Which variation grows first (**New shape** picks a random one). |
| Shape  | `layout`           | `radial` (grows outward from the center) or `tree` (top-down). |
|        | `spread`           | How far apart each new pair sits; lower values keep pairs visibly together. |
|        | `branchLength`, `lengthDecay` | Thread length, and how it changes each generation. |
|        | `jitter`           | Organic variation in angle, length and timing. |
|        | `curvature`        | How much each thread bows. |
| Motion | `easing`           | `sine`, `cubic` or `quint`, all ease-in-out. |
|        | `follow`           | How close the view starts and how much it widens as the network grows (0 = fixed). |
|        | `drift`            | Slow breathing of settled dots. |
|        | `swell`            | How much a dot swells as it divides. |
| Look   | `dotSize`, `sizeDecay` | Dot size, and how it shrinks each generation. |
|        | `ring`, `ringGap`, `ringWidth` | The outer ring around each dot, sized relative to the dot. |
|        | `lineWidth`        | Thread width in screen pixels. |
|        | `dotColor`, `newbornColor`, `lineColor`, `bgColor` | Colors. New dots arrive in `newbornColor`, then settle. `bgColor` can be `transparent` (or use `?bg=transparent`). |

## Keyboard
- **Space** pauses or plays, **R** replays, **Esc** closes the panel.

## Deploying (Vercel)

The repo deploys to Vercel as a static site. `vercel.json` serves `hero.html` at the site's root and turns on
clean URLs (`/hero`, `/network-globe`, `/network-globe-pins`, `/network-multiply`; the `.html` addresses redirect
to them). Its build command, `npx convex deploy --cmd 'node scripts/build-static.js'`, pushes the comment mode
backend to Convex and then copies the pages, `review/` and `convex/limits.js` (the shared limits; nothing else from `convex/`) into `dist/`, which Vercel serves (see
[Comment mode](#comment-mode)).

---

# Network Globe

`network-globe.html` is a riff on the flat view. A camera flies low over a pale, rotating globe. As new
ground comes over the horizon, dots appear at sites around the world, and each one grows into its own network
with the same dividing animation. Networks that pass out of view regrow, in a new shape, the next time they come
around. The **Flat / Globe** switch at the top left moves between the two pages.

## How it's built
- Canvas 2D with d3's satellite projection (`d3.geoSatellite`), a perspective camera above the globe tilted
  toward the horizon. Loaded from CDNs: `d3@7.9.0`, `d3-geo-projection@4.0.0`, `topojson-client@3.1.0`, plus
  the land outline from `world-atlas@2.0.2/land-110m.json`. With no network connection to those, the page
  can't run; if only the land outline fails, it flies over the grid with networks placed everywhere.
- d3 clips the view only at the horizon, which would wrap ground behind the tilted camera onto the screen. The
  page clips to a cap shifted forward instead (`forwardCapClip`), reaching from the horizon ahead to just behind
  the camera.
- Each network uses the flat view's tree model, laid onto the sphere through a small azimuthal projection centered on its
  site. Threads lie on the ground; dots stand upright by default (round, shrinking with distance), or can
  lie flat so they flatten into ellipses toward the horizon.

## Embedding in Wix
Same as the flat view: tune it, **Copy settings**, paste over `CONFIG`, set `SHOW_CONTROLS = false`, then paste
the whole file into an Embed HTML block. Give the embed a generous height; the view is framed from the
viewport size.

## Parameters
| Group  | Parameter | What it does |
|--------|-----------|--------------|
| Flight | `speed` | Degrees of longitude per second (the globe turns beneath the camera). |
|        | `zoom` | Brings the camera closer to the ground while the framing stays put, so the horizon stays in view and networks get larger. |
|        | `tilt` | How far the camera looks toward the horizon (0–45°). |
|        | `latitude`, `meander` | The latitude the path centers on, and how far it wanders north and south. |
|        | `bank` | How much the view turns to follow the path's curves. |
| Globe  | `landOnly`, `siteSpacing` | Place networks on land only (off by default; pairs well with `showLand`), and how far apart (degrees). |
|        | `networkSize` | Radius of a fully grown network (degrees). |
|        | `showLand`, `showGraticule`, `haze` | Continent shapes (off by default), the 10° grid, and the white haze toward the horizon. |
|        | `horizonFade`, `fadeDepth` | Dissolve the globe's edge into the background along its curve (on by default), and how far the fade reaches. Off shows a thin horizon line. |
|        | `oceanColor`, `landColor`, `gridColor` | Globe colors. |
|        | `seed` | Which arrangement of sites to use. |
| Growth | `generations`, `divisionDuration`, `restDuration` | As in the flat view (1–6 generations here). |
|        | `revealLine` | How far below the horizon a site travels before its first dot appears. |
|        | `resetWhenPassed` | Networks that leave the view regrow on the next turn. |
| Look   | `uprightDots` | 100% (default) keeps dots round, shrinking only with distance; 0% lays them flat on the ground so they flatten into ellipses toward the horizon. Threads always lie on the ground. |
| Shape, Motion, Look | | Otherwise the same as the flat view. The network grays are a touch deeper so they read on the globe. |

## Notes
- With "reduce motion" turned on in the OS, the network is shown fully grown and still. **Replay** still plays it.
- The layout never crosses branches: each dot owns a wedge (radial) or span (tree), and its two children split
  it. Variation only moves a dot within its own share.

---

# Network Pins

`network-globe-pins.html` is a riff on the globe. Everything flies and grows the same way, and hovering any dot
raises a photo pin above it (the frame and pointer come from the reference pin artwork). Random pins also open
on their own across the view, at a rate you choose. The pin rides along with
its dot, the dot deepens in color, and the flight eases to a stop while the pin is open, then picks back up when
you move away. On touch screens, tap a dot to open its pin and tap empty ground to close it.

Photos are Unsplash placeholders listed in `PHOTOS` near the top of the script; each dot is assigned one by its
network and position. Swap the IDs (or change `photoUrl`) to use real photos.

| Parameter | What it does |
|-----------|--------------|
| `showPins` | Show photo pins (on hover and at random). |
| `pinSize` | Pin width in pixels (it shrinks to fit when a dot is near the top of the view). |
| `pauseOnHover` | "Pause the globe while a pin is open". On (default): the flight eases to a stop while a pin is open. Off: the globe keeps flying and the pin rides along with its dot until you move the pointer or the dot leaves the view. |
| `pinRate` | Random pins per minute (0 turns random pins off; hover still works). |
| `pinDuration` | Longest a random pin stays open. Each random pin looks ahead along the flight path and stays as long as its dot keeps the whole pin in view, up to this, and never less than 3 seconds, so it closes on its own before reaching an edge. |
| `maxPins` | Most random pins open at once. Random pins favor dots near the middle of the view, keep clear of other pins, never repeat a photo already showing, and don't open while the globe is paused for a hover. With a high rate, this cap and the need for a good spot can mean fewer pins than the rate asks for. |
| `pinColor` | Pin frame color. |

All the globe parameters apply as well.

---

# Hero (sample webpage)

`hero.html` is a sample church-network landing page with the Pins globe as its hero. Sections:

1. **Hero:** the flying globe with pins behind a left-aligned headline ("Multiplying Disciples / Leaders /
   Churches / Movements", each word in its own color), a one-line statement, and **Learn more** (scrolls to
   section 2) and **Visit** (links nowhere for now).
2. **What is a Church Network?:** rounded video box (placeholder image and play button; no video yet).
3. **How we got started:** a four-step timeline from one local church to a global movement. The milestone dots
   grow and step through the four headline colors.
4. **What we do:** image plus stats (5,000 disciples, 500 groups, 5 subnetworks).
5. **Testimony:** portrait and quote (placeholder name and words).
6. **Our disciple-making tool:** group photo beside an iPhone mockup of the Jesus Disciple App, with App Store
   and Google Play buttons (placeholders; swap in the official store badges before publishing).
7. **Find a hub:** full-width rows for Anaheim, Anaheim West, jChurch and Iglesia Mi Ciudad (details to come).
   **Hidden by default**, along with its header link: turn it on with **Show Find a hub** in the Adjust panel's Page
   group (`showHubs` in CONFIG, or `?showHubs=1`). Each row is one link. Hovering a row fills it with that hub's color (the Figma "Hub Row=Hover"), turns its text
   white, and ripples in a grid of white ring-dots beside the name, out from where the pointer came in (as many of
   the 12 columns as fit; none on narrow screens); the other rows dim. The cursor changes too, in one of three
   styles set by **Hub cursor** in the Adjust panel (`hubCursor` in CONFIG, or e.g. `?hubCursor=photo`):
   - **White circle** (`circle`, the default): a white circle with an arrow in the hub's color, with the hub's photo
     pin rising above it.
   - **Ringed circle** (`ring`): the circle in the hub's color, ringed in white, with the photo pin.
   - **Photo** (`photo`): the hub's photo itself follows the pointer in a tall rounded rectangle, with no circle or
     pin; moving straight to another hub fades its photo in over the last.

   Photos are placeholders, set per row with `data-photo`. Tabbing to a row fills it and raises its pin over the
   hub's dot. Touch screens keep the plain rows.

All copy, names, stats and photos are placeholders to replace. Links marked `data-placeholder` (Visit, store
buttons, directions) go nowhere until you add real URLs.

**Loading screen:** while the globe gets ready, one dot on a white screen divides five times (1, 2, 4, 8, 16, 32),
the same structure as the flat view; each of the four second-generation branches takes a headline color. Once the
network has fully grown (about 3.4 seconds), the map data is in and the globe has its first networks, the network
folds back up, outermost generation first, to its first dot, and the white opens outward from that dot in a
soft-edged ring to reveal the page as the headline starts typing. It never waits longer than 8 seconds. Networks in
view at load get a head start, so the globe already looks grown in when it opens. Visitors who prefer reduced
motion get a still network and a quick fade.

**Hero layouts:** the top of the Adjust panel switches the hero between layouts on the same page:
- **Headline: Stacked** (the four "Multiplying ..." lines), **Rotating** ("Multiplying" stays while the colored
  word changes letter by letter, each new word rising into focus as the old one lifts away), or **Typed** (the
  word is deleted and retyped with a cursor in the word's color).
- **Align: Left** or **Center** (works with all three). Stacked + Center is the centered version.
- The page opens on **Typed + Center** by default.
- **Headline size** sizes whichever layout is showing. Stacked keeps its own size and Rotating/Typed share the
  one-line size (`h1Size` and `soloSize` in CONFIG); switching layouts shows that layout's value.
- Rotating and Typed show four small dots in the word colors under the headline: the current word, and a way to
  jump to any word (hide them with the **Show word dots** switch). Their sliders: how long each word stays, and typing
  speed.
- `heroLayout` (`stacked`, `rotating`, `typed`) and `heroAlign` (`left`, `center`) are saved with Copy settings,
  and can be set in the address, e.g. `hero.html?heroLayout=typed&heroAlign=center`.

**Adjust panel:** the **Headline** group has a color picker for each of the four words (and for "Multiplying"),
plus headline size, colored-word weight, line spacing, statement size, text block width and position, the white
fade behind the text, hero height, and the bottom curve (how far the hero's lower edge dips into the next section
at the center; 0 makes it straight). The **Page** group has section spacing, corner radius, content width,
body text size, smooth scrolling, whether Find a hub shows, and the hub cursor style. Changing a word's color updates it everywhere it appears (headline, timeline, stats, icons).
The **Globe:** groups are the same controls as the Pins page.

In the hero, random pins keep clear of the actual text (each headline and statement line, and the buttons) and
gather in the open globe beside it. With left-aligned text, the flight centers in the open space beside the text
(**Flight center** slider). A random pin that's due waits for a good spot rather than being dropped, so the rate
holds as well as the view allows. The globe stops rendering while you're scrolled past the hero.

**Tuning the random pins:** the **Globe: pin areas** group has a **Show pin areas** switch that draws the rules
on the hero: the text keep-out boxes, the screen margin, the line a dot must be below for a full pin to fit above
it, the two favored areas (the middle, and below the statement), and every dot colored by what a random pin would
do there (green: can open; amber: would leave before the minimum time; red: would cover the text; gray: no room),
with live counts. Its sliders: text keep-out padding, screen margin, minimum pin time, middle area height and
size, and the below-statement area's strength and height. **Pins near the headline** picks how random pins treat the headline:
**Strict** (never cover any word the headline can show), **Current word** (stay clear of the word showing now; a pin
beside a shorter word closes before a longer one arrives), or **Behind headline** (pins may open behind the headline,
text on top; the default). The statement, buttons and header are always kept clear. With the default centered Typed headline, only
Behind headline leaves room for random pins; the four words are close in length, so Current word rarely frees space.

**Panel notes:** controls that only apply to some layouts say so next to their label (Stacked, Rotating and Typed,
Typed, Left-aligned text) and dim when they don't apply, so you can still set them ahead of time. Headline sizes
grow until the longest line would reach the window's edges; past that, the readout says so, e.g. "120px (fits at
115px)". Random pins also stay clear of the header's logo and links, and of the longest word Typed or Rotating can
show. On very busy globe settings, the farthest networks (in the horizon fade) are left out to keep it smooth.

**Smooth scrolling:** the page uses [Lenis](https://github.com/darkroomengineering/lenis) (`lenis@1.3.26` from
jsDelivr). The Page group has a **Smooth scrolling** switch and a **Scroll glide** slider. In-page links like
**Learn more** glide to their section. Lenis stays off for visitors who prefer reduced motion, and the Adjust panel
scrolls on its own.

---

# Comment mode

The hero page has a **Comment** button in its header, beside the nav. It turns the page into a review workspace
where overseers mark up the live page, and everyone in comment mode sees each other's marks appear as they're
posted. Outside comment mode none of it shows, and nothing for it loads until the button is clicked.

- **Four kinds of marks**, from the tools on the left:
  - **Comment**: click the page to pin a typed comment.
  - **Voice memo**: click the page, record from the mic (up to 3 minutes), listen back, then post. The card has a
    play button and the length.
  - **Arrow**: drag from where it starts to what it points at, with an optional note.
  - **Marker**: draw on the page with the **Pen** (circle a word, underline it) or the **Highlighter**. A drawing
    can have many strokes (up to 40, 6,000 points in all) and one optional note, and **Undo** (or Cmd/Ctrl+Z)
    takes back the last stroke. A highlighter stroke along text follows the words, and a drawing made on a
    different screen width is badged **Drawn on a wider screen** or **narrower screen**.
- Every mark appears on the page and as a card in the **Review activity** sidebar, with counts of what's open.
  Clicking a card scrolls to its mark. Marks are tied to the element they were made on, so they stay on target at
  any window width; if that part of the page is removed, the card says **Moved**.
- Reviewers type their name once per device. They can delete their own marks.
- **Share review** copies a link that opens straight into comment mode (`/?comment`).
- **Esc** backs out one step: cancels a stroke being drawn, closes the composer, then the tool, then comment
  mode. Leaving with something unsent asks first. While a drawing is posting, new strokes are turned away with a
  short message.
- On phones the tools sit in a bar along the bottom and Review activity slides up as a sheet. With the Marker on,
  one finger draws and two fingers scroll (pinch-zoom is off). Below 1280px a slim drawing bar replaces the
  sidebar, and picking Marker closes the sheet. On an iPad in Safari the Pencil draws while one finger scrolls;
  in other browsers a pen draws every stroke, fingers don't draw, and two fingers scroll.

**Owner link:** opening the site once with `?owner=<key>` remembers the owner key on that device (and removes it
from the address bar). The owner can **Resolve** marks (hidden unless **Show resolved** is on) and delete any mark.
The key is stored in Convex as the `OWNER_KEY` environment variable on both deployments; change it there with
`npx convex env set OWNER_KEY <new key>` (add `--prod` for production).

**How it's built:** `review/` holds the browser side as plain ES modules (no bundler): `comment-mode.js` opens
and closes the workspace, `workspace.js` is the toolbar, tools and sidebar, `marks-layer.js` draws the marks,
`placing.js` turns clicks and drags into marks, `anchor.js` ties them to elements, `marker.js` turns pointer
input into strokes, `ink.js` smooths them and builds the pen's tapered outline, `stroke-anchor.js` ties a stroke
to its word or element, `voice.js` and `recorder.js`
record and play memos, and `store.js` talks to [Convex](https://convex.dev) through its browser bundle
(`convex@1.47.0` from unpkg). `convex/` is the backend: one `marks` table, file storage for the audio, and the
rules (length limits, drawing limits in `convex/limits.js`, 10 marks per device and 60 overall per minute, voice memos must be audio files of at most
10 MB, owner-only resolve). Device IDs never leave the backend, so only the device that made a mark (or the owner)
can delete it. `convex/crons.js` deletes uploaded recordings that were never posted, once an hour. Convex was set up through the Vercel
Marketplace, so its deploy keys live in the Vercel project.

**Working on it locally:**
- `npm install`, then `npx convex dev` to sync the functions to your development deployment (it also writes
  `.env.local`).
- `npm run dev:config` writes `review/config.js` pointing at that deployment; serve the folder (for example
  `python3 -m http.server`) and open `hero.html`.
- `npm test` runs the backend and helper tests (Vitest, convex-test); `npm run test:e2e` runs the browser tests
  (Playwright, with an in-memory store instead of Convex). Run `npx playwright install chromium` once first.

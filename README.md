# The Rock Network

The Rock Network's website: **Home** (`/`) and **Groups** (`/groups`), built with [Astro](https://astro.build) and
[Lumos for Astro](https://lumosframework.com) 1.0.4, so the pages can be designed in **Stacki** and their content
edited without touching markup. The animated globe demos that are pasted into Wix live alongside it, unchanged.

## Running it

Node 22.23.4 or newer.

```sh
npm install
npm run dev        # http://localhost:4321, reloads as you edit
npm run build      # the static site, into dist/
npm run preview    # serve dist/ (add --ignore-lock when an AI agent runs it, or it starts in the background)
npm run check      # Astro's type and template checks
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright; builds the site and serves it on port 4321)
```

To design visually, open this folder in **Stacki**. `LUMOS.md` explains how pages are put together (sections
from Lumos components; a custom component only when it owns CSS or a script).

## Where things live

| What | Where |
|---|---|
| Pages | `src/pages/index.astro` (Home), `src/pages/groups.astro`, `src/pages/[leadership].astro`, `src/pages/embed/globe.astro`, `src/pages/404.astro` |
| Page sections | `src/components/section/` (sections with their own CSS or script), `src/components/content/` (smaller blocks) |
| Header, footer | `src/components/global/SiteHeader.astro`, `SiteFooter.astro` |
| Loading screen, Adjust panels, hub cursor | `src/components/utility/` |
| Look (colors, type, spacing) | `src/styles/base.css`: Lumos's token names with the site's values |
| Page scripts (globe, panels, carousels…) | `public/scripts/`: the old pages' scripts, one file per original `<script>`, unchanged in behavior |
| Images used from markup | `src/assets/images/` (Astro optimizes them); files scripts load by path are in `public/assets/` |
| The Wix demos | `public/network-*.html` and `public/assets/network-gallery.js`, byte for byte as before |

## Content

Everything an admin will edit is in `src/content/` as JSON, with its shape declared in `src/content.config.ts`
(Stacki's CMS panel can edit these; a later project moves them to Sanity with the same shapes):

- **This week's Network Video:** Cloudflare reads the most recently published video from the YouTube playlist
  for the Videos hero and Groups player. The Worker caches the result for 15 minutes.
  `src/content/weekly-video.json` provides the video for Astro preview and when the feed is unavailable.
- **Leaders:** one file per person in `src/content/leaders/` (`name` and a `photo` from
  `src/assets/images/leaders/`). Pages list them by file name: the four on Groups in `groups.json`
  (`team.people`), and the Leadership page's two lists in `pages/leadership.json`. Someone can be in both lists.
- **Group stories:** `src/content/group-stories/` (the quote on Groups, Anastasia's on Home).
- **Page copy:** `src/content/pages/home.json` and `groups.json`, one object per section.
- **Footer:** `src/content/footer.json`.

The hubs and the Jesus Disciple video rows are still in code (`src/pages/index.astro` and
`src/components/section/JesusDisciple.astro`).

## Leadership

`/leadership` shows the network's leaders on two orbits and in lists; Groups shows the Rock Groups Leadership Team
(leaders and their roles in `groups.json`). It's on everywhere, the live site included. To hide it on the live
site again, change `showLeadership()` in `src/utils/leadership.ts` as its comment says.

## Adjust panels

Public builds omit the **Adjust** button and panel. They are available on Home, Groups, and the globe in local
development, or in a local preview built with `ADJUST_CONTROLS=1 npm run build`. In those builds, `?controls=0`
hides them. Existing address settings (`/?heroArt=gallery`, `/groups?heroArt=globe`) still work.
**Copy settings** gives a block to paste over the `CONFIG` at the top of `public/scripts/home-main.js` or
`public/scripts/groups-config.js`. Footer and page-transition choices are shared by both pages.

`/embed/globe` is Home's globe on its own (no loading screen, header, copy or footer); the Groups hero's Pins
globe and the footer's globe show it in a frame. It isn't indexed by search engines.

## Old addresses

`vercel.json` keeps clean URLs on and sends `/hero` to `/`, so old links still land: `/hero.html`, `/hero`,
`/hero.html#app` → Home (and its section), `/groups.html` → `/groups`, `/network-*.html` → unchanged.

## Deploying (Vercel)

Vercel detects Astro and runs `astro build`; there is no build command in `vercel.json` any more. The production
address is `https://therocknetwork.com` (`SITE_URL` in `src/consts.ts`).

## Comment mode and the Versions panel

They didn't move to Astro. Their code (and Convex's) is at tag `pre-astro`:
`git checkout pre-astro -- review convex versions scripts` brings it back.

---

# Network Multiply (Wix demo)

A self-contained, embeddable animation of multiplication: one soft gray dot divides into two, each new dot
divides again, out to the 5th generation (1 → 2 → 4 → 8 → 16 → 32, 63 dots in all). Thin bowed threads
connect every dot to its parent. Motion is calm and eased, with a slow idle drift once the dots settle.
When fully grown, the network rests, fades back to the first dot, and grows again in a slightly different
shape.

## Embedding in Wix
1. Wix Editor → **Add → Embed Code → Embed HTML**.
2. Choose **Code** (not "Website address").
3. Open `public/network-multiply.html`, tune it with the **Adjust** panel, then click **Copy settings**.
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

---

# Network Globe

`public/network-globe.html` is a riff on the flat view. A camera flies low over a pale, rotating globe. As new
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

`public/network-globe-pins.html` is a riff on the globe. Everything flies and grows the same way, and hovering any dot
raises a photo pin above it (the frame and pointer come from the reference pin artwork). Random pins also open
on their own across the view, at a rate you choose. The pin rides along with
its dot, the dot deepens in color, and the flight eases to a stop while the pin is open, then picks back up when
you move away. On touch screens, tap a dot to open its pin and tap empty ground to close it.

The pins use photos of house groups, youth groups, and larger church gatherings. The Pins and Gallery pages
share the list in `public/assets/network-globe-photos.js` and the WebP crops in `public/assets/network-photos/globe/`.
Each dot is assigned a photo by its network and position.

| Parameter | What it does |
|-----------|--------------|
| `showPins` | Show photo pins (on hover and at random). |
| `pinSize` | Pin width in pixels (it shrinks to fit when a dot is near the top of the view). |
| `pauseOnHover` | "Pause the globe while a pin is open". On (default): the flight eases to a stop while a pin is open. Off: the globe keeps flying and the pin rides along with its dot until you move the pointer or the dot leaves the view. |
| `pinRate` | Random pins per minute (0 turns random pins off; hover still works). |
| `pinDuration` | Longest a random pin stays open. Each random pin looks ahead along the flight path and stays as long as its dot keeps the whole pin in view, up to this, and never less than 3 seconds, so it closes on its own before reaching an edge. |
| `maxPins` | Most random pins open at once. Random pins favor dots near the middle of the view, keep clear of other pins, never repeat a photo already showing, and don't open while the globe is paused for a hover. With a high rate, this cap and the need for a good spot can mean fewer pins than the rate asks for. |
| `pinColor` | Pin frame color. |

**Sending** (the Adjust panel's Sending group): once a network reaches its last generation, it sends 2 or 3 of
its outer dots far outward, three times the length of an outer thread by default. Each one buds from its outer
dot in the new-dot color and travels straight out from the network's center with a long thread behind it,
swelling as it goes. Where it lands it becomes the first dot of a new network the same size as the one that sent it.
The thread stays connected, and the new network grows, then sends out dots of its own. The networks already placed on
the globe stay; a new network only lands where no other network is growing, takes over the fixed spots around
it, and is removed after it passes out of view (up to 80 at once). Sent networks have photo pins like any other.

| Parameter | What it does |
|-----------|--------------|
| `sendOut` | Grown networks send out new ones (on by default; `?sendOut=0` turns it off). |
| `sendCount` | Most dots a grown network sends out; it sends this many or one fewer, where there's room. |
| `sendDistance` | How far a sent dot travels, in outer-thread lengths (3 by default). |
| `sendDuration` | Seconds a sent dot takes to land. |

**Background** (the Adjust panel's Background group): a breathing dot field behind the globe that sets it apart from
the page. The dots swell and fade in slow waves rippling out from the horizon, and drift more slowly than the ground
as the camera flies, so the globe reads as sitting in front of them. The horizon fade clears them softly around the
globe's edge. It holds still when paused or with "reduce motion" on.

| Parameter | What it does |
|-----------|--------------|
| `backdrop` | Show the dot field (on by default; `?backdrop=0` turns it off). |
| `backdropSpacing`, `backdropDotSize` | Pixels between dots, and dot radius. |
| `backdropBreath` | How strongly the dots swell and fade (0 = still). |
| `backdropDepth` | How much the field drifts with the flight (parallax; 0 = fixed). |
| `backdropColor` | Dot color. |

All the globe parameters apply as well.

# Network Gallery

`public/network-gallery.html` turns the globe into a gallery. The camera sits so close that the rim and horizon stay out
of view: what you see is one section of a slowly turning globe, with networks of pale dots forming as new ground
turns into view (or, with **Lines** set to Grid, a hand-drawn grid with dots at its crossings). New dots keep
turning into view, which is what carries the sense of how big the network is.

- **Automatic openings.** Every few seconds (`autoEvery`, with `autoJitter` randomness) a dot somewhere in view
  swells open (`autoSize`) to show a photo, stays open for `openFor` seconds, then closes. Openings are staggered,
  never overlap one another, and only pick dots with room to open fully on screen (`edgeRoom`). With the
  defaults, 4–5 dots open in the first ten seconds.
- **Hover.** A hovered dot opens larger (`hoverSize`) and stays open as long as the cursor is on it. New automatic
  openings pause meanwhile (`pauseAutoOnHover`), and the globe eases to a stop so the dot stays under the cursor
  (`slowOnHover`). On touch screens a tap opens a dot for a few seconds.
- **Photos.** The Gallery uses the same network photos as the Pins globe and frames them in circles.
- **Built with** Canvas 2D and d3's satellite projection (`d3.geoSatellite`), so the grid bends with real
  perspective. The **Adjust** panel works like the other pages: Camera (spin, zoom, camera distance, tilt), Globe
  position (move sideways or up and down, latitude, roll, starting longitude), Grid, Dots and Openings. **Copy
  settings** gives you a CONFIG block to paste into the file, any setting can go in the address
  (`?spin=5&zoom=1.4`), and `?controls=0` hides the panel. **Shuffle dots** reseeds which crossings carry a dot.
- **Dot layout** (`layout`): `random` puts dots on a random share of the grid crossings (`dotShare`);
  `checker` puts one on every other crossing, like a checkerboard.
- **Networks** (`connect: 'networks'`, the default; in the panel's **Network** group). Instead of the plain grid, dots are
  joined parent to child, generation by generation, on the checkerboard. A network starts at one dot; each dot
  takes up to two children on the diagonal crossings further out, for `generations` rounds (default 5). Then up to
  `sendCount` last-generation dots each skip one spacing and start a new network there (that line is dashed by
  default, `sentStyle`), which grows and sends in turn. The plain grid stays faintly behind (`gridStrength`). Network lines have their own width,
  `netLineWidth`, separate from the grid's `lineWidth`.
  - `growth`: `grown` shows every network complete; `growing` grows each one as it turns into view: lines draw out
    a generation at a time (`genTime`, `genPause`), dots pop in as their line arrives, and a sent-out line has to
    land before the new network starts. Networks that leave the view reset and grow again next time round.
  - `growStart` (growing only) sets where growth happens, relative to a reveal line `revealLine` (a share of the
    view in from the edge the ground comes in at, worked out from the spin and roll): `wave` pops each dot in as it
    crosses the line and draws a line once both its dots are in; `inview` waits until a network's first dot
    crosses the line (or its dots reach the middle), then grows it generation by generation; `edge` starts a
    network as soon as any of its dots reaches the edge. Dots and networks that leave clear themselves out of sight.
  - `lineStyle`: `arc` (bow set by `arch`), `straight`, `s` (S-curve) or `grid` (traces the grid through the empty
    crossing between two diagonal dots). Sent-out lines have their own bow, `sentArch`.
  - Photo openings and hover work the same in both modes, on dots that have fully grown in.
- **Shared engine.** The drawing and motion live in `public/assets/network-gallery.js` (an ES module), which the hero also
  uses for its Gallery art. The page keeps its own CONFIG, panel and keys; the panel's controls come from the
  module's `GALLERY_CONTROLS`.

---

# Home page reference

Home (`/`) is a sample church-network landing page with the Pins globe as its hero (the Gallery globe is one click away). Sections:

1. **Hero:** the flying globe with pins behind the title "A New Testament Church Network", a headline
   ("Multiplying Disciples / Leaders / Churches / Movements", each word in its own color), and **Learn more**
   (scrolls to section 2) and **Start a group** (opens Groups (`/groups`)). The one-line statement under them is hidden for
   now (one CSS line in Home (`/`) brings it back).

   **Art: Pins globe or Gallery.** The Adjust panel's **Hero layout** section has an **Art** row: **Pins globe** (the
   default, `heroArt: 'pins'`), or **Gallery** (`heroArt: 'gallery'`, or `?heroArt=gallery`), the close-up
   gallery globe from the Gallery tab. Only the chosen art runs; the panel shows its settings ("Globe: …" or "Gallery: …"),
   and **Pause globe** / **Restart globe** act on it. The Gallery's engine loads only when it's chosen, so the
   Pins hero loads exactly as before. Its settings are the Gallery tab's, prefixed `gallery` (`gallerySpin`,
   `galleryZoom`, …), calmer by default (at most 2 photos open, one every 3.5 s, growth starting **In view**, the globe keeps turning on hover), and
   **Copy settings** includes them. In Gallery mode:
   - **Quiet centre.** An ellipse round the copy (sized to the widest headline word, plus `galleryQuietPadX` /
     `galleryQuietPadY`) where dots shrink to specks (`galleryQuietDotScale`) and network lines fade out
     (`galleryQuietLineAlpha`), easing back to full across a soft edge just outside it (`galleryQuietSoftness`). It replaces the white fade. No photo
     opens in it, or drifts into it, and hovering or tapping the copy never opens one. **Show quiet centre
     outline** (`galleryShowQuiet`) draws it while tuning.
   - **Photos around the heading** (`galleryHalo`): automatic photos open in a ring `galleryHaloWidth` px wide just
     outside the quiet centre, below the header and above the hero's straight bottom edge (so the curve never
     clips one). Because the ground travels right to left, most open on the left and drift away from the copy.
   - **Lines take the headline colour** (`galleryWordColor`): a network line that's drawing out takes the colour of
     the word in the headline, then eases back to the line colour over `galleryColorSettle` seconds. It shows only
     while networks are growing. The headline announces each word with a `heroword` event on `document`
     (`{ index, color, phase: 'typing' | 'shown' | 'deleting' }`).
   - **First photo** waits until the first word has been typed (or rotated in); with Stacked it opens 2 s after the
     page opens.
   - **Phones** (≤ 640 px): photos open only above and below the copy, or not at all
     (`galleryPhoneOpenings: 'off'`). A touch that moves is a scroll, not a tap.
   - **Reduced motion:** a still view; hovering still opens dots.
2. **What is a New Testament Church Network?:** rounded video box with the **Welcome to the Rock Network** video (`public/assets/welcome-to-the-rock-network.mp4`, an H.264 copy of the original, about 15 MB). Its poster is the "What is a New Testament Church Network?" thumbnail (`public/assets/what-is-a-new-testament-church-network.jpg`), shown undimmed, with a dark play button under the poster's title on its left edge so it doesn't cover the words. Nothing downloads until the play button is pressed; then it plays with the browser's controls, and pauses when scrolled out of view.
3. **What we do:** image, the line "We are a four-stage ministry", and stats (7,088 Disciples joined, 1,559 Groups started, 25 Missions workers, 3 Four-Stage Subnetworks) that count up from 0 as they scroll into view (once; straight to the numbers with reduced motion).
4. **How we do it:** four rows, **A Clear Process**, **Effective Tools**, **Available Training** and **On-going Coaching** (links are
   placeholders), built and behaving exactly like the Find a hub rows: the same hover fill, ring-dots and cursor.
5. **Testimony:** Anastasia, group leader in Anaheim: her portrait (`public/assets/anastasia.jpg`) and quote.
6. **Jesus Disciple – A Four-Stage Ministry tool** (`#app`): headed by the Jesus Disciple wordmark
   (`public/assets/jesus-disciple-logo.png`) with "A Four-Stage Ministry tool" under it; three rows of tall video cards, **Vision Videos**,
   **How to use Jesus Disciple** and **Jesus Disciple Stories**. Each row is a sideways carousel that starts at the
   text's left edge and runs off the right of the window: trackpad, swipe, mouse drag, the arrow buttons beside the
   row title (hidden on touch screens, greyed at a row's ends), or Tab. Each card is a thumbnail with a play button
   linking to its video, in the posters' 7:10 shape so their titles aren't cropped (the play button sits in the
   bottom corner, off the titles). Vision Videos and How to use Jesus Disciple use the English video posters
   (`public/assets/videos/`, web-sized copies of the `Vision & How-To English` folder): Multiplication Matters, Think Small,
   New Testament Networks, Prayer and Persons of Peace, Healing and Miracles and It's Your Turn; then What is it?,
   Why use it? and How it works. Jesus Disciple Stories has five videos, with posters drawn from the stories. All three
   series come from `src/content/pages/videos.json`, appear on Home and `/videos`, and play in the shared Vimeo dialog.
   Under the rows, separate from the videos, a **Jesus Disciple University** banner: a wide photo
   (`public/assets/jdu-banner.jpg`, 1200px copy `jdu-banner-1200.jpg`) with the title, a short description of JDU and **Learn more** (links to
   https://www.jesusdisciple.com/jdu) on its navy wall. On phones the text sits above the photo so it doesn't cover the speaker.
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
8. **How we got started** (the last section before the footer): a four-step timeline from one local church to a global movement. The milestone dots
   grow and step through the four headline colors.

All copy, names, stats and photos are placeholders to replace. Links marked `data-placeholder` (Start a group, store
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
- **Title: Church Network** ("A New Testament Church Network" is the H1, with the headline under it at
  section-heading size) or **Multiplying** (flipped: the headline is the H1 at full size, with "A New Testament
  Church Network" under it as an H2 at section-heading size). Works with all three headlines and both alignments;
  **Title size** sets the Church Network H1 (`titleSize` in CONFIG), and **Headline size** the Multiplying one.
- **Align: Left** or **Center** (works with all three). Stacked + Center is the centered version.
- The page opens on **Church Network + Typed + Center** by default.
- **Headline size** sizes whichever layout is showing. Stacked keeps its own size and Rotating/Typed share the
  one-line size (`h1Size` and `soloSize` in CONFIG); switching layouts shows that layout's value.
- Rotating and Typed show four small dots in the word colors under the headline: the current word, and a way to
  jump to any word (hide them with the **Show word dots** switch). Their sliders: how long each word stays, and typing
  speed.
- `heroLayout` (`stacked`, `rotating`, `typed`), `heroTitle` (`multiplying`, `network`) and `heroAlign` (`left`,
  `center`) are saved with Copy settings, and can be set in the address, e.g.
  `/?heroLayout=typed&heroTitle=network&heroAlign=center`.

**Adjust panel:** the **Headline** group has a color picker for each of the four words (and for "Multiplying"),
plus headline size, colored-word weight, line spacing, title size, text block width and position, the white
fade behind the text, hero height, and the bottom curve (how far the hero's lower edge dips into the next section
at the center; 0 makes it straight). The **Page** group has section spacing, corner radius, content width,
body text size, smooth scrolling, whether Find a hub shows, and the hub cursor style. Changing a word's color updates it everywhere it appears (headline, timeline, stats, icons).
The **Globe:** groups are the same controls as the Pins page, plus the generation colors below.

**Generation colors:** in the hero, each generation of a network takes the next headline color, so the dots read
as the headline: the first dot is Movements, its first generation are Disciples, then Leaders, Churches and
Movements, and the fifth generation loops back to Disciples (movements make disciples, and the cycle continues). A
new dot buds out in its parent's color and settles into its own. **Globe: dots** in the Adjust panel has the options:
**Dot colors** (a headline color per generation, or one color, the gray look), **First dot** (Movements, Disciples,
which starts the cycle there, or the gray dot color), **Color strength** (toward the dot color at lower values) and
**Color the threads** (each thread in the color of the dot it leads to; off by default). In CONFIG: `dotColors`
(`generations` or `single`), `firstDotColor` (`movements`, `disciples`, `gray`), `colorStrength` and `colorThreads`.
The colors follow the Headline group's color pickers.

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
Typed, Left-aligned text, One color, Headline colors) and dim when they don't apply, so you can still set them ahead of time. Headline sizes
grow until the longest line would reach the window's edges; past that, the readout says so, e.g. "120px (fits at
115px)". Random pins also stay clear of the header's logo and links, and of the longest word Typed or Rotating can
show. On very busy globe settings, the farthest networks (in the horizon fade) are left out to keep it smooth.

**Smooth scrolling:** the page uses [Lenis](https://github.com/darkroomengineering/lenis) (`lenis@1.3.26` from
jsDelivr). The Page group has a **Smooth scrolling** switch and a **Scroll glide** slider. In-page links like
**Learn more** glide to their section. Lenis stays off for visitors who prefer reduced motion, and the Adjust panel
scrolls on its own.

---

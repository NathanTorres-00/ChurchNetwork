# Gallery in the hero — design

Date: 2026-11-12
Branch: `figmaJam`
Pages: `hero.html` (the site root), `network-gallery.html` (the Gallery tab)
Builds on: the Gallery tab (networks of dots on a close-up globe, photos opening inside dots) and the hero's
centred headline, word colours, curved bottom edge and Adjust panel

## Intent

The Gallery tab shows how big the network is: networks keep forming as new ground turns into view, and dots open
into photos of the places in it. Nathan wants to try it as the hero's art, behind the centred heading
("A New Testament Church Network" / "Multiplying ___") and the two buttons.

A hero has a different job from the Gallery tab. The heading and the **Learn more** button must stay readable and
be the first thing the eye settles on. So the gallery has to make room for the copy instead of running underneath
it, and its motion has to support the headline instead of competing with it.

It is an **option**, not a replacement: the hero can switch between the current Pins globe and the Gallery, so
the two can be compared live with overseers.

## Goals

1. **A hero art switch.** In the hero's Adjust panel, the **Hero layout** section gets a new row, **Art**, with a
   two-way segmented control: **Pins globe** | **Gallery**, styled like the Headline / Title / Align rows.
   - Config key `heroArt: 'pins' | 'gallery'`, also settable in the address (`?heroArt=gallery`).
   - Only the chosen art runs. The other engine stops its frame loop entirely and its layers are hidden.
   - The panel shows the groups for the chosen art only: the existing "Globe: …" groups for Pins, new
     "Gallery: …" groups for the Gallery. The Headline and Page groups always show.
   - Switching is live: no reload; the headline keeps running.
   - **Copy settings** includes the gallery's keys, and pasting them back into CONFIG restores the look.

2. **Quiet centre.** An ellipse around the copy block where the gallery recedes, replacing the white scrim in
   Gallery mode (the scrim stays as is for Pins).
   - Sized from the measured `.hero-copy` box plus padding (`galleryQuietPadX`, `galleryQuietPadY`, px), centred
     on it. Re-measured on resize, on hero layout/title/align changes, and when the typed word changes width.
     For the typed headline, size to the widest word so the ellipse doesn't breathe with every letter.
   - Inside the ellipse, dots shrink toward `galleryQuietDotScale` (default 0.15 of their size) and network lines
     fade toward `galleryQuietLineAlpha` (default 0). A soft edge band (`galleryQuietSoftness`, share of the
     ellipse radius, default 0.35) blends from full to quiet, so it reads as open space, not a hole or a grey
     veil.
   - **Nothing opens inside it.** No automatic opening may pick a dot whose opened circle would overlap the
     ellipse. Hovering inside the ellipse, or over any part of `.hero-copy`, never opens a dot.
   - A **Show quiet centre outline** check (default off) draws the ellipse as a thin outline while tuning.

3. **Photos open around the heading.** With **Photos open around the heading** on (`galleryHalo`, default on),
   automatic openings only pick dots whose opened circle sits in a ring just outside the quiet centre, within
   `galleryHaloWidth` px of the ellipse (default 260). Off: anywhere outside the quiet centre with room.
   The existing rules still apply: room from the edges, no overlap between photos, most open at once.

4. **Line colour follows the headline.** With **Lines take the headline colour** on (`galleryWordColor`,
   default on), a network line that is drawing out takes the colour of the word currently in the headline
   (Disciples green, Leaders gold, Churches blue, Movements rose, read from the page's CSS variables so the
   Headline colour pickers drive it). When a line finishes, it eases back to the normal line colour over
   `galleryColorSettle` seconds (default 2.5).
   - The headline script announces word changes with a `CustomEvent` (`'heroword'`, detail
     `{ index, color, phase }` where phase is `'typing' | 'shown' | 'deleting'`) dispatched on `document`. The
     gallery listens; nothing else in the headline changes.
   - Only matters while lines are drawing (Growing). In Fully grown nothing is drawing, so nothing is coloured.
     That's expected, not a bug.
   - Dots stay their pale colour. The colour appears in exactly one place: lines being drawn.

5. **Calmer pacing in the hero.** Hero defaults: most open at once 2, time between openings 3.5 s. The **first**
   automatic opening waits until the first headline word has finished typing (the first `'shown'` event), with a
   2 s fallback if the event never comes (e.g. Stacked layout).

6. **The curve counts as an edge.** Automatic openings treat the hero's straight bottom edge (where the curve
   begins, `--hero-view`) as the bottom of the view, so no photo opens where the curve would clip it.

7. **Loading and battery.**
   - Gallery photos start loading only once Gallery is the chosen art **and** the first frame has painted
     (and after the headline font is ready), so they never compete with the heading's first paint.
   - The gallery's frame loop rests while the hero is scrolled out of view (the page already tracks this with an
     IntersectionObserver for the Pins globe; reuse the same flag) and while the tab is hidden.

8. **Phones (≤ 640 px wide).** The copy fills most of a phone's hero.
   - `galleryPhoneOpenings: 'around' | 'off'` (default `'around'`): `'around'` allows automatic openings only
     above or below the quiet centre; `'off'` disables automatic openings on phones. Networks still grow either
     way.
   - Tap-to-open must not fight scrolling: a tap that moves more than ~8 px is a scroll, not a tap.

9. **Reduced motion.** As on the Gallery tab: a still view, networks fully grown, no automatic openings; hover
   and tap still open dots. No colour sync (nothing is drawing).

## Hero defaults for the Gallery

Start from Nathan's dialled-in Gallery tab settings (the Gallery tab's current CONFIG), then:

| Setting | Hero default | Why |
|---|---|---|
| `galleryMaxOpen` | 2 | calmer than the tab |
| `galleryAutoEvery` | 3.5 s | calmer than the tab |
| `galleryGrowStart` | `'inview'`, reveal line 5% | Wave leaves the incoming side blank, which unbalances a centred composition; In view with a small line fills both sides evenly. Wave and At the edge stay selectable. |
| `gallerySlowOnHover` | true | only triggers on an actual dot, never on the copy |
| `heroArt` | `'pins'` | the live hero doesn't change until Nathan picks Gallery |

## Non-goals

- No change to the headline, buttons, copy, fonts or colours, apart from the `'heroword'` event.
- No change to what the Gallery tab does or how it looks.
- No real church/campus photos yet; the Unsplash landscapes stay as placeholders.
- No new hero layout (the copy stays where the hero's existing Text position / Align settings put it).

## Anti-goals (a failure even if it "works")

- A photo ever opening behind or under the heading or buttons.
- A grey veil over the dots (the old scrim showing through in Gallery mode).
- The heading's first paint getting slower because of the gallery.
- Motion everywhere: several photos popping at once beside a typing headline.
- The two engines running at the same time.

## Constraints

- Static site, no build step for pages: HTML + vanilla JS, d3 from the CDN as now.
- `hero.html` already inlines the Pins engine, comment mode, the Versions panel and the headline scripts; the
  existing e2e tests (comment mode, marker, versions, hubs) must keep passing with `heroArt: 'pins'`.
- The Adjust panel's look, motion and Copy settings / Reset behaviour stay as they are.
- Pushing to `main` later needs a `Version:` line for the Versions panel (see `versions.json`).

## Decided (by Nathan, in conversation)

- The quiet-centre direction: a calm space around the copy, photos opening around the heading, line colour
  following the headline, calmer pacing, and the fixes above (hover through the copy, curve, loading, pausing
  offscreen, phones).
- It's an option, switchable against the current Pins globe.

## Calls made here (Nathan can overrule)

- **Shared engine.** The gallery engine moves out of `network-gallery.html` into `assets/network-gallery.js`
  (a plain script exposing one factory, e.g. `createGallery({ canvas, cfg, ... })`), used by both the Gallery
  tab and the hero, so the two never drift apart. `build-static.js` already copies `assets/`. The Gallery tab
  keeps its own CONFIG and panel and must look and behave exactly as before.
- **Prefixed keys.** In the hero, every gallery setting is prefixed `gallery` (`gallerySpin`, `galleryZoom`, …)
  because the hero CONFIG already uses `speed`, `zoom`, `dotSize`, `lineWidth` etc. for the Pins globe.
- **Hero panel groups** for the Gallery: "Gallery: camera", "Gallery: globe position", "Gallery: dots",
  "Gallery: network", "Gallery: openings", "Gallery: quiet centre". The Grid group is left out of the hero
  (grid lines are off in Nathan's settings); grid strength stays under Network.
- **Default art stays Pins**, so turning the option on is a deliberate choice.
- **In view, not Wave,** as the hero's default growth start (see table).
- **Pause globe / Restart globe** in the hero panel act on whichever art is showing.
- **Headline layouts without typing.** Rotating fires `'heroword'` with phase `'shown'` each time it rotates to a
  word. Stacked shows all four words at once and fires nothing, so lines keep the normal line colour, and the
  first opening uses the 2 s fallback.
- **Pin-only layers** (`.pins`, `.pin-areas`) and the Pins globe's canvas are hidden in Gallery mode, and the
  hero scrim is hidden too (the quiet centre replaces it).

## Left to the builder

- How the gallery engine is split from the Gallery tab's panel code, and the factory's exact API.
- How the quiet-centre falloff curve is shaped inside the soft band.
- Whether the two art canvases are separate elements or one shared canvas (separate is simpler to reason
  about; either is fine if only one runs).
- Tests: at minimum, an e2e check that switching Art to Gallery and back works with no console errors, that
  no automatic opening lands inside the quiet centre over ~15 s, and that the existing suite still passes.

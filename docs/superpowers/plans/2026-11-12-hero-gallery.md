# Gallery in the hero: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Gallery (networks of dots on a close-up globe, photos opening in dots) a switchable art option for the hero. It keeps a quiet centre around the centred copy, opens photos around the heading, takes the headline's word colour for lines being drawn, and paces itself more calmly.

**Architecture:**
- The engine moves out of `network-gallery.html` into one ES module, `assets/network-gallery.js`. It exports `createGallery(...)`, the panel control definitions and a few pure geometry/colour helpers.
- The Gallery tab imports the module.
- The hero's classic script loads it with a dynamic `import()` after the first frame. Gallery settings live in the hero CONFIG under `gallery*` keys, and a Proxy hands them to the engine without the prefix.
- Hero-only behaviour reaches the engine through options: the quiet ellipse, the bottom of the view, hover blocking, the first-opening gate and the word colour. With those options left out, the Gallery tab behaves exactly as today.

**Tech Stack:** Static HTML and vanilla JS with no build step; d3 v7 + d3-geo-projection from the CDN (globals); vitest 5 for unit tests (ES modules, like `review/ink.js`); Playwright 1.64 for e2e (`tests/e2e`, served by `python3 -m http.server 8792`).

**Spec:** `docs/superpowers/specs/2026-11-12-hero-gallery-design.md`

## Global Constraints

- **Static site.** No build step for pages; d3 comes from the CDN as now. `scripts/build-static.js` already copies `assets/`.
- **Pins stays the default.** `heroArt: 'pins'` is the default, and with it the hero must behave exactly as before. The existing e2e suite (comment mode, marker, versions, hubs, …) must pass unchanged.
- **The Gallery tab doesn't change.** It must look and behave exactly as before the extraction, with the same CONFIG, panel, URL params and keys.
- **Prefixed keys.** In the hero, every gallery key is the tab key with a `gallery` prefix and the next letter capitalised (`spin` → `gallerySpin`).
- **Spec defaults, copied exactly:**
  - Hero values that differ from the tab: `galleryMaxOpen: 2`, `galleryAutoEvery: 3.5`, `galleryGrowStart: 'inview'`, `galleryRevealLine: 0.05`, `gallerySlowOnHover: true`, `heroArt: 'pins'`.
  - New keys: `galleryQuietDotScale: 0.15`, `galleryQuietLineAlpha: 0`, `galleryQuietSoftness: 0.35`, `galleryHalo: true`, `galleryHaloWidth: 260`, `galleryWordColor: true`, `galleryColorSettle: 2.5`, `galleryPhoneOpenings: 'around'`, `galleryShowQuiet: false`.
  - Builder's call: `galleryQuietPadX: 40`, `galleryQuietPadY: 32`.
- **Only one engine runs.** The art that isn't chosen has no frame loop running and its layers are hidden.
- **The headline is untouched** apart from dispatching `CustomEvent('heroword', { detail: { index, color, phase } })` on `document`, with phase `'typing' | 'shown' | 'deleting'`.
- **Phones** are `(max-width: 640px)`, the same media query both pages already use.
- **Commits.** End every commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nothing is pushed to `main` in this plan; a later push needs a `Version:` line.

## Review Focus

1. **Switching art while the gallery module is still loading.** Pins → Gallery → Pins quickly must not leave both loops running or show a blank hero. Test: Task 3 `switching art quickly leaves one art running`.
2. **Window resize and layout or align changes while in Gallery mode.** The quiet ellipse must follow the copy, or photos land on the text. Test: Task 4 `quiet centre follows the copy after resize and align change`.
3. **Reset to defaults while in Gallery mode.** Reset returns `heroArt` to `'pins'`, so the art must switch back cleanly with no error. Test: Task 3 `reset returns to the pins globe`.
4. **Comment mode or Versions holding the page while Gallery shows.** The gallery must pause like the Pins globe does, and `data-globe` must still report paused. Test: Task 3 `comment mode holds the gallery still`.
5. **`?heroArt=gallery&controls=0` (an embed with no panel).** The gallery must still start without the panel. Test: Task 3 `gallery starts from the address without the panel`.

---

## File structure

| File | Responsibility |
|---|---|
| `assets/network-gallery.js` (new) | ES module: `createGallery`, `GALLERY_CONTROLS`, `PHOTO_IDS`, `photoUrl`, `prefixedConfig`, quiet/halo geometry, `mixHex` |
| `network-gallery.html` (modify) | Keeps its CSS, markup, CONFIG and panel wiring; the engine code is replaced by an import |
| `hero.html` (modify) | Art switch, gallery stage and canvas, `gallery*` CONFIG, the panel groups for each art, quiet-ellipse measurement, `heroword` events, the first-opening gate, lazy import |
| `tests/unit/gallery-geometry.test.js` (new) | Pure helpers |
| `tests/e2e/gallery.spec.js` (new) | The Gallery tab still works |
| `tests/e2e/hero-gallery.spec.js` (new) | The hero art switch, quiet centre, word colour, pacing and phones |
| `README.md` (modify) | Hero section: the Art option and its settings |

---

### Task 1: Extract the engine into `assets/network-gallery.js` (the tab is unchanged)

**Files:**
- Create: `assets/network-gallery.js`
- Modify: `network-gallery.html:204-1108` (the script block)
- Test: `tests/e2e/gallery.spec.js`

**Interfaces:**
- Produces (module exports):
  - `PHOTO_IDS: string[]` (the 24 ids now in `PHOTOS`) and `photoUrl(id: string): string`, both moved verbatim.
  - `GALLERY_CONTROLS`: the tab's current `CONTROLS` array, moved verbatim, with its `pct`/`sec`/`times` formatters.
  - `createGallery(opts) -> Gallery`, where `opts` is:
    - `{ canvas: HTMLCanvasElement, stage: HTMLElement, cfg: object, photos: string[], insets?: () => ({ r: number, b: number }), onStatus?: (text: string) => void }`
    - plus hooks that Task 2 adds; every hook is optional.
  - `Gallery` has these methods:
    - `start()` begins the rAF loop and is a no-op if it's already running; `stop()` cancels it.
    - `setPlaying(on: boolean)`; the `playing: boolean` getter.
    - `restart()`.
    - `rebuild()` (the old `hovered = null; build()`), `regrow()` (the old `gt = 0; resetNetworks()`), `refit()`.
    - `loadPhotos()` creates the `Image`s; the engine creates none before this is called.
    - `running: boolean` getter, true while the rAF loop is scheduled.
    - `debug(): { open: Array<{ x, y, R, kind }>, dots: Array<{ x, y, r }>, inView: number }`. `open` lists dots with `goal === 1`, with `R = d.r * d.size`; `dots` lists visible dots.
  - The engine reads `cfg` live on every frame and never copies it.
  - Reduced motion stays inside the engine. On construction it calls `setPlaying(false)` and shows networks fully grown, exactly as today.

- [ ] **Step 1: Commit the current Gallery tab work as the baseline**

```bash
git add network-gallery.html network-multiply.html network-globe.html network-globe-pins.html hero.html README.md
git commit -m "Gallery tab: close-up globe of growing networks with photos opening in dots"
```

- [ ] **Step 2: Write the failing e2e test `tests/e2e/gallery.spec.js`**

Open `/network-gallery.html` with `page.goto(path, { waitUntil: 'domcontentloaded' })` and wait for `canvas.is-ready`. Collect `pageerror` and console `error` events into an array. Tests:
- `the gallery tab loads its engine from assets`: the page requested a URL ending `/assets/network-gallery.js` and `window.__gallery` is defined.
- `photos open on their own, 3 to 5 in the first 10 seconds`: every 200 ms for 10 s, read `window.__gallery.debug().open` and count distinct newly opened dots, keyed by rounded `x,y` at the moment they first appear. Expect between 3 and 6 (one of slack), and expect no errors.
- `every panel control can change without errors`: open `#adjust`. For each `#groups select`, pick each option. For each range, set it to min, then max, then back, with `fill` + `dispatchEvent('input')`. Wait 300 ms and expect no errors.
- `Pause stops new openings and Restart starts again`: click `#play` and expect the text `Play`. Click `#restart` and expect `Pause`.

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx playwright test tests/e2e/gallery.spec.js`
Expected: FAIL on `window.__gallery` undefined and no `/assets/network-gallery.js` request.

- [ ] **Step 4: Move the engine into `assets/network-gallery.js`**

What moves: everything inside the current IIFE from `mulberry32` through `frame`, plus `setPlaying` and `restart`.

How the module works:
- d3 is used as the global `d3`. The module's top level touches no DOM and no `d3`, so vitest can import it.
- `insets()` replaces the panel-reading lines in `frame`. The tab passes the exact logic it has now: the panel width on desktop, the panel height on phones, zero when the panel is closed.
- `onStatus` replaces the direct `statusEl` write.
- The play button's label stays in the page: the page wraps `setPlaying`.

What stays in `network-gallery.html`:
- An inline `<script type="module">` that imports from `./assets/network-gallery.js`.
- It keeps CONFIG, the URL-param parsing, `buildPanel` (now calling `gallery.rebuild()` / `gallery.regrow()` / `gallery.refit()`), Shuffle (sets `cfg.seed`, then `gallery.rebuild()`), Copy, Reset, and the Space/R keys.
- It sets `window.__gallery = gallery`, calls `gallery.loadPhotos()` and `gallery.start()`, and adds `is-ready` on the first frame as today.

- [ ] **Step 5: Run the new test and the unit suite**

Run: `npx playwright test tests/e2e/gallery.spec.js && npx vitest run`
Expected: all PASS (vitest 103/103).

- [ ] **Step 6: Compare the tab against the baseline by eye**

Before Step 4, take a Playwright screenshot of `/network-gallery.html` at 1440×900, 4 s after `is-ready`, into `/tmp/gallery-check/before.png`. Take the same shot now into `after.png` and compare. The dot layout, line style and colours must match; photo timing is random.

- [ ] **Step 7: Commit**

```bash
git add assets/network-gallery.js network-gallery.html tests/e2e/gallery.spec.js
git commit -m "Gallery: move the engine into assets/network-gallery.js"
```

---

### Task 2: Quiet centre, halo, view bottom, word colour and gate in the engine

**Files:**
- Modify: `assets/network-gallery.js`
- Test: `tests/unit/gallery-geometry.test.js`

**Interfaces:**
- Consumes: the Task 1 `createGallery` and `Gallery`.
- Produces (new exports, all pure, with an ellipse `q = { cx, cy, rx, ry }` in canvas CSS px):
  - `prefixedConfig(cfg: object, prefix: string): object` is a Proxy. A get or set of `k` maps to `cfg[prefix + k[0].toUpperCase() + k.slice(1)]`, and `has` / `ownKeys` follow the same mapping.
  - `quietFactor(x, y, q, softness): number` returns 0..1. Let `e = hypot((x-cx)/rx, (y-cy)/ry)`. The result is 0 when `e <= 1 - softness`, 1 when `e >= 1`, and a smoothstep in between. When `q` is null it returns 1.
  - `clearOfQuiet(x, y, R, q): boolean` is `((x-cx)/(rx+R))² + ((y-cy)/(ry+R))² >= 1`. This is conservative: a circle that passes never overlaps the ellipse. When `q` is null it returns true.
  - `inHalo(x, y, R, q, width): boolean` is `clearOfQuiet(...)` and `((x-cx)/(rx+R+width))² + ((y-cy)/(ry+R+width))² <= 1`.
  - `aboveOrBelow(y, R, q): boolean` is `y + R <= cy - ry || y - R >= cy + ry`.
  - `mixHex(a: string, b: string, t: number): string` returns `#rrggbb`, where `t = 0` gives `a` and `t = 1` gives `b`.
- Produces (new `createGallery` options, all optional; when they're left out, behaviour is as in Task 1):
  - `quiet?: () => q | null`.
  - `viewBottom?: () => number`: px from the canvas top that count as the bottom of the view for openings. The default is `view.h - insetB`.
  - `hoverBlocked?: (x, y) => boolean`.
  - `autoGate?: () => boolean`: no automatic opening happens while it returns false.
  - `tapSlop?: number`: when set, touch opens on `pointerup` only if the pointer moved ≤ `tapSlop` px since `pointerdown`. When unset, touch keeps opening on `pointerdown`, as today.
- Produces (new `Gallery` method): `setWordColor(color: string | null)`.
- The engine reads these cfg keys, all treated as off or default when undefined: `quietDotScale`, `quietLineAlpha`, `quietSoftness`, `showQuiet`, `halo`, `haloWidth`, `wordColor`, `colorSettle`, `phoneOpenings`.

- [ ] **Step 1: Write the failing unit tests in `tests/unit/gallery-geometry.test.js`**

```js
import { describe, expect, test } from 'vitest';
import { prefixedConfig, quietFactor, clearOfQuiet, inHalo, aboveOrBelow, mixHex } from '../../assets/network-gallery.js';

const q = { cx: 500, cy: 300, rx: 200, ry: 100 };

describe('prefixedConfig', () => {
  test('reads and writes the prefixed key', () => {
    const cfg = { gallerySpin: 3, spin: 99 };
    const g = prefixedConfig(cfg, 'gallery');
    expect(g.spin).toBe(3);
    g.seed = 5;
    expect(cfg.gallerySeed).toBe(5);
    expect(g.missing).toBeUndefined();
  });
});

describe('quiet centre', () => {
  test('quietFactor is 0 deep inside, 1 outside, between in the soft band', () => {
    expect(quietFactor(500, 300, q, 0.35)).toBe(0);
    expect(quietFactor(500 + 200 * 0.6, 300, q, 0.35)).toBe(0);
    expect(quietFactor(800, 300, q, 0.35)).toBe(1);
    const mid = quietFactor(500 + 200 * 0.83, 300, q, 0.35);
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1);
    expect(quietFactor(500, 300, null, 0.35)).toBe(1);
  });
  test('clearOfQuiet rejects any circle touching the ellipse', () => {
    expect(clearOfQuiet(500 + 200 + 30, 300, 40, q)).toBe(false);
    expect(clearOfQuiet(500 + 200 + 41, 300, 40, q)).toBe(true);
    expect(clearOfQuiet(500, 300 - 100 - 41, 40, q)).toBe(true);
    expect(clearOfQuiet(500, 300, 5, null)).toBe(true);
  });
  test('inHalo accepts only the ring just outside', () => {
    expect(inHalo(500 + 200 + 60, 300, 40, q, 260)).toBe(true);
    expect(inHalo(500 + 200 + 40 + 261 + 1, 300, 40, q, 260)).toBe(false);
    expect(inHalo(500, 300, 40, q, 260)).toBe(false);
  });
  test('aboveOrBelow allows only openings fully above or below', () => {
    expect(aboveOrBelow(300 - 100 - 40, 40, q)).toBe(true);
    expect(aboveOrBelow(300 + 100 + 40, 40, q)).toBe(true);
    expect(aboveOrBelow(300, 40, q)).toBe(false);
  });
});

test('mixHex blends two colours', () => {
  expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
  expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  expect(mixHex('#2F7D6D', '#141414', 0.5)).toBe('#224941');   // Math.round per channel
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run tests/unit/gallery-geometry.test.js`
Expected: FAIL, because the named exports don't exist.

- [ ] **Step 3: Implement the pure helpers in `assets/network-gallery.js`**

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Wire the options into the engine**

**Dots (`applyShown`).** When `quiet()` gives an ellipse, multiply `d.r` by `lerp(cfg.quietDotScale, 1, quietFactor(d.x, d.y, q, cfg.quietSoftness))`.

**Lines (`drawLinks`).**
- Each link's alpha is `lerp(cfg.quietLineAlpha, 1, f)`, with `f` taken at the link's midpoint.
- Group links into 8 alpha buckets, one `Path2D` per bucket, and stroke each with its `globalAlpha`.
- Skip links whose alpha is ≤ 0.01.

**Word colour.** This applies only when `cfg.wordColor` is on and `setWordColor` has been given a colour.
- A link (node `n` or send `s`) whose progress `p` is strictly between 0 and 1 stores `link.tint = currentWordColor` and `link.tintDone = null`.
- When `p` first reaches 1, it stores `tintDone = gt`.
- Its stroke colour is `mixHex(link.tint, cfg.lineColor, clamp((gt - tintDone) / cfg.colorSettle))`, and `tint` is cleared once that reaches 1.
- Tinted links are stroked separately from the untinted buckets.
- `regrow()` and `rebuild()` clear all tints.

**Automatic openings (`tryAutoOpen`).** `fits(d)` adds these checks:
- the bottom edge uses `viewBottom()` in place of `H`;
- `clearOfQuiet(d.x, d.y, R, q)`;
- if `cfg.halo`, `inHalo(d.x, d.y, R, q, cfg.haloWidth)`;
- on phones (`mobileMq.matches`) with an ellipse: `cfg.phoneOpenings === 'off'` means nothing fits, otherwise `aboveOrBelow(d.y, R, q)`.
- `updateOpenings` skips automatic openings while `autoGate && !autoGate()`.

**Hover.**
- `setHover` treats a dot as none when `hoverBlocked?.(x, y)` is true, or when the pointer is inside the quiet ellipse (`quietFactor(x, y, q, 0) < 1`).
- The same rule applies to tap.

**Outline.** When `cfg.showQuiet` is on and there's an ellipse, `draw()` strokes it last as a 1 px `#C2861A` outline at 0.8 alpha.

- [ ] **Step 6: Check the tab is unaffected**

Run: `npx playwright test tests/e2e/gallery.spec.js && npx vitest run`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add assets/network-gallery.js tests/unit/gallery-geometry.test.js
git commit -m "Gallery engine: quiet centre, halo, view bottom, word-coloured lines, opening gate"
```

---

### Task 3: The hero's Art switch: Pins globe | Gallery

**Files:**
- Modify: `hero.html` (markup ~805, layout picker ~1078, CONFIG ~1156-1268, CONTROLS ~1319-1395, `frame` / `setPlaying` / `restart` / `buildPanel` / reset ~2350-2510, CSS near `.hero .stage` ~271)
- Test: `tests/e2e/hero-gallery.spec.js`

**Interfaces:**
- Consumes: `createGallery`, `prefixedConfig`, `GALLERY_CONTROLS`, `PHOTO_IDS`, `photoUrl` (Tasks 1–2).
- Produces (inside the hero IIFE, used by Task 4):
  - `let gallery = null`: the `Gallery`, once loaded.
  - `function setArt(art: 'pins' | 'gallery')`.
  - `function ensureGallery(): Promise<Gallery>`.
  - `heroEl.dataset.art`: `'pins'` or `'gallery'`.
  - `window.__heroGallery`, set to `gallery` once it's created (for tests).

- [ ] **Step 1: Write the failing e2e tests in `tests/e2e/hero-gallery.spec.js`**

Use `openPage` from `./helpers.js` and collect `pageerror` and console errors.

- `pins is the default art`:
  - `.hero` has `data-art="pins"`;
  - no request for `/assets/network-gallery.js` within 3 s of reveal, so the engine isn't loaded for Pins;
  - `#c-gallerySpin` doesn't exist or is hidden.
- `switching art to Gallery and back works without errors`:
  - open `#adjust` and click `.layout-picker [data-art="gallery"]`;
  - expect `.hero` `data-art="gallery"`, `#gallery-canvas` visible, `#canvas`, `#pins`, `.hero-scrim` hidden, and `window.__heroGallery.playing === true`;
  - the "Gallery: camera" group is visible and the "Globe: flight" group is hidden;
  - click `[data-art="pins"]`: `#gallery-canvas` hidden, `#canvas` visible, and `window.__heroGallery.running === false`;
  - no errors.
- `switching art quickly leaves one art running`: click gallery, pins, gallery, pins within 100 ms, wait 1.5 s, then expect `data-art="pins"`, the gallery not running and the pins canvas visible.
- `gallery starts from the address without the panel`: `openPage(page, '/hero.html?heroArt=gallery&controls=0')`, then within 5 s expect `window.__heroGallery.playing`, with `#gallery-canvas` visible.
- `Pause globe and Restart globe act on the gallery`: in Gallery, click `#play`; expect `__heroGallery.playing === false` and the label `Play globe`.
- `comment mode holds the gallery still`: in Gallery, `enterCommentMode(page)`; expect `__heroGallery.playing === false` and `html[data-globe="paused"]`.
- `reset returns to the pins globe`: in Gallery, click `#reset`; expect `data-art="pins"` and no errors.
- `Copy settings includes the gallery keys`: grant `clipboard-read`/`clipboard-write`, click `#copy`, read the clipboard and expect it to contain `"heroArt"`, `"gallerySpin"` and `"galleryQuietSoftness"`.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx playwright test tests/e2e/hero-gallery.spec.js`
Expected: FAIL, since there's no `[data-art]` button.

- [ ] **Step 3: Implement the switch in `hero.html`**

**Markup**
- Inside `.hero-art`, after `#stage`, add `<div class="stage gallery-stage" id="gallery-stage" hidden><canvas id="gallery-canvas" role="img" aria-label="A close-up of a pale globe turning; networks of dots grow and some open into photos of places in the network."></canvas></div>`.
- Add a first `.picker-row` "Art" with `.seg` buttons `data-art="pins"` "Pins globe" and `data-art="gallery"` "Gallery".

**CSS**
- `.hero[data-art="gallery"]` hides `#stage`, `.pins`, `.pin-areas` and `.hero-scrim`, and shows `#gallery-stage`. `.gallery-stage` takes the same absolute inset as `.hero .stage`.

**CONFIG**
- Add `heroArt: 'pins'`.
- Add one `gallery*` key for every key of the Gallery tab's CONFIG, with the tab's current values, overridden by the Global Constraints hero values.
- Add the new keys from Global Constraints, each with a one-line comment.
- Leave `gallerySeed` at 7.

**Controls**
- Every existing "Globe: …" group gets `art: 'pins'`.
- Build the gallery groups from `GALLERY_CONTROLS` once the module loads (`addGroups`, below):
  - drop the `Grid` group and move `gridStrength`;
  - rename each group to `'Gallery: ' + name.toLowerCase()`;
  - prefix each key;
  - tag each group with `art: 'gallery'` and each item with `gallery: true` (its `rebuild` / `regrow` flags are kept).
- Then add, as gallery items:
  - **Network:** `galleryWordColor` "Lines take the headline colour" (check), `galleryColorSettle` "Colour settles back over" (range 0.5–6, step 0.1, s).
  - **Openings:** `galleryHalo` "Photos open around the heading" (check), `galleryHaloWidth` "Ring width around the heading" (range 60–500, step 10, px), `galleryPhoneOpenings` "Openings on phones" (select `around` "Above and below the text" / `off` "Off").
  - **New group "Gallery: quiet centre":**
    - `galleryQuietPadX` "Side padding" (0–300, step 4, px)
    - `galleryQuietPadY` "Top and bottom padding" (0–200, step 4, px)
    - `galleryQuietDotScale` "Dot size inside" (0–1, step 0.01, %)
    - `galleryQuietLineAlpha` "Lines inside" (0–1, step 0.01, %)
    - `galleryQuietSoftness` "Soft edge" (0.05–1, step 0.01, %)
    - `galleryShowQuiet` "Show quiet centre outline" (check)

**`buildPanel`**
- Split the per-group body into `addGroup(group)`; `buildPanel` loops over `CONTROLS` and calls it.
- `sec.dataset.art = group.art || ''`.
- The input handler, before the `c.sites` branch, does `if (c.gallery) { if (gallery) c.rebuild ? gallery.rebuild() : c.regrow ? gallery.regrow() : gallery.refit(); return; }`.
- `function syncArt()` sets `sec.hidden = sec.dataset.art && sec.dataset.art !== cfg.heroArt` for each group and sets `aria-pressed` on `[data-art]`.

**`ensureGallery()`**
- It's a memoised `import('./assets/network-gallery.js')`.
- It then calls `createGallery({ canvas: galleryCanvas, stage: galleryStage, cfg: prefixedConfig(cfg, 'gallery'), photos: PHOTO_IDS.map(photoUrl), insets })`, where `insets` is the same panel-inset logic as the Pins `frame`.
- If `showControls`, it adds the gallery groups and calls `syncArt()`.
- It sets `window.__heroGallery` and returns the gallery.

**`setArt(art)`**
- Set `cfg.heroArt = art`, `heroEl.dataset.art = art` and `syncArt()`.
- For `'pins'`: `gallery?.stop()`, then restart the Pins loop if it stopped. Pins `frame` returns without rescheduling while `cfg.heroArt !== 'pins'`. Track `pinsLooping` so the loop is never started twice.
- For `'gallery'`: `await ensureGallery()`. If `cfg.heroArt` is still `'gallery'`, call `gallery.setPlaying(playing)`, `gallery.start()`, then `gallery.loadPhotos()` inside `requestAnimationFrame` after `document.fonts.ready`.

**Playback and observers**
- `setPlaying(on)` also calls `gallery?.setPlaying(on)`.
- `restart()` in Gallery mode calls `gallery.restart()` instead of rebuilding the Pins sites.
- The IntersectionObserver callback also does `gallery && cfg.heroArt === 'gallery' && (heroOnScreen ? gallery.start() : gallery.stop())`. A hidden tab needs nothing extra: the browser pauses rAF, and the engine's `dt` is already capped at 0.1 s.

**Reset and start-up**
- Reset ends with `setArt(cfg.heroArt)` and `gallery?.rebuild()`.
- On start, after `buildPanel`, call `setArt(cfg.heroArt)`. With `'gallery'` from the address, Pins never starts its loop.

- [ ] **Step 4: Run the new tests and the full suite**

Run: `npx playwright test && npx vitest run`
Expected: all PASS, including the existing hero specs, which run with Pins.

- [ ] **Step 5: Commit**

```bash
git add hero.html tests/e2e/hero-gallery.spec.js
git commit -m "Hero: Art option to switch between the Pins globe and the Gallery"
```

---

### Task 4: The quiet centre, word colour, pacing, curve and phones in the hero

**Files:**
- Modify: `hero.html` (headline functions ~2540-2635, the `ensureGallery` options from Task 3)
- Test: `tests/e2e/hero-gallery.spec.js`

**Interfaces:**
- Consumes: `ensureGallery`, `setArt`, `gallery`, `heroTextRects` (existing), and the Task 2 options and `setWordColor`.
- Produces:
  - `function quietEllipse(): { cx, cy, rx, ry } | null`, in gallery-canvas CSS px.
  - `window.__heroQuiet = quietEllipse`, for tests.
  - `function emitWord(phase)`, which dispatches `heroword`.

- [ ] **Step 1: Write the failing e2e tests (append to `tests/e2e/hero-gallery.spec.js`)**

The first three tests use a helper that opens `/hero.html?heroArt=gallery` and waits for `__heroGallery.playing`.

- `no photo opens inside the quiet centre`:
  - for 15 s, every 200 ms, read `q = __heroQuiet()` and `__heroGallery.debug().open`;
  - for every `kind === 'auto'` entry, assert `((x-cx)/(rx+R))² + ((y-cy)/(ry+R))² >= 0.98`;
  - assert at least one automatic opening happened.
- `no photo opens below the straight edge`: in the same sampling, every auto opening has `y + R <= heroEl.offsetHeight - galleryEdgeRoom`.
- `the headline announces each word`:
  - an init script records `heroword` details into `window.__words`;
  - after 8 s, `__words` contains `phase: 'typing'` and `phase: 'shown'` with `index: 0` and `color` matching `/^#|rgb/`;
  - a later entry has `index: 1`.
- `lines take the word colour while drawing`: with `?heroArt=gallery&galleryGrowStart=edge`, sample the gallery canvas pixels via `getImageData` over 4 s. At least one pixel is within distance 40 (RGB) of Disciples `#2F7D6D`.
- `the first photo waits for the first word`: the first auto opening (from `debug().open`) happens after the first `heroword` `'shown'`, and none happens before it.
- `quiet centre follows the copy after resize and align change`: `setViewportSize` 1000×800, then click `[data-align="left"]`. `__heroQuiet().cx` moves to within the left half, and `.hero-copy`'s centre lies inside the ellipse.
- `hovering the copy never opens a photo`: hover the centre of `.hero-title` and a point between the two buttons for 1 s each; `debug().open` has no `kind === 'hover'` entry.
- `phones open photos only above and below the text`: at viewport 390×844, sample for 12 s. Every auto opening satisfies `y + R <= cy - ry || y - R >= cy + ry`. With `?galleryPhoneOpenings=off`, there are none over 8 s.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx playwright test tests/e2e/hero-gallery.spec.js`
Expected: the new tests FAIL (`__heroQuiet` is undefined; there are no `heroword` events).

- [ ] **Step 3: Implement the hero side**

**`quietEllipse()`**
- Take the union box of `heroTextRects('strict')` entries whose centre lies inside `heroCopy.getBoundingClientRect()`. This drops the header links and sizes the line to the widest word.
- Convert it to gallery-canvas coordinates (subtract `galleryCanvas.getBoundingClientRect()` left/top).
- Use an ellipse through the padded box's corners: `rx = (w/2 + galleryQuietPadX) * Math.SQRT2`, `ry = (h/2 + galleryQuietPadY) * Math.SQRT2`, centred on the box.
- Cache it, and recompute on `resize`, inside `syncHeadline()`, on `document.fonts.ready`, and on any `galleryQuietPad*` input.
- Return `null` while `heroArt !== 'gallery'`.

**Options added to `createGallery`**
- `quiet: () => cachedQuiet`.
- `viewBottom: () => heroEl.offsetHeight`. `.hero-art` starts at the hero's top, so this is the straight edge.
- `hoverBlocked: (x, y) => point is inside any heroTextRects('strict') box`. Convert the point to viewport coordinates first.
- `autoGate: () => firstShown || performance.now() - galleryStartedAt > (cfg.heroLayout === 'stacked' ? 2000 : 6000)`.
  - The 2 s fallback is the spec's, for Stacked.
  - Typed and Rotating wait for their first `'shown'`, and the 6 s is only a safety net in case the event is lost. `galleryStartedAt` is set when the gallery first starts.
- `tapSlop: 8`.

**`emitWord(phase)`**
- `document.dispatchEvent(new CustomEvent('heroword', { detail: { index: wordIndex, color: getComputedStyle(document.documentElement).getPropertyValue(WORDS[wordIndex].color).trim(), phase } }))`.
- Call `'typing'` in `typeStep` when it types a letter.
- Call `'shown'` in `typeStep` where it calls `holdThen(deleteStep, …)`, in `typedShow`, and at the end of `rotateTo`.
- Call `'deleting'` in `deleteStep` when it removes a letter.
- Stacked fires nothing.

**Listener**
- `document.addEventListener('heroword', e => { if (e.detail.phase === 'shown') firstShown = true; gallery?.setWordColor(e.detail.color); })`.

- [ ] **Step 4: Run the full suite**

Run: `npx playwright test && npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Check by eye at three sizes**

Take Playwright screenshots of `/hero.html?heroArt=gallery&galleryShowQuiet=1` at 1440×900, 1280×800 and 390×844, 6 s and 12 s after reveal. Check that:
- the outline hugs the copy;
- photos sit in the ring around it;
- nothing is under the text or the buttons;
- there's no grey veil;
- the curve doesn't cut a photo.

Save them to `/tmp/hero-gallery-check/`.

- [ ] **Step 6: Commit**

```bash
git add hero.html tests/e2e/hero-gallery.spec.js
git commit -m "Hero Gallery: quiet centre around the copy, word-coloured lines, calmer first opening, phones"
```

---

### Task 5: README and reduced motion

**Files:**
- Modify: `README.md` (the "# Hero (sample webpage)" section and the "# Network Gallery" section)
- Test: `tests/e2e/hero-gallery.spec.js`

- [ ] **Step 1: Write the failing test**

`reduced motion shows a still gallery`:
- use `page.emulateMedia({ reducedMotion: 'reduce' })` with `?heroArt=gallery`;
- after 5 s, `__heroGallery.playing === false` and `debug().open` has no `auto` entry;
- hovering a dot from `debug().dots` that lies outside `__heroQuiet()` opens it with `kind 'hover'`.

- [ ] **Step 2: Run it, then fix any gap**

Run: `npx playwright test tests/e2e/hero-gallery.spec.js -g "reduced motion"`.
The engine already pauses under reduced motion, so this probably passes. If the hero's `setArt` overrides it, keep the gallery paused when `reduceMotion` is set.

- [ ] **Step 3: Update the README**

**Hero section:** describe the Art row, the quiet centre and its sliders, photos around the heading, lines taking the headline colour (and that this shows only while Growing), calmer pacing, phones, and `?heroArt=gallery`.

**Gallery section:** add one line saying the engine lives in `assets/network-gallery.js` and is shared with the hero.

- [ ] **Step 4: Run everything**

Run: `npx vitest run && npx playwright test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/e2e/hero-gallery.spec.js hero.html
git commit -m "Hero Gallery: reduced motion check and README"
```

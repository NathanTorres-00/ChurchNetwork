# Floating Nav Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating nav's scroll and hover logic with option B: open at the top on wide screens, a pill while reading, still during page changes.

**Architecture:** One state model in the `SiteHeader.astro` script: at-top, hidden, hovered, pinned. Three classes on `.site-nav` carry it: `is-top`, `is-open`, `is-scroll-hidden`. CSS decides when `is-top` shows the open bar (wide container only), so the first paint is right before any script runs. Transitions stay off until an `is-ready` class is added on the frame after load. View-transition CSS in `PageTransition.astro` stops the nav from animating between pages.

**Tech Stack:** Astro 5 component with an inline module script, Lumos CSS (`@layer components`, rem units), Playwright e2e (Desktop Chrome 1440×900 default project).

**Spec:** `docs/superpowers/specs/2026-11-19-floating-nav-behavior-design.md`

## Global Constraints

- Look unchanged: sizes, colors, pill shape, link set, the 0.44s `cubic-bezier(0.22, 1, 0.36, 1)` timing, and the links fading in at 22% of that time.
- Wide means the pill's container is wider than `56.25rem` (the existing `@container (max-width: 56.25rem)` boundary). Use that boundary only; no separate media query.
- At-top: `scrollY < 5rem` (5 × root font size).
- Hide and reveal while reading keep today's 18px direction threshold.
- Scrolling never opens the nav. Only being at the top on a wide screen, hover, a click or tap, or keyboard focus do.
- The logo click at the top on wide screens is a no-op.
- Lumos rules: no px in CSS (rem/em), styles in `<style is:global>` under `@layer components`.
- Reduced motion: instant changes (keep the existing `prefers-reduced-motion` blocks).
- Commits end with a `Version:` line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Resizing across 56.25rem at the top.** The bar should switch between open and pill without being stuck in the wrong aria state. → Task 1 test "resizing across the breakpoint updates the menu state".
2. **Back and forward from bfcache (`pageshow` with `persisted`) mid-page.** It should show the pill with no animation from the open bar. → Task 2 test "a page restored mid-scroll shows the pill without animating".
3. **Home's collision logic reads `.site-nav` rects** (`public/scripts/home-main.js:982`, `public/scripts/groups-panel.js:30`). With the bar open at the top, the existing home and groups specs must still pass. → covered by running the full e2e suite in Task 2.
4. **Hash link on Home while pinned open.** The menu should close and the page should scroll to the section. → Task 1 test "picking a link closes the menu".
5. **Keyboard user tabs into links while the pill is hidden.** It should reveal and open (existing test, kept).

---

### Task 1: State model and CSS for option B

**Files:**
- Modify: `src/components/global/SiteHeader.astro` (markup class, script, styles)
- Test: `tests/e2e/floating-nav.spec.js` (rewrite)

**Interfaces:**
- Produces: on `.site-nav`, the classes `is-top`, `is-open`, `is-scroll-hidden` and `is-ready` (Task 2 relies on `is-ready` gating transitions). The custom property `--site-nav-mode`: `wide` by default, `narrow` inside the narrow container query, read by the script with `getComputedStyle(nav).getPropertyValue('--site-nav-mode').trim()`.
- Effective open (drives `aria-expanded`, `inert`, `aria-hidden`): `(isTop && wide) || pinned || hovered || links has :focus-visible`. The `is-open` class reflects `pinned || hovered || focus`. Top-on-wide openness comes from the `is-top` CSS.

- [ ] **Step 1: Rewrite `tests/e2e/floating-nav.spec.js`.** Keep the `openPage` helper import and the existing pill-size assertions (padding 42 × 34, logo width 169) where the nav is a pill. Tests, all at 1440×900 unless noted:
  - **`${path} is open at the top and opens from the pill by keyboard`**, for home, groups and leadership, with reduced motion:
    - At load: brand `aria-expanded="true"` and the Home link visible.
    - Clicking brand leaves it `true`.
    - Scroll to 400, then to 300. Expect `false`, `nav.getByRole('link')` count 0, nav opacity 1, and the pill-size assertions.
    - `brand.focus()` + Enter gives `true`. Tab focuses Home. Escape gives `false` with brand focused.
  - **`hover opens the pill mid-page`**: scroll to 400, then 300. Hover the pill: `true`. Mouse to (50, 600): `false`.
  - **`scrolling shrinks, hides and returns the pill without opening it`**:
    - Scroll to 200: `false`, nav opacity 0, `pointer-events: none`.
    - Scroll to 150: opacity 1, still `false`.
    - Scroll to 0: `true`, Home link in viewport.
  - **`scrolling closes a menu opened by click`**: scroll to 400, then 300. Click brand: `true`. Scroll to 700: `false`.
  - **`picking a link closes the menu`**: on Home via `openPage`, scroll to 400, then 300. Click brand. Click the "Our story" link. Expect `false` and `#story` top within 200px of 0 (poll).
  - **`keyboard focus reveals the nav after it has scrolled out of view`**: keep as is (scroll to 100 now leaves `is-top`, since 100 > 80).
  - **`resizing across the breakpoint updates the menu state`**: at the top, set viewport 800×900: `false`, links count 0. Back to 1440: `true`.
  - **touch, 390×844**:
    - At the top: `false`.
    - Tap brand: `true`, and Leadership has `aria-current` on /leadership.
    - Scroll to 300: `false`.
    - Scroll to 0, tap brand, tap Groups: URL `/groups`, `false`.

- [ ] **Step 2: Run it to make sure it fails**

  Run: `npx playwright test tests/e2e/floating-nav.spec.js`
  Expected: FAIL. Top-open tests fail on `aria-expanded="false"`, and the scroll test fails because scroll-up opens the nav.

- [ ] **Step 3: Implement in `SiteHeader.astro`.**
  - **Markup:** `<nav class="site-nav is-top">`.
  - **CSS:**
    - Add `--site-nav-mode: wide`, and set it to `narrow` inside the existing narrow `@container` block.
    - Under `@container (min-width: 56.3125rem)`, `.site-nav.is-top` gets the open width, and its `.site-nav_links` opacity 1 with the reveal delay.
    - Move the width, height, translate and opacity transitions, and the links' opacity transition, behind `.site-nav.is-ready` (no transitions without it).
  - **Script:** replace the scroll and open logic with the state model in Interfaces.
    - `sync()` sets the classes and aria from state.
    - Scroll handler:
      - Computes `isTop` from `scrollY < 5 * rootFontSize`.
      - Accumulates direction distance as today. Past 18px, sets `hidden = distance > 0 && !isTop` and `pinned = false`. If `hidden`, also `hovered = false`.
      - At the top, `hidden = false`.
    - Brand click: no-op when `isTop && wide`, otherwise toggle `pinned`.
    - A click on any nav link sets `pinned = hovered = false`.
    - Keep the outside-click, Escape, focusout and pointer-type-mouse hover rules.
    - Re-read `--site-nav-mode` on `resize` and call `sync()`.
    - On load: `sync()`, then `requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.add('is-ready')))`.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx playwright test tests/e2e/floating-nav.spec.js tests/e2e/site.spec.js tests/e2e/groups.spec.js tests/e2e/hubs.spec.js`
  Expected: all PASS. The groups and hubs specs click the brand at the top; that's now a no-op with links already showing.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/global/SiteHeader.astro tests/e2e/floating-nav.spec.js
  git commit -m "Open the nav at the top and keep it a pill while reading"
  ```

### Task 2: No nav animation on load, restore or page change

**Files:**
- Modify: `src/components/global/SiteHeader.astro` (script: `pageshow`)
- Modify: `src/components/utility/PageTransition.astro` (view-transition CSS)
- Test: `tests/e2e/floating-nav.spec.js` (add two tests)

**Interfaces:**
- Consumes: `is-ready` and `sync()` from Task 1.

- [ ] **Step 1: Add tests.**
  - **`a page restored mid-scroll shows the pill without animating`**:
    - `goto('/groups')`, scroll to 900, `page.reload()`, poll `scrollY > 500`.
    - Expect `aria-expanded="false"`.
    - Read `nav.getAnimations().length` in the first evaluate after load: expect `0`.
  - **`the nav holds still while changing pages`**:
    - Add an init script. On `pagereveal` with `e.viewTransition`, await `e.viewTransition.ready` and store `document.getAnimations().filter(a => String(a.effect?.pseudoElement).includes('site-header')).length` in `window.__navAnims`.
    - Go to `/`, click the Groups link in the open bar, then poll `window.__navAnims` on /groups.
    - Expect `0`.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx playwright test tests/e2e/floating-nav.spec.js -g "restored|holds still"`
  Expected: the page-change test FAILS (the group animation exists). The restore test may already pass after Task 1. If so, keep it as a guard.

- [ ] **Step 3: Implement.**
  - **In `PageTransition.astro`:**
    - `::view-transition-group(site-header)` and `::view-transition-new(site-header)` get `animation: none`.
    - `::view-transition-old(site-header)` gets `display: none`.
  - **In `SiteHeader.astro`:** on `pageshow` with `event.persisted`:
    - Remove `is-ready`, reset `hovered`, `pinned` and the direction distance.
    - Recompute `isTop` and `hidden = false`, then `sync()`.
    - Re-add `is-ready` after two frames.

- [ ] **Step 4: Run the whole suite**

  Run: `npm run check && npm test && npx playwright test`
  Expected: check 0 errors, 27/27 unit, all e2e PASS.

- [ ] **Step 5: Manual look.**
  - Run `npm run dev` and try Home → Groups → Leadership at 1440 and 390, plus a section link on Home.
  - Confirm no visible nav jump on arrival and that Groups' hero entrance plays under a still nav.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/global/SiteHeader.astro src/components/utility/PageTransition.astro tests/e2e/floating-nav.spec.js
  git commit -m "Keep the nav still on page changes and restores"
  ```

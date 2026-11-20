# Phone Nav (Hamburger on the Right) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Below the 56.25rem pill-container breakpoint, the nav becomes a full-width glass bar with a Home logo link
on the left and a ☰ "Menu" button on the right. ☰ opens a right-aligned menu card with one grouped list.

**Architecture:** Keep the single `nav.site-nav` element. Its scroll-hide logic, its view-transition name and the
page scripts that measure `.site-nav` all keep working on phones. Phone-only children (`.site-nav_home`,
`.site-nav_toggle`) are added inside the nav. Two siblings follow it in `.site-header_position`: the card,
`nav.site-menu`, and a dim layer, `.site-menu_dim`. Container queries swap the desktop children (brand button,
`.site-nav_links`) for the phone ones. On narrow widths the script ignores hover and pin, and runs a small
`menuOpen` state instead.

**Tech Stack:** Astro component (`SiteHeader.astro`) with an inline TS module script. Lumos CSS: rem units,
`@layer components`. Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-19-mobile-nav-design.md`

## Global Constraints

- Narrow means `@container (max-width: 56.25rem)` on `.site-header_position`. The script reads it through
  `--site-nav-mode: narrow`, as today.
- Desktop behaviour and markup visible on desktop stay unchanged. The phone pieces are `display: none` on wide
  screens.
- Phone menu order: Home, Groups, Leadership (only when `showLeadership()`), Videos, then a rule, then What we do,
  How we do it, Our story, App. No Find a hub.
- Names: ☰ button `aria-label="Menu"` with `aria-controls="site-menu"`. Logo link
  `aria-label="The Rock Network home"`. Card: `nav#site-menu aria-label="Menu"`.
- The menu closes on ☰/✕, a tap on the dim, Escape (focus returns to ☰), a link click, a scroll past the 18px
  threshold, a resize to wide, and a bfcache restore.
- Reduced motion: no card scale or fade transition.
- Commits end with a `Version:` line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commit only this work. Other agents may have uncommitted changes in `public/assets/videos/` and
  `src/content/videos/`.

## Review Focus

1. **A desktop-width window narrowed below 900px while hovering the bar.** It must not widen to the old open
   pill. → test "a narrow window never opens the old pill on hover".
2. **The hidden phone logo link on desktop.** It must not appear in desktop nav text checks
   (`site.spec` NAV uses `.site-nav_links a`).
3. **Tab order on phones.** ☰ is followed by the card's links when the card is open, and the closed card is
   inert. → covered in the touch test with `toBeFocused` after Escape.
4. **Scroll-hide with the menu open.** Scrolling closes the card before the bar slides away.
5. **Home's pin logic** still sees `.site-nav`, the phone bar. The full suite covers this.

---

### Task 1: Phone bar, menu card and tests

**Files:**
- Modify: `src/components/global/SiteHeader.astro`
- Modify: `tests/e2e/floating-nav.spec.js` (touch describe block and the resize test)
- Modify: `tests/e2e/site.spec.js` (NAV locator becomes `.site-header .site-nav_links a`)

- [ ] **Step 1: Write the tests.** All at 390×844 with `hasTouch`, unless noted.
  - **`the phone bar has the logo home and a Menu button on the right`**
    - The logo link goes to `/`.
    - Menu has `aria-expanded="false"`, and its box's right edge is within 24px of 390.
    - The "Menu" navigation's links are hidden.
  - **`Menu opens one list from the right, pages first`** (on `/leadership`)
    - Tap Menu: `aria-expanded="true"`.
    - The "Menu" nav's links read `['Home','Groups','Leadership','Videos','What we do','How we do it','Our story','App']`.
    - Leadership has `aria-current="page"`.
    - The card's right edge is within 24px of 390, and its width is between 200 and 300px.
  - **`the menu closes on the dim, Escape, scrolling and a link`**
    - Tap at (30, 600): closed.
    - Reopen, press Escape: closed, and Menu is focused.
    - Reopen, scroll to 300: closed.
    - Scroll to 0, reopen, tap Groups: URL `/groups`, closed.
  - **`a narrow window never opens the old pill on hover`** (800×900, no touch)
    - Hover the bar: Menu stays `false`, and the nav's width is unchanged.
  - **Update `resizing across the breakpoint updates the menu state`.** At 800, the brand button is hidden and
    Menu is visible. Back at 1440, the brand shows `aria-expanded="true"`.

- [ ] **Step 2: Run them and watch them fail.** Run `E2E_PORT=4329 npx playwright test tests/e2e/floating-nav.spec.js`.
  Expected: the new tests fail (no Menu button).

- [ ] **Step 3: Implement in `SiteHeader.astro`.**
  - **Markup:**
    - Add `a.site-nav_home` (the logo image) and `button.site-nav_toggle` (three bars drawn in CSS that become ✕
      when `aria-expanded="true"`) inside `nav.site-nav`.
    - After the nav, add `div.site-menu_dim` and `nav.site-menu#site-menu` with two `ul.site-menu_list`
      separated by `hr.site-menu_rule`. Both start `inert`.
  - **CSS:**
    - On wide screens, hide the phone pieces.
    - On narrow screens:
      - hide `.site-nav_brand` and `.site-nav_links`;
      - make `.site-nav` `width: calc(100cqw - 1.5rem)`, flex `space-between`, `align-items: center`;
      - drop the old narrow `is-open` height and width rules.
    - The card sits `position: absolute; top: calc(100% + 0.5rem); right: 0.75rem`, with
      `width: clamp(13rem, 66cqw, 20rem)`. It uses the same glass as the pill, `transform-origin: top right`, and
      a scale(0.94) + opacity transition of 0.18s, none with reduced motion.
    - Links are `min-height: 2.75rem`. The current page gets `var(--background-2)`.
    - The dim is `position: fixed; inset: 0; background: rgb(0 0 0 / 25%)`, shown with
      `.site-header.is-menu-open`.
  - **Script:**
    - Add `menuOpen` and `setMenu(open: boolean, returnFocus = false): void`. It toggles `.is-menu-open` on
      `.site-header`, `aria-expanded`, and the `inert` state of the card and dim.
    - In `sync()`, `asked` is false when `!wide`.
    - Close the menu as listed in the Global Constraints, using the existing scroll threshold branch,
      `resize`, `settle()`, the Escape handler and the outside-click handler. A click inside `.site-menu` or on
      the toggle is not "outside".

- [ ] **Step 4: Run tests.** Run `E2E_PORT=4329 npx playwright test tests/e2e/floating-nav.spec.js tests/e2e/site.spec.js`
  three times (`--repeat-each=3`). Expected: all pass.

- [ ] **Step 5: Full suite and a look.**
  - Run `npm run check && npm test && E2E_PORT=4329 npx playwright test`. Expected: all green.
  - Screenshot 390 and 768 closed and open, and 1440 to confirm desktop is unchanged.

- [ ] **Step 6: Commit.** Commit only `SiteHeader.astro`, the two specs, the spec doc and this plan.

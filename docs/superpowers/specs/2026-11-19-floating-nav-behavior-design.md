# Floating nav behavior — design

**Date:** November 19, 2026 · **Size:** small change · **Component:** `src/components/global/SiteHeader.astro` (+ `src/components/utility/PageTransition.astro`)

## Intent

The nav's look is right; its behavior isn't. Today it opens wide whenever you scroll up or reach the top, hover and scroll openings behave differently, and changing pages animates it from open to closed while the new page rises in. Nathan wants the behavior to make sense: links visible where people start, out of the way while reading, and still during page changes.

## Behavior (approved: option B)

**Wide screens (the full bar fits, pill container over 56.25rem ≈ 900px):**

- **At the top of a page:** the full bar is open with every link visible (today's open look).
- **After about 5rem of scroll:** the bar shrinks to the logo pill. Links fade out first, then it narrows.
- **Scrolling down further:** the pill slides up out of view.
- **Scrolling up:** the pill returns, still a pill. Scrolling never opens it.
- **Back at the very top:** the full bar opens again.
- **Opening the pill mid-page:** hovering opens it and leaving closes it. A click or tap keeps it open until you click outside, press Escape, pick a link or scroll.
- **Picking a Home section link:** the menu closes as the page scrolls to the section.

**Narrow screens (under about 900px, which includes phones and tablets in portrait):** always the pill. Tapping opens the two-column menu, and tapping a link or scrolling closes it.

**Page changes:** the nav doesn't animate. The new page shows its nav already in its final state: open at the top on wide screens, the pill on narrow ones. Only the page underneath transitions. On Groups, the hero's entrance animation plays without the nav moving.

**Back and Forward:** if the page is restored mid-page, it shows the pill without animating. At the top, it shows the full bar.

**Reduced motion:** state changes are instant.

## Goals / non-goals

- Goal: predictable states, links discoverable at the top, nothing opening unasked.
- Non-goals: visual redesign (colors, sizes, pill shape, link set stay), Find a hub rules, page-transition styles.
- Anti-goals: the nav jumping or animating on page load. A menu dropping over content during scrolling on phones.

## Approaches considered

1. **Rework the existing script into explicit states (chosen).** One state model (top / pill / hidden, plus open-by-hover / open-by-click), and CSS keyed to state classes. Builds on what's there.
2. **CSS scroll-driven animations for the top/pill switch.** Less script, but Safari and Firefox support is partial and hide-on-scroll-down still needs script. Ruled out.

## How it's built

- **Markup:** the header ships with an "at top" class, so the first paint is already right. On wide screens, CSS (the container query) shows the open bar. On narrow screens, the at-top class does nothing. The script corrects state on load when the page is restored mid-page.
- **Transitions:** off until the first frame after load (an "is-ready" class), so a restored page doesn't animate from open to pill.
- **Accessibility:** links get `inert` and `aria-hidden` from the effective open state, including the top-on-wide case. The logo button's `aria-expanded` matches.
- **Page changes:** in `PageTransition.astro`, the `site-header` view-transition group, old and new get no animation: hide the old snapshot and show the new one at once.
- **Tests:** update `tests/e2e/floating-nav.spec.js` for the new states. Update specs that open the logo before using links (site, groups, hubs) so they work when the bar is already open at the top on desktop.

## Calls made by the builder (check these)

- About 5rem of scroll before shrinking. Hiding on scroll-down keeps today's 18px direction threshold.
- Home's Find a hub button follows Home's existing setting. When that setting is on, the button shows in the open bar at the top, as it does in any open state today.
- Tablets in portrait count as narrow.
- On wide screens at the top, clicking the logo doesn't close the bar (it's already open; `aria-expanded="true"`).
- In the pill, a click-opened menu closes when scrolling starts. A hover-opened one closes when the pointer leaves.

# Phone nav: hamburger on the right — design

**Date:** November 19, 2026 · **Size:** small change · **Component:** `src/components/global/SiteHeader.astro`

## Why

On phones the nav is a centred logo pill that opens into a two-column grid when you tap the logo. Nothing marks
it as a menu, and the grid doesn't read as a list. Nathan wants what phone users already know: a ☰ on the right
that opens the menu from that side.

## What (approved: option A)

This applies only when the full bar doesn't fit (pill container ≤ 56.25rem: phones and portrait tablets).
Desktop doesn't change.

- **Closed.** The same glass pill, full width. The logo on the left is a link to Home. A ☰ button on the right is
  named "Menu". It still hides when scrolling down and returns when scrolling up.
- **Open.** ☰ turns into ✕. A menu card drops from the top-right corner, right-aligned under the button, about
  two-thirds of the screen wide. The page behind is slightly dimmed. The card holds one list:
  - pages: Home, Groups, Leadership (while it's shown), Videos;
  - a thin rule;
  - Home's sections: What we do, How we do it, Our story, App.

  Find a hub isn't in the phone menu. It's a hidden, unfinished section that only Home's Adjust panel switches
  on, and it stays on Home and on the desktop bar as it is.

  The current page is marked (`aria-current`).
- **Closing.** ✕, tapping outside the card, picking a link, Escape, or scrolling. Focus returns to ☰ when it
  closes by Escape or ✕.
- **Motion.** The card grows quickly out of the ☰ corner. Nothing moves when reduced motion is on.

## Approaches

1. **Separate phone markup in the header (chosen).** Logo link, ☰ button and menu card are shown only below the
   breakpoint, and the desktop pill is hidden there. Desktop code stays untouched. The links exist twice, but
   the hidden set is `display: none`, so assistive tech meets one.
2. **Restyle the existing pill with CSS.** Rejected: the desktop logo is the menu button, while on phones it must
   be a link, and the two link groups would need CSS reordering.

## Constraints

- Lumos conventions: rem units and `@layer components`.
- The page scripts read `.site-nav` boxes (`home-main.js`, `groups-panel.js`). The phone bar keeps the class
  they measure, so pins keep clear of it.
- The page-transition hold (the nav doesn't animate between pages) must hold on phones too.

## Left to the builder

Exact sizes, shadow and dim strength within the current look. Whether the scroll-hide logic is shared or
duplicated.

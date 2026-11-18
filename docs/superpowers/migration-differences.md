# Migration differences

Every visible or behavioral difference between the live site (`main`) and the Astro port, and every
decision Nathan should know about. Each item is marked **fixed**, **accepted** or **open for Nathan**.

## Setup

- **Lumos version.** `npm create lumos@latest` (installer `create-lumos` 0.3.9) downloads the newest
  Lumos for Astro, which is **1.0.4** (commit `43e4d52`, released 2026-11-14). The plan's assumption was
  right; `create-lumos`'s own number is only the installer's. Recorded in `package.json` under `lumos`.
- **Site address.** `SITE_URL` is `https://therocknetwork.com` (Nathan, 2026-11-17). The domain
  301-redirects today because it has no site yet; the redirect comes off when this site launches.
- **Meta description.** The old pages had none. The new default, in `src/consts.ts`, is built from Home's
  hero copy: "A New Testament Church Network. Multiplying disciples, leaders, churches, and movements."
  **Open for Nathan** if he wants different wording.
- **Lumos licence.** Lumos is MIT-licensed; its licence is kept as `LUMOS-LICENSE` so the site's own repo
  isn't relabelled MIT.

## Site shell (Task 3)

- **Header and footer.** Same links, copy, sizes and settings as before, compared at 390 and 1440 wide.
  **Fixed:** Lumos wraps paragraphs "pretty" and balances every heading; the old site wrapped normally
  except section titles. The tokens now match the old wrapping.
- **Skip link.** Lumos adds a "Skip to content" link that appears only when a keyboard user presses Tab.
  The old pages had none. Kept (accessibility); **open for Nathan** if he'd rather not.
- **404 page.** New: the old site had no 404 page of its own. It uses the site header and footer.
- **Footer globe, until Task 7.** The footer's background globe now points at `/embed/globe`, which is built
  in Task 7. Until then the frame shows the 404 page faintly behind the footer. Temporary.
- **Fonts.** Geist is now downloaded at build time and served from the site (Astro's font support), not
  fetched from Google Fonts on each visit. Same family and weights (300–700).

## Pages

### Groups: hero and What are Rock Network Groups? (Task 4)

- Compared at 390, 768 and 1440: same positions, sizes, colours and line breaks. **Fixed** on the way: Lumos
  trims text to its cap height and puts a small marker line before eyebrows; the old site did neither, so both
  are off (trim through the token, the marker as an opt-in Eyebrow variant).
- **Hero photo.** The old page in `../NetworkMultiply` now shows the group photo (`group-gathered.jpg`), but
  that change isn't committed on `main` yet; committed `main` still has the Unsplash photo, which the port
  uses. It will follow once it is committed.
- **Scroll-in animation:** back on in Task 5, with the Groups page script.

### Groups: Network Video, the group member's words, Meet the team, Adjust panel (Task 5)

- Compared at 390, 768 and 1440: same positions and sizes (within a pixel), the footer included.
- **Photos.** `../NetworkMultiply` currently swaps the hero and quote photos (uncommitted work). The port
  follows committed `main`: Unsplash behind the hero, the gathered group behind the quote.
- **Adjust panel:** same settings, `?controls=0`, Copy settings and Reset. The hint text and the copied
  block now name the new file locations (`public/scripts/…`). Choosing the Pins globe shows an empty frame
  until Task 7 builds `/embed/globe`.
- **Missing content (new behaviour):** with no weekly video the Network Video section is left out; with no
  team members, Meet the team is left out; a member without a photo shows the ring glyph.

### Home: hero, loading screen, globe and Adjust panel (Task 6)

- Compared at 390 and 1440: headline, buttons and globe in the same places. While the hero is Home's only
  section, the footer's curved edge attaches to it and lifts the headline about 38px; with the edge set to
  Flat it sits exactly where the old one did (measured: 315px from the top on both). This goes away when
  Task 7 adds the sections below.
- **Comment button gone** from the header (as planned), so the header links sit at the right edge.
- **Headline words** now come from the Home content (`src/content/pages/home.json`): the typed and rotating
  headline read the four words from the page instead of a list inside the script. Same words, same colors.
- **Scripts blocked** (d3, topojson or Lenis can't load): the loading screen still gives way after its
  built-in limit (about 10 seconds) and the page can be read, as on the old site. No change needed.
- The panel's links to the demos and the hint about where to paste settings name the new paths.

### Home: the remaining sections, /embed/globe, and the links between pages (Task 7)

- Compared section by section at 390, 768 and 1440: every section is the same height as before and lines up
  (measured: all eight sections equal at 390). The whole page at 1440 is the same height to the pixel.
- **Footer and header, Leadership link (not ported yet).** The old page in `../NetworkMultiply` has a
  Leadership link in the header and footer and a Leadership section in `groups.html`. That work isn't
  committed on `main` yet, so the port doesn't have it (the footer is 34px shorter at 390 for this reason).
  It will follow once it's committed.
- **`/embed/globe`** replaces `hero.html?embed=globe`: only the globe and its pins, no loading screen, and
  `noindex`. Groups' Pins globe and the footer's globe frame it, with their settings in the address as before.
  The footer globe now shows (it showed the 404 page faintly from Task 3 until now).
- **The Adjust panel's Page settings** (section spacing, corner radius, content width, body text size) still
  work: the Lumos tokens read the same variables the panel sets.
- **Find a hub** stays hidden unless turned on, as before.

## Ported from main after the plan was written

- **Rock Network photos on Home and the globe** (ported from main 6ce0d33): the globe's photo pins and the
  Gallery use the network's own photos (`public/assets/network-photos/globe/`, listed in
  `public/assets/network-globe-photos.js`), and What we do shows the house church photo (now content:
  `whatWeDo.photo`). The four Wix demos and the gallery engine are updated to match `main` byte for byte.
  Home and `/embed/globe` make the shared list's addresses absolute after loading it, so the embed (one folder
  down) finds the photos too.
- **Leadership page and Groups' Leadership section** (ported from main 5f3b046 and bbadf7e): `/leadership`
  with the orbit and the two lists; Groups' "Meet the team" becomes "Leadership" (four leaders as ring-dots and
  "See all our leaders"); a Leadership link in the header and footer; the Groups hero and quote photos swap.
  Hidden in production builds, shown locally and on previews, as on `main`. Leaders are now content
  (`src/content/leaders/`), listed by reference, which replaces the placeholder team entries.
  Compared at 390 and 1440: the headline, orbit and every list section sit where the old page had them. The
  Leadership hero now includes the header's height, because the shared header sits over the page (on the old
  Leadership page it was in the flow above it). **Fixed:** the orbit's hidden name tags made the new page scroll
  sideways at 390 and 768; the hero now clips them.
- **Groups' quote photo** ("Three friends laughing around a table") is now a local copy of the Unsplash photo
  `main` uses, so Astro can size it like the other content images.
- Comment mode on Groups and Leadership (main d98a379) is not ported: comment mode stays at tag `pre-astro`.
- **How we do it hover photos and the footer globe** (ported from main cc651fc): the four How we do it rows show
  the network's own photos on hover; the footer's globe loads once in idle time after the page loads and replays
  its growth each time the footer comes back into view (instead of reloading), at 1x pixel density; the globe
  reuses its network layout on replay.
- **Homepage copy, group photo and footer** (ported from main 722c2bf): Jesus Disciple gains "Are you a Pastor?"
  and bold row titles, the University banner and the How we got started steps have new copy, What we do shows the
  smiling Iglesia Mi Ciudad group, and the footer's social links are hidden.

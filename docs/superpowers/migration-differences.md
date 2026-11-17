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

(Filled in section by section from Task 4 on.)

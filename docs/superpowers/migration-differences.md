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

## Pages

(Filled in section by section from Task 3 on.)

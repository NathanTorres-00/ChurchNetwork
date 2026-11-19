# The Rock Network site

This folder is the live site: Astro + Lumos on branch `main`. It replaced the old static HTML site on
2026-11-19. Read `AGENTS.md` and `LUMOS.md` before changing components.

## Hosting: Cloudflare

- **Production:** Worker `the-rock-network` serves `therocknetwork.com`, and `www` redirects to it
  (`worker/index.js`). Config is in `wrangler.jsonc`.
- **Old addresses:** `public/_redirects` keeps old links working (`/hero.html`, `/groups.html`,
  `/leadership.html`, `/hero`), and URLs drop the trailing slash.
- **Deploy:** run `npm run deploy` (build, then `wrangler deploy`). Once the GitHub repo is connected in
  the Cloudflare dashboard (Workers Builds), every push to `main` deploys.
- **Preview:** run `npm run deploy:preview`, which deploys to `rock-network-preview.tr-playground.workers.dev`.
- **Vercel is retired.** GitHub was disconnected on 2026-11-19, so pushes no longer build there. The last
  Vercel deploy stays up as a fallback. `vercel.json` is unused.
- **Before you push:** pushing `main` publishes the site once Workers Builds is connected. Ask Nathan
  first.

## Working here

- **Dev server:** `npm run dev`, on port 4321.
- **Checks:** `npm run check`, then `npm test` (Vitest), then `npx playwright test`. If a dev server already
  holds port 4321, run the browser tests with `E2E_PORT=4329`.
- **Content:** `src/content/`. Sections are in `src/components/`. Each change and accepted difference from
  the old site is listed in `docs/superpowers/migration-differences.md`.
- **Not ported:** Comment mode, the Versions panel and Convex. They live on tag `pre-astro` and in the
  history before `dc5b9f5`.
- **Interaction lab:** the old `interaction-lab.html` is on the local-only branch `interaction-lab-local`.
  It's due to be ported into Astro. Don't push that branch.
- **Keep out of the repo:** the loose media in this folder (thumbnail PNGs, the mp4, `Vision & How-To
  English/`, `NetworkPhotos/`, `Leadership/`).
- **Commits:** end each message with a `Version:` line.

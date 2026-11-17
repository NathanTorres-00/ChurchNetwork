# Astro and Lumos Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home and Groups as Astro pages made of Lumos components, looking and behaving as they do today, with admin-editable content held in content collections.

**Architecture:** A Lumos scaffold is merged into the repo root on the `AstroMigrate` branch. Each page section becomes a component that takes its content as props from Astro content collections. The existing page scripts (globe, loader, Adjust panels) move over as classic scripts, split only at their existing `<script>` boundaries, so behavior does not change.

**Tech Stack:** Astro 7, Lumos for Astro 1.0.4 (`npm create lumos@latest`), plain CSS with Lumos tokens, Playwright, Vitest. Node >= 22.23.4.

**Spec:** `docs/superpowers/specs/2026-11-15-astro-lumos-migration-design.md`. Read it and `LUMOS.md` (arrives with the scaffold in Task 1) before any task.

## Global Constraints

- **Nothing is pushed or deployed.** No `git push`, no `vercel` commands, no Vercel MCP writes. Pushing the branch would make Vercel build a preview. All checks run locally. (Nathan, 2026-11-15.)
- All work is on branch `AstroMigrate`, checked out in its own folder `../NetworkMultiply-astro` (a git worktree). `main` lives in `../NetworkMultiply` and is never changed from this folder. Tag `pre-astro` already exists (set 2026-11-17 at `4313c39`).
- Comment mode, the Versions panel and Convex do not move. No Sanity dependency.
- No redesign, new section or new copy. Links marked `data-placeholder` and the newsletter form stay as they are.
- The globe's behavior must not change. Scripts move verbatim; the only edits allowed are removing comment-mode and Versions hooks, and updating paths and URLs.
- `public/network-multiply.html`, `network-globe.html`, `network-globe-pins.html`, `network-gallery.html` stay byte-identical to `main`.
- Follow `LUMOS.md`: compose pages from library components; a custom component only when it owns CSS or a script; custom components in `src/components/content/` or `src/components/section/`; root class ends in `_wrap`, children prefixed with the family name; styles in the component's `<style is:global>` under `@layer components`; no `px` (convert `px / 16` to `rem`); `render` prop on every component.
- Exception to Lumos naming: a class or id that a moved script reads keeps its current name. Find them by searching the script for the selector before renaming anything.
- Lumos token names in `src/styles/base.css` are kept; only values change.
- Admin-editable content (weekly video, team, group stories, page copy, footer text) is never hard-coded in a component. It comes from the collections in Task 2.
- Fidelity bar: no difference a visitor would notice at 390, 768 and 1440 wide. Every other difference goes in `docs/superpowers/migration-differences.md` for Nathan.
- Commit after every task, messages in the repo's style (`Area: what changed`). No `Version:` line is needed on this branch.

Corrections to the spec found while planning: the scaffold is Lumos 1.0.4, not 1.0.3; class naming follows `LUMOS.md` (`family_wrap`, `family_child`); checks use a local preview, not a Vercel preview; the branch is `AstroMigrate` in its own worktree, and the old site for comparison is served from the `../NetworkMultiply` folder (no separate legacy worktree); `transition.spec.js` and `phone.spec.js` test comment mode and are deleted, not ported.

## Review Focus

1. **Old addresses.** A visitor with a bookmark to `/hero`, `/hero.html`, `/groups.html` or `/hero.html#app` expects to land on the right page and section. (Task 8)
2. **Stale saved settings.** A browser holding Adjust-panel choices from the old site, or garbage in those `localStorage` keys, expects the page to load with defaults and no errors. (Tasks 5 and 6)
3. **Scripts that don't arrive.** If the CDN scripts (d3, topojson, Lenis) are blocked, the visitor expects to read the page: the loading screen must not trap it. (Task 6)
4. **Missing content.** A team member with no photo shows the placeholder glyph, not a broken image; an empty team list or a missing weekly video omits that section. (Task 5)
5. **Phone width.** At 390 wide neither page scrolls sideways. (Tasks 5 and 7)

## File Structure

```
astro.config.mjs            Geist font, site URL, sitemap
vercel.json                 cleanUrls and redirects only (not deployed in this plan)
playwright.config.js        builds, then tests against `astro preview` on 4321
tools/compare.mjs           side-by-side screenshots: old site vs new
public/
  network-*.html            the four standalone demos, unchanged
  assets/                   files the demos or moved scripts load by path
  scripts/home-*.js         Home's scripts, one file per original <script> block
  scripts/groups-*.js       Groups' scripts, same rule
  scripts/site-footer.js, page-transition.js
src/
  content.config.ts         the five collections
  content/                  their data (JSON)
  assets/images/            images used from markup
  styles/base.css           Lumos tokens with the site's values
  layouts/BaseLayout.astro  head, SiteHeader, slot, SiteFooter
  components/global/        SiteHeader.astro, SiteFooter.astro (replace Lumos Nav and Footer)
  components/section/       one component per section that owns CSS or script
  components/content/       smaller custom blocks (cards, team member, quote)
  components/utility/       AdjustPanel*.astro, Loader.astro
  pages/index.astro, groups.astro, embed/globe.astro, 404.astro
tests/e2e/                  home, groups, gallery, hero-gallery, hubs, intro-video, stats, site
tests/unit/                 gallery-geometry, content, redirects
```

---

### Task 1: Tag, branch, scaffold, and a site that builds

**Files:**
- Create: everything the scaffold brings (`src/`, `public/`, `.agents/`, `.claude/skills/`, `astro.config.mjs`, `tsconfig.json`, `AGENTS.md`, `LUMOS.md`), `tools/compare.mjs`, `tests/e2e/site.spec.js`
- Modify: `package.json`, `.gitignore`, `playwright.config.js`, `vitest.config.js`, `vercel.json`, `tests/e2e/helpers.js`, `tests/e2e/gallery.spec.js`
- Move: `network-*.html` to `public/`; `assets/network-gallery.js` to `public/assets/`
- Delete: `review/`, `versions/`, `versions.json`, `convex/`, `scripts/`; specs `drawing-render`, `hardening`, `marker-touch`, `marker`, `marks`, `phone`, `shell`, `stroke-anchor`, `transition`, `versions`, `voice`; every file in `tests/unit/` except `gallery-geometry.test.js`
- Keep for now: `hero.html`, `groups.html`, `assets/` at the root, as the source being ported (not served by Astro)

**Interfaces:**
- Produces: `npm run dev|build|preview|check|test|test:e2e`; old site at `http://127.0.0.1:8792/hero.html`; new site at `http://127.0.0.1:4321/`; `openPage(page, path = '/')` in `tests/e2e/helpers.js`; `node tools/compare.mjs --old <path> --new <path> [--selector <css>]`.

- [x] **Step 1: Tag and branch** (done 2026-11-17: tag `pre-astro` at `4313c39`; branch `AstroMigrate` in worktree `../NetworkMultiply-astro`)

The old site is served for comparison with `python3 -m http.server 8792 --bind 127.0.0.1` run inside `../NetworkMultiply` (the `main` folder; read-only from here). It may hold uncommitted work in progress; that is fine for comparison.

- [ ] **Step 2: Scaffold Lumos in a temporary folder and merge it into the repo root**

Run `npm create lumos@latest lumos-tmp` outside the repo. Check the version you actually got: npm lists `create-lumos` at 0.3.9 while the plan assumed Lumos 1.0.4 (the 1.0.4 may be the template's own version). Record what you find in the differences file; stop and ask Nathan only if the scaffold doesn't look like Lumos for Astro. Copy in the files listed under Create. Merge `package.json`: name stays `church-network`; take the scaffold's `scripts`, `dependencies`, `devDependencies`, `engines` and `lumos` block; keep `@playwright/test`, `vitest`, `jsdom`; keep scripts `test` and `test:e2e`; remove `convex`, `convex-test`, `@edge-runtime/vm`, `dev:config`. The repo already has a `.claude/` folder: add `skills/` to it, leave the rest. Add `.astro/` to `.gitignore`. Delete `src/pages/example-components.astro`. Run `npm install`.

- [ ] **Step 3: Moves and deletions** as listed under Files. In `public/network-gallery.html`, the script path `assets/network-gallery.js` still resolves; confirm it.

- [ ] **Step 4: Config**

- `src/consts.ts`: `SITE_NAME = "The Rock Network"`, description from `hero.html`'s meta description, `SITE_URL` is the production domain. Ask Nathan for it; until he answers use `https://example.com` and list it as open in the differences file.
- `vercel.json`: `{ "cleanUrls": true, "redirects": [{ "source": "/hero", "destination": "/", "permanent": true }] }`.
- `playwright.config.js`: `PORT = 4321`; `webServer.command = 'npm run build && npm run preview -- --port 4321 --host 127.0.0.1'`; `url` is the root; keep workers, viewport and timeouts; drop the fake media-stream launch args.
- `vitest.config.js`: `include: ['tests/unit/**/*.test.js']`, no `convex-test` inline.
- `tests/e2e/helpers.js`: keep `openPage` (default path `/`, still waits for `page:revealed`) and `intersects`; remove the fake store, `enterCommentMode`, `tool`.

- [ ] **Step 5: Write the failing smoke test** in `tests/e2e/site.spec.js`

```js
test('the site builds and serves Home', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
});
for (const demo of ['network-multiply', 'network-globe', 'network-globe-pins', 'network-gallery']) {
  test(`${demo} still loads as a standalone file with no errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/${demo}.html`);
    await expect(page.locator('canvas').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
```

Point `gallery.spec.js` at `/network-gallery.html` under the new server.

- [ ] **Step 6: Run** `npm run test:e2e -- site gallery` and `npm test`. Expected: PASS. `git diff pre-astro --stat -- public/network-*.html` shows renames with no content change.

- [ ] **Step 7: Write `tools/compare.mjs`**

`node tools/compare.mjs --old /groups.html --new /groups [--selector '#what']` screenshots the old site (port 8792) and the new (port 4321) at widths 390, 768 and 1440, full page or the selector, with `?controls=0` added, into `test-results/compare/<name>-<width>-old.png` and `-new.png`. It waits for `page:revealed` when the page fires it, else for `load`.

- [ ] **Step 8: Commit** `Astro: Lumos scaffold on the AstroMigrate branch; comment mode, Versions and Convex removed`

---

### Task 2: Content collections

**Files:**
- Create: `src/content.config.ts`, `src/content/weekly-video.json`, `src/content/team/*.json`, `src/content/group-stories/*.json`, `src/content/pages/home.json`, `src/content/pages/groups.json`, `src/content/footer.json`, `src/assets/images/*`, `tests/unit/content.test.js`

**Interfaces:**
- Produces these collections (ids in quotes are the entry ids later tasks call with `getEntry`):

| Collection | Entries | Schema |
|---|---|---|
| `weeklyVideo` | `"current"` | `youtubeId: string`, `title: string` |
| `teamMembers` | one file each | `name: string`, `role: string`, `photo: image().optional()`, `order: number` |
| `groupStories` | `"anastasia"` (Home), `"church-group-member"` (Groups) | `quote: string`, `name: string().optional()`, `attribution: string`, `photo: image().optional()` |
| `homePage` | `"home"` | one object per section, keyed by the section's id |
| `groupsPage` | `"groups"` | one object per section, keyed by the section's id |
| `footer` | `"footer"` | `tagline`, `social: {label, href}[]`, `newsletter: {label, placeholder, button, notice}`, `columns: {label, links: {label, href, placeholder: boolean}[]}[]`, `copyright` |

- Page-copy rule: inside a section object, fields are named `heading`, `lead`, `body`, `items` (array of `{heading, body}` plus what the section needs), `buttons` (array of `{label, href, placeholder}`). Schemas are explicit Zod objects, not `z.record`, so Stacki's CMS panel and later Sanity get real fields. Text that contains markup today (`&nbsp;`, line breaks) is stored as plain text with the character itself.

- [ ] **Step 1: Write the failing test** `tests/unit/content.test.js`: reads the JSON files directly and asserts `weekly-video.json` has `youtubeId === 'qo52gy0Gq74'`; the team folder has 4 entries with distinct `order`; `group-stories` has `anastasia` and `church-group-member`; every heading in `groups.html` (`Church Groups`, `What are Rock Network Groups?`, `Discipleship Groups`, `Network Video`, `Meet the team`) appears in `pages/groups.json`; every `<h2 class="section-title">` text in `hero.html` appears in `pages/home.json`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL, files missing.
- [ ] **Step 3: Write the config and data.** Copy every piece of copy from `hero.html` and `groups.html` exactly. Images used from markup (`anastasia.jpg`, `group-gathered.jpg`, `jesus-disciple-logo.png`, `jdu-banner.jpg` and `jdu-banner-1200.jpg` (keep the `srcset`), and the rest referenced by `<img>` or CSS backgrounds in the two pages) are copied to `src/assets/images/` and referenced with `image()`.
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: PASS; the build validates every entry against its schema.
- [ ] **Step 5: Commit** `Content: collections for the weekly video, team, group stories, page copy and footer`

---

### Task 3: Tokens and the site shell

**Files:**
- Modify: `src/styles/base.css`, `astro.config.mjs`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/404.astro`
- Create: `src/components/global/SiteHeader.astro`, `src/components/global/SiteFooter.astro`, `public/scripts/site-footer.js`, `public/scripts/page-transition.js`, `src/pages/groups.astro` (layout only), `public/assets/the-rock-network-large.png`
- Delete: `src/components/global/Nav.astro`, `NavLink.astro`, `Footer.astro` if nothing else uses them
- Test: `tests/e2e/site.spec.js`

**Interfaces:**
- Consumes: `footer` collection.
- Produces: `BaseLayout` props `title`, `description`, `page: 'home' | 'groups' | 'embed'`, and slots `head`, default, `after` (for Adjust panels and page scripts, placed after the footer). `SiteHeader` prop `page`. `window.rnFooter` and the page-transition API exactly as `assets/site-footer.js` and `assets/page-transition.js` expose them today.

- [ ] **Step 1: Write the failing tests** in `site.spec.js`: on `/` and `/groups` the header shows the same nav links, in the same order, as the old pages; the footer shows the tagline, the three column labels (`Explore`, `Connect`, `Policy`) and the wordmark image; clicking a `data-placeholder` link does not navigate; computed `font-family` of `body` starts with `Geist`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Tokens.** In `base.css` set the swatches, `--primary-family` (Geist, weights 300 to 700, through Astro's `fonts` config with `cssVariable: "--font-geist"`), heading and text sizes (`-min` at the old site's 390 size, `-max` at its 1440 size), radii (24px corners become `1.5rem`), spacing and section space, all read from the `:root` rules and section styles of `hero.html` and `groups.html`. Remove the Inter font file and config.
- [ ] **Step 4: Shell.** Build `SiteHeader` and `SiteFooter` from the markup both old pages share; footer text from the `footer` collection. `assets/site-footer.css` and `page-transition.css` become component styles (rem, `@layer components`); their scripts move to `public/scripts/` verbatim and load as classic scripts in the same position as today. Exception: `site-footer.js` builds its own globe embed address (`'hero.html?' + q` in `animUrl()`, with `embed=globe` and about a dozen colour settings); change only that path to `/embed/globe?` + the same settings. The footer globe stays empty until Task 7 builds `/embed/globe`. Header links use `/` and `/groups` (and `/#app` style anchors) in place of `hero.html` and `groups.html`.
- [ ] **Step 5: Run** the tests. Expected: PASS. Run `node tools/compare.mjs --old /groups.html --new /groups --selector '.site-footer'` and compare by eye; fix or record differences.
- [ ] **Step 6: Commit** `Shell: the site's tokens in Lumos, shared header and footer, page transition`

---

### Task 4: Groups, first two sections, then Nathan's Stacki check

**Files:**
- Modify: `src/pages/groups.astro`
- Create: `src/components/section/GroupsHero.astro`, `src/components/content/GroupCard.astro` (only if the cards need CSS the Lumos `Card` variants can't give)
- Test: `tests/e2e/groups.spec.js`

**Interfaces:**
- Consumes: `groupsPage` entry sections `top` and `what`.
- Produces: `GroupsHero` props `heading`, `tagline`, `buttons`, `photo`. It keeps the ids and classes `groups.html`'s script reads (`#top`, `.groups-hero` and its children) and the `data-enter` / `--i` attributes the page-load animation uses.

- [ ] **Step 1: Rewrite the test** `the Groups page has its sections in order and no errors` for `/groups`, asserting for now `#top` then `#what`, the `h1` text `Church Groups`, the two card headings, and no page errors.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Build the hero** (Photo art, Full width shape with the curved bottom, the defaults in `groups.html`'s CONFIG) and **What are Rock Network Groups?** from `Section`, `ContentWrapper`, `Heading`, `Paragraph`, `Grid`, `Card`, `Button`, `ButtonWrapper`. No Adjust panel yet; CONFIG defaults are applied as static values.
- [ ] **Step 4: Run** the test and `node tools/compare.mjs --old /groups.html --new /groups --selector '#top'` and `'#what'`. Expected: PASS, and no visible difference at the three widths.
- [ ] **Step 5: Commit** `Groups: hero and What are Rock Network Groups? as Lumos components`
- [ ] **Step 6: STOP for Nathan.** Ask him to open the project folder in Stacki and confirm he can select the two sections, edit a heading, and see the `groupsPage` entry in the CMS panel. Do not start Task 5 until he answers. If sections open as code only, bring what Stacki shows back to him before changing the pattern.

---

### Task 5: Rest of Groups and its Adjust panel

**Files:**
- Modify: `src/pages/groups.astro`
- Create: `src/components/section/NetworkVideo.astro`, `src/components/content/GroupStory.astro`, `src/components/content/TeamMember.astro`, `src/components/utility/AdjustPanelGroups.astro`, `public/scripts/groups-config.js`, `public/scripts/groups-panel.js`, `public/scripts/groups-page.js`, `tests/unit/sections.test.js`
- Test: `tests/e2e/groups.spec.js`

**Interfaces:**
- Consumes: `weeklyVideo`, `groupStories` (`church-group-member`), `teamMembers` sorted by `order`, `groupsPage`.
- Produces: `NetworkVideo` props `heading`, `youtubeId`, `title` (renders `#network-video` with `data-youtube` and `data-title`, as the script expects); `GroupStory` props `quote`, `name`, `attribution`, `photo` (also used on Home in Task 7); `TeamMember` props `name`, `role`, `photo`. The three script files are `groups.html`'s three inline `<script>` blocks in order: CONFIG ("Settings: the Adjust panel changes these"), the panel and hero art ("Hero art: the Pins globe loads…"), and the Network Video ("Network Video: the YouTube thumbnail…"). Find them by those comments, not line numbers.

- [ ] **Step 1: Write the failing tests.** Port from the old `groups.spec.js`: `the Network Video shows its YouTube thumbnail and plays in place`; `page load style and the page transition come from the panel`; `Full width ends in the Home hero arc, set from Bottom curve`; the full section order (`#top`, `#what`, `#video`, `#story`, `#team`). Add:

```js
test('garbage in saved settings falls back to defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rn-footer', '{not json'); localStorage.setItem('rn-transition', 'banana');
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/groups');
  await expect(page.locator('h1')).toHaveText('Church Groups');
  expect(errors).toEqual([]);
});
test('Groups does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/groups');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
```

Use the real `localStorage` key names from `site-footer.js` and `page-transition.js` in place of the two shown.

In `tests/unit/sections.test.js`, with Astro's container API (`experimental_AstroContainer`): `TeamMember` with no `photo` renders the `.glyph` placeholder and no `<img>`; `NetworkVideo` with `render={false}` or an empty `youtubeId` renders an empty string.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Build** the three sections and the panel. The team list is omitted when `teamMembers` is empty. The panel markup moves into `AdjustPanelGroups.astro`; `?controls=0` still hides it. The Hero > Art > Pins globe option points its frame at `/embed/globe` (the page arrives in Task 7; until then the option shows an empty frame).
- [ ] **Step 4: Run** the tests, then `node tools/compare.mjs --old /groups.html --new /groups`. Expected: PASS; differences fixed or recorded.
- [ ] **Step 5: Commit** `Groups: Network Video, group story, team and the Adjust panel`

---

### Task 6: Home hero, loader, globe and Adjust panel

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/components/section/HomeHero.astro`, `src/components/utility/Loader.astro`, `src/components/utility/AdjustPanelHome.astro`, one file in `public/scripts/` per inline `<script>` block of `hero.html`, found by its opening comment, not by line number (lines drift as `main` changes). As of `4313c39` they are, in order: `home-embed-settings.js` (head, "Embedded as the Groups hero's or the site footer's globe…", restores settings from the `rn-embed:` frame name), `home-boot.js` (loading screen and the `?embed=globe` switch), the comment-mode loader (deleted, not moved), `home-lenis.js` (smooth scrolling), `home-main.js` (CONFIG through the panel and the globe), `home-hubs.js`, `home-jd-carousels.js`, `home-stats.js`, `home-welcome-video.js`, and the Versions module (deleted, not moved)
- Test: `tests/e2e/home.spec.js`, `tests/e2e/hero-gallery.spec.js`

**Interfaces:**
- Consumes: `homePage` section `top`; `BaseLayout` slots `head` and `after`.
- Produces: `/` with the hero, the loading screen and the full Adjust panel; the `page:revealed` event; `window.rnHeroTextRects` handling as today. Later Home sections (Task 7) rely on the scripts already being loaded and on their ids being unchanged.

- [ ] **Step 1: Write the failing tests.** Port `hero-gallery.spec.js` to `/` (drop `comment mode holds the gallery still`). In `home.spec.js`:

```js
test('Home opens: loader, then the headline and the globe', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await openPage(page, '/');
  await expect(page.locator('.hero-title')).toHaveAttribute('aria-label', 'Multiplying disciples, leaders, churches, and movements');
  await expect(page.locator('.hero canvas').first()).toBeVisible();
  await expect(page.locator('#comment-toggle')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('if the CDN scripts are blocked the page can still be read', async ({ page }) => {
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, r => r.abort());
  await page.goto('/');
  await expect(page.locator('.hero-lead')).toBeVisible({ timeout: 15_000 });
});
test('garbage in saved settings falls back to defaults', ...)   // as in Task 5, on '/'
test('reduced motion shows the page without the loader animation', ...)  // emulateMedia reducedMotion, headline visible
test('?controls=0 hides the Adjust panel', ...)
```

If the CDN test fails on the old site too, the loader gets a timeout that reveals the page; record that as a deliberate behavior fix in the differences file.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Move the scripts.** d3, d3-geo-projection, topojson and Lenis stay on their CDN tags, in the `head` slot, same versions. Each `<script>` block becomes one file in `public/scripts/`, loaded as a classic script (`<script is:inline src>`) in the original order. Remove: the comment-mode loader (the block starting "Comment mode lives in review/"), the Comment button and its styles, the `versions:view` / `versions:current` holds, and the Versions module (the `<script type="module">` importing `versions-panel.js`). Replace `groups.html` and `hero.html` in URLs with `/groups` and `/`. Gallery art loads `/assets/network-gallery.js`.
- [ ] **Step 4: Build `HomeHero`, `Loader` and the panel** from the existing markup. Classes the scripts read keep their names. Hero copy comes from `homePage.top`.
- [ ] **Step 5: Run** the tests and `node tools/compare.mjs --old /hero.html --new / --selector '.hero'`. Expected: PASS.
- [ ] **Step 6: Commit** `Home: hero, loading screen, globe and Adjust panel on Astro`

---

### Task 7: Home's remaining sections, the globe embed, and the links between pages

**Files:**
- Modify: `src/pages/index.astro`, `src/components/utility/AdjustPanelGroups.astro` if needed
- Create: one component per Home section that owns CSS or script, in `src/components/section/` or `content/`: church network (with the welcome video), What we do (stats), How we do it, Jesus Disciple (video rows and the University banner), Find a hub, How we got started; `src/pages/embed/globe.astro`; `public/assets/` for files scripts load by path (welcome video, reel thumbnails)
- Test: `tests/e2e/home.spec.js`, `hubs.spec.js`, `stats.spec.js`, `intro-video.spec.js`, `groups.spec.js`

**Interfaces:**
- Consumes: `homePage` (all sections), `groupStories` `anastasia` through `GroupStory` from Task 5, the scripts from Task 6.
- Produces: `/embed/globe`, which shows what `hero.html?embed=globe` shows (globe and pins only, no loader, header, copy or footer) and is `noindex`. Hubs and the video reels keep their data in code.

- [ ] **Step 1: Write the failing tests.** Port `hubs.spec.js` (including the Jesus Disciple wordmark heading and the Jesus Disciple University banner checks added in `1fca79f`), `stats.spec.js` (7,088 disciples, 1,559 groups, 25 missions workers, 3 subnetworks) and `intro-video.spec.js` to `/`. Port the remaining old `groups.spec.js` tests: `Start a group on the home page opens the Groups page`; `the Adjust panel switches the hero to the Pins globe and back` (frame `src` is `/embed/globe`); `arriving at Home from Groups skips the loading screen`; `footer logo can be clipped from the panel, and Home keeps the choice`. Add to `home.spec.js`: the section order matches `hero.html` on `main` (`#top`, `#church-network`, `#what-we-do`, `#how`, `#testimony`, `#app`, `#hubs`, `#story`); Home does not scroll sideways at 390; `/embed/globe` shows a canvas and no `.site-header`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Build each section,** one at a time, running `tools/compare.mjs` with the section's selector after each. Use library components wherever the section needs no script or custom CSS.
- [ ] **Step 4: Build `/embed/globe`** by rendering the Home hero with the embed class set at build time in place of the `?embed=globe` check; add `/embed` to `NOINDEX_ROUTES`. Two pages frame it and pass settings in the address: Groups (`heroArt`, `showPins`, `controls`, `smoothScroll`) and the site footer (`dpr` and about a dozen colours). Every setting other than `embed` must still be read from the address at runtime, and `home-embed-settings.js` (the `rn-embed:` frame-name fallback) must load first on this page too. Test both: the Groups Pins hero and the footer globe each show a canvas inside their frame, and the footer globe takes the footer's colours.
- [ ] **Step 5: Run** the whole suite: `npm run test:e2e` and `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `Home: all sections on Astro; the globe embed has its own page`

---

### Task 8: Clean up, old addresses, README, and the full check

**Files:**
- Delete: `hero.html`, `groups.html`, root `assets/` (after confirming nothing loads from it), any Lumos component and icon nothing imports (run a search before each)
- Modify: `vercel.json`, `README.md`, `docs/superpowers/specs/2026-11-15-astro-lumos-migration-design.md` (the corrections listed under Global Constraints)
- Create: `tests/unit/redirects.test.js`, `docs/superpowers/migration-differences.md`

- [ ] **Step 1: Write the failing test** `tests/unit/redirects.test.js`: `vercel.json` has `cleanUrls: true` and no `buildCommand`; its redirects send `/hero` to `/` (with `cleanUrls`, `/hero.html` and `/groups.html` reach `/hero` and `/groups` first). In `home.spec.js`: `/#app` scrolls the Jesus Disciple section into view; a search of `dist/` after build finds no `hero.html`, `groups.html`, `review/` or `versions/` in any built page or script.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Delete, update `vercel.json`, rewrite the README** for the new structure: how to run it, where content lives, how to change the weekly video, the Adjust panels, the standalone demos and Wix steps (kept), and that comment mode lives at tag `pre-astro`.
- [ ] **Step 4: Full pass.** `npm run check`, `npm run build`, `npm test`, `npm run test:e2e`, then `node tools/compare.mjs` for both pages. Finish `migration-differences.md`: every visible or behavioral difference, each marked fixed, or open for Nathan with the two screenshots' paths.
- [ ] **Step 5: Commit** `Astro: old pages removed, redirects, README; migration differences listed`
- [ ] **Step 6: Hand back to Nathan.** Report test results as they are, the differences file, and how to see it (`npm run dev`, then open the folder in Stacki). Do not push, merge or deploy. Leave this folder (`../NetworkMultiply-astro`) in place; Nathan decides when to merge and remove it.

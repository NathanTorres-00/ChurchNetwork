# Move the site to Astro and Lumos: design

Date: 2026-11-15. Status: approved by Nathan, 2026-11-15.

This is project 1 of 2. Project 2 (connect Sanity) gets its own design once this one ships.

## Intent

Nathan wants two things the hand-written site can't give him:

1. To design and refine the site visually in **Stacki**, a desktop editor that opens an Astro project and
   writes edits back into its `.astro` files.
2. To give **CMS admins an easy way to edit content** through a Sanity backend: the weekly video, team
   members, group photos and quotes, and site copy.

Both need the pages to be Astro components with clear content fields. This project gets the site there.
Lumos is the component and styling system the pages are rebuilt in; it is by Stacki's author and built to
fit it.

## Goals

- Home and Groups run on Astro, built from Lumos components, tokens and utility classes.
- The site looks and behaves as it does today (see Fidelity).
- Stacki opens the project, and the page sections can be selected and edited visually.
- Every piece of content an admin will later edit is already a named field, held in one place, so project 2
  swaps the source to Sanity without touching page markup.
- The live site is untouched until the branch is approved and merged.

## Non-goals

- Sanity itself: no Studio, no schemas, no Sanity dependency in this project.
- Comment mode and the Versions panel. They do not move. (Nathan's decision.)
- Any redesign, new section or new copy.
- Connecting the newsletter form or building the links marked `data-placeholder`. They stay as they are.

## Anti-goals

- A visible redesign by accident: Lumos defaults (its type scale, spacing, brand green) showing through.
- Rewriting the globe. Its behavior must not change.
- Breaking the Wix embed files, which must remain single paste-able HTML files.
- Admin-editable content left hard-coded inside component markup.

## Where things stand today

- `hero.html` (Home, about 3,450 lines) and `groups.html` (about 800) each hold their own CSS, script,
  `CONFIG` block and Adjust panel. Shared: `assets/page-transition.*`, `assets/site-footer.*`.
- Home sections, in order (as of commit f7525a1): hero (Pins globe, loader, typed headline), What is a New
  Testament Church Network, What we do, How we do it, testimony, Jesus Disciple (video rows and the
  Jesus Disciple University banner), Find a hub (hidden by default), How we got started, footer. The port
  follows whatever `main` holds when each section is rebuilt.
- Groups sections: hero (photo or Pins globe), What are Rock Network Groups? (two cards), Network Video
  (YouTube), group story (quote over photo), Meet the team, footer.
- Groups shows Home's globe through a frame: `hero.html?embed=globe`.
- `network-multiply.html`, `network-globe.html`, `network-globe-pins.html`, `network-gallery.html` are
  standalone demos, pasted whole into Wix embeds.
- Comment mode (`review/`), the Versions panel (`versions/`, `versions.json`, `scripts/versions.js`) and
  Convex (`convex/`, used only by comment mode) sit around the pages. The Vercel build runs through
  `npx convex deploy`.
- Tests: 18 Playwright specs and some Vitest unit tests. Most cover comment mode, the marker or Versions.

## Approaches considered

1. **Rebuild section by section in Lumos, on a branch of this repo. (Chosen by Nathan.)** One pass over
   each section gives both Stacki-editable markup and Sanity-ready fields. The live site stays up; the
   cutover is one merge. Slowest route to a first full page.
2. **Lift the HTML into Astro as-is, convert later.** On Astro in a day, but unconverted sections show in
   Stacki as code and give Sanity nothing clean to fill. The work is done twice.
3. **Fresh project in a new repo.** Same rebuild, started clean. Costs a second Vercel project, a domain
   move, and a split history.

## The design

### Project

- Branch `astro-lumos` off `main`, after the uncommitted work on `main` is committed (the port copies
  from it).
- Scaffold with `npm create lumos@latest` (Lumos 1.0.3) and bring its structure into the repo root:
  `src/pages`, `src/components`, `src/layouts`, `src/styles`, `src/assets`, `public/`, `.agents/skills`.
- Static output. Vercel builds with `astro build`; `vercel.json` drops the Convex deploy command.

### Look: Lumos tokens set to the current site

- `src/styles/base.css` keeps Lumos's token names and takes the site's values: Geist, the four headline
  colors, the gray surfaces, 24px corners, pill buttons, current spacing and type sizes.
- New classes follow Lumos naming (`block_element`), and Lumos utilities replace one-off rules where they
  match.

### Pages and URLs

| URL | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | Home. `/hero` redirects here. |
| `/groups` | `src/pages/groups.astro` | Groups. |
| `/embed/globe` | `src/pages/embed/globe.astro` | Replaces `hero.html?embed=globe`; Groups frames this. |
| `/network-multiply`, `/network-globe`, `/network-globe-pins`, `/network-gallery` | `public/*.html` | Unchanged files, same URLs. |

### Components

- A shared layout holds the head, header, footer and page transition.
- Each page section becomes one component that takes its content as props. Lumos components (Section,
  Heading, Paragraph, Button, Card, Grid, Img, Video, Nav, Footer) are used wherever one fits.
- **Globe, loader, typed headline, video reels, hubs:** the existing script moves into components
  unchanged in behavior. Stacki shows these as code beside a live preview; that is expected.
- **Adjust panels** stay on Home and Groups with the same settings, `?controls=0`, and Copy settings.
  Their saved choices in the browser keep working.
- Removed from the pages: the Comment button, comment-mode loader, Versions pill and their hooks.

### Content: fields now, Sanity later

Content lives in Astro content collections as local data files, declared in `src/content.config.ts`.
Stacki's CMS panel can edit these today. Project 2 replaces the file source with Sanity and keeps the
shapes.

| Collection | Fields |
|---|---|
| `weeklyVideo` (one entry) | YouTube ID, title |
| `teamMembers` | name, role, photo, order |
| `groupStories` | photo, quote, attribution |
| `pages` (home, groups) | every headline, tagline, paragraph, card text and button label, grouped by section |
| `footer` (one entry) | tagline, link labels, newsletter text |

Home's testimony (Anastasia) is an entry in `groupStories`. Hubs and the video reels stay in code for
now; Nathan did not list them for admins.

### What is deleted on the branch

`review/`, `versions/`, `versions.json`, `convex/`, `scripts/`, the `convex` dependency, and the tests
that cover them. They remain in `main`'s history. The last commit on `main` before the branch is cut is
tagged `pre-astro`, so the comment mode code can be pulled back at any time
(`git checkout pre-astro -- review convex`). The Convex deployment in the cloud is left alone.

### Fidelity and how it is checked

- Each section is compared with the live site by side-by-side screenshots at 390, 768 and 1440 wide.
- The bar: no difference a visitor would notice at those widths. Between them, small differences from
  Lumos's fluid sizing are acceptable. Any other difference is listed for Nathan to accept or reject.
- Behavior checks: loader plays only when arriving from outside the site, page transitions between Home
  and Groups, globe pins and hover, Groups hero art switch, video plays on click, footer reveal, reduced
  motion.

### Tests

- Playwright specs for page behavior (Home, Groups, gallery, hubs, transition, phone, intro video) are
  ported to the new URLs and markup.
- Specs and unit tests for comment mode, marker, marks, voice and Versions are deleted.
- `npm run check` (Astro's checker, from Lumos) passes.

### Order of work

1. Scaffold, tokens, shared layout, header, footer, page transition.
2. Groups, section by section (the simpler page; proves the pattern). After the first two sections,
   Nathan opens the branch in Stacki to confirm sections are editable visually, before the pattern is
   repeated across the site.
3. Home, section by section, then `/embed/globe`.
4. Standalone demos into `public/`, deletions, Vercel config, README.
5. Tests ported, full screenshot pass, Nathan opens it in Stacki, merge.

### Done means

- The branch's Vercel preview passes the fidelity and behavior checks.
- Nathan has opened the project in Stacki and can select and edit page sections visually. (Stacki is a
  desktop app; only Nathan can confirm this.)
- All listed content comes from the collections; none is hard-coded in components.
- Tests and `npm run check` pass.

## Left to the builder

- d3, topojson and Lenis from npm or from the CDN as today.
- Geist self-hosted or from Google Fonts.
- How the large page scripts are split into files, provided behavior is unchanged.
- Which specs count as "page behavior" where a file mixes both kinds.
- File format of the collection data (JSON or YAML).

## Calls made by Claude (not decided by Nathan)

- The URL table, including `/hero` redirecting to `/` and the new `/embed/globe`.
- Content held in local collections for now, shaped for Sanity.
- Adjust panels kept, unchanged.
- Hubs and video reels stay in code.
- Three screenshot widths and the fidelity bar.
- The loose source files at the repo root (thumbnail PNGs, the 58 MB mp4, `Vision & How-To English/`) are
  left alone and not added to the site.

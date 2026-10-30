# Versions panel — design

Date: 2026-10-30
Page: `hero.html` (the site root)
Builds on: Vercel's deploy history for the `churchnetwork` project, and the Adjust panel's look and motion

## Intent

The site is reviewed live with overseers. When an overseer asks "what did this look like before?", Nathan or an
overseer needs to pull up that earlier build on the spot: the real page, globe running, not a screenshot. Over
time, the same panel lets everyone step back through the builds and see whether the layout and copy are drifting
from where they started. It is a record, not an undo button.

## Goals

- A **Versions** pill on the hero, at the **bottom left**, mirroring Adjust at the bottom right. Same pill style
  (white, hairline border, small glyph). Visible to every visitor, like Adjust.
- Clicking it slides a **Versions** panel in from the **left**, mirroring the Adjust panel (same width, white
  background, hairline edge, same 0.7s ease, Close button, Esc closes).
- The panel lists **every build of `main`**, newest first. Each row: date and time (e.g. "Oct 28 · 11:24 AM") and
  a short plain-language summary of what changed, written for overseers, not developers. The newest row is tagged
  **Current**. A status line under the title: "12 builds since Oct 16".
- **Clicking a row swaps that build into the page area** (option B in the mockups):
  - The old build loads full-size in the page area, beside the open panel, as the real site from that time,
    globe and all. It is that build's own deploy address on Vercel, shown in a frame.
  - A dark bar across the top of the page area: "Viewing the **Oct 20 · 2:52 PM** version" and a **Back to
    current** button.
  - The clicked row is highlighted (dark fill, **Viewing** tag). The panel stays open so you can click from
    version to version.
  - **Back to current**, clicking the Current row, or closing the panel returns to the live page.
- Inside an old build that's shown in the frame, a build that has the Versions pill hides it (no panel inside a
  panel). Builds from before this feature never had it.

## Non-goals

- **Comment mode** is untouched. Comments are not tied to versions; inside an old build, Comment mode behaves
  however that build behaved.
- No side-by-side or diff view; you compare by stepping through.
- No hand-picked "milestones": every `main` build appears.
- Branch preview builds do not appear.
- Only the hero gets the pill. The other pages (flat, globe, pins) don't.

## Anti-goals

- An overseer clicking a version and hitting a Vercel sign-in page.
- Developer commit-speak in the rows ("Harden Marker input and the stroke origin bound").
- Old versions quietly disappearing after some months.
- The pill crowding the hero on phones or fighting the Adjust pill.

## Decided

- **Source of builds: Vercel's deploy history.** Vercel already keeps every build at a permanent address (e.g.
  `churchnetwork-a79hy0ryt-nathan-torres-projects.vercel.app`). The 12 production builds since Oct 16 are all
  still there, so the panel starts with full history.
- **Vercel Authentication is off** for the project (done 2026-10-30, Nathan's call). Every build address is
  viewable by anyone with the link; verified with the Oct 28 build. This also makes branch preview addresses
  public.
- **Retention:** Vercel's Hobby plan deletes production builds after 30 days and won't allow longer (checked
  2026-10-30). Nathan chose to ship with a rolling 30-day history; moving to Pro would allow unlimited retention.
- **Summaries are written per push.** Whoever pushes writes one plain summary line for the build. For the 12
  existing builds, the builder writes the summaries (drafts below, from the mockups) for Nathan to check. A build
  with no summary falls back to its commit's first line.

## How it works (builder's choice within these lines)

- **Getting the list.** At build time, `scripts/build-static.js` asks the Vercel API for the project's READY
  production deployments and writes `dist/versions.json` (date, deploy address, commit SHA, summary). The
  build being made isn't in Vercel's list yet; add it from Vercel's build environment variables
  (`VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_MESSAGE`) as the Current row.
  - Needs a Vercel access token as a project environment variable (e.g. `VERCEL_VERSIONS_TOKEN`), read-only use,
    never shipped to the browser. Builder: create or ask Nathan for the token, and add it with `vercel env`.
  - If the token is missing or the API call fails, the build still succeeds; the panel shows just the current
    build and the note "Version history isn't available right now".
  - Local runs (no Vercel env) skip it the same way.
- **Where the summary lives.** Vercel's stored commit message is cut to ~300 characters, so a summary at the end
  of a long message can be lost. Keep summaries in a file in the repo, `versions.json` at the root: a list of
  `{ "sha": "<commit sha>", "summary": "..." }`. The build matches deployments to entries by commit SHA (a
  deployment's SHA is the head commit of that push). A push's own summary can't name its own SHA before it's
  committed, so also accept a `Version: <summary>` line placed **right after the commit subject** (inside the
  first 300 characters), and prefer the file entry if both exist. The builder documents the convention in the
  README.
- **The frame.** The old build loads in an iframe pointed at `https://<deploy address>/`. Check that Vercel
  doesn't send headers that block framing for these static builds. Show a quiet loading state (the build's own
  loading screen covers most of it). Pass a marker in the address (e.g. `?framed=versions`) so new builds know
  to hide their Versions pill; also hide it when `window.self !== window.top`.
- **While viewing an old build**, the live page underneath should stop its globe from rendering (it's hidden),
  and resume on Back to current.
- **Phones (≤ 640px):** the panel covers the screen like Adjust does today. Tapping a row closes the panel and
  shows the build full screen, with the dark bar carrying **Versions** (reopens the panel) and **Back to
  current**.
- **Keyboard:** Esc closes the panel (and returns to current). Rows are buttons, reachable with Tab.
- **Reduced motion:** no slide, same as Adjust.

- **Times** show in the viewer's own time zone.
- **Redeploys** of the same commit appear once (the newest).
- **Old builds share today's comment backend.** Comment mode inside an old build talks to the live Convex
  deployment with that build's older code. That's accepted (Comment mode is out of scope), but the builder should
  note in the README that marks made inside an old build land in the live review.

## Draft summaries for the existing builds

| Date | Commit | Summary |
|------|--------|---------|
| Oct 28 · 11:24 AM | 0681ff2 | Globe dots take the headline colors, one per generation |
| Oct 28 · 10:57 AM | 495082a | Rock Network logo, "A New Testament Church Network" title, How we do it section, new copy |
| Oct 27 · 1:48 PM | 3dd524e | Eraser and size sliders for the Marker |
| Oct 23 · 10:46 AM | 4d8ca04 | Marker drawing tool in Comment mode |
| Oct 20 · 2:52 PM | a2196d2 | Find a hub rows fill on hover; section hidden for now |
| Oct 20 · 9:01 AM | 2e6cdaa | Smoother switch into Comment mode |
| Oct 18 · 12:23 PM | 3fda743 | Comment mode: reviewers can comment, record voice memos, and draw arrows and highlight boxes on the page |
| Oct 18 · 9:59 AM | 749ad32 | Curved bottom edge on the hero |
| Oct 16 · 3:16 PM | 5775eab | Smoother fold-back on the loading screen |
| Oct 16 · 3:13 PM | 1525f6b | Loading screen: a network grows and folds back as the page opens |
| Oct 16 · 3:03 PM | 661f6f7 | Hero page opens at the site's main address |
| Oct 16 · 3:00 PM | fa66972 | First build: the hero page, flat network, globe and pins |

The builder checks each against what the build actually changed (via `git log <prev>..<sha>`) and corrects any
that are off.

## Testing

- Unit-test the build step's list-making: matching by SHA, file entry beating the `Version:` line, the
  first-line fallback, newest-first order, missing token.
- Playwright: the pill opens and closes the panel; clicking a row shows the frame, bar and highlighted row; Back
  to current restores the page; Esc; the pill is hidden when framed; the phone layout. Use a fixture
  `versions.json` with frame addresses pointing at local pages.
- By hand after deploy: open the live site, step through at least three old builds, confirm each loads with no
  sign-in and the globe runs.

## Left to the builder

Exact pill glyph, row spacing and type sizes (match Adjust), the loading state, error copy beyond the line above,
and how `versions.json` is read by the page (fetch at panel open is fine).

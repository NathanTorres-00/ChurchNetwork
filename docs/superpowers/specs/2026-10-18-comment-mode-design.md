# Comment mode — design

Date: 2026-10-18
Page: `hero.html` (the Church Network home page, served at the site root on Vercel)
Visual reference: Figma "Church Network — Review Workspace", TR-ANAHEIM file, node `3022:1536`

## Intent

Nathan builds the Church Network site and needs feedback from a small group of overseers. Today that
feedback arrives secondhand, detached from the page it's about. Comment mode lets an overseer open the real,
live site on their own device, switch into a review workspace, and mark up the page directly: pin a typed
comment to a spot, draw an arrow, highlight an area, or record a voice memo when it's easier to explain out
loud than to type. Nathan later opens comment mode himself, sees every mark in place, plays the memos, makes
the edits, and resolves each item as it's done.

The link is not widely shared: in practice the users are Nathan and his overseers. Comment mode is still open
to anyone who visits; there are no accounts and no sign-up.

## Goals

- A **Comment** button in the site header, top right, tucked beside the nav. It is the only sign of comment
  mode on the normal page.
- Clicking it turns the page into the polished review workspace from the Figma frame: a top toolbar, a tool
  rail on the left, the page live in the middle, a "Review activity" sidebar on the right.
- Four kinds of marks, each placed on the page:
  - **Comment**: click a spot to drop a pin, then type the feedback.
  - **Voice memo**: click a spot to drop a pin, then record audio from the device's mic. The card shows a
    play button and the length, and plays back in place.
  - **Arrow**: drag from one point to another to point at something, with an optional note.
  - **Highlight**: drag a rectangle over an area, with an optional note.
- Every mark appears both on the page and as a card in the sidebar. Clicking a card scrolls to its mark and
  draws attention to it; clicking a mark selects its card.
- Marks are saved to a shared backend and show up for everyone in comment mode, **live**: if two people are
  reviewing at once, each sees the other's marks appear without refreshing.
- Each mark shows who left it (a name typed once per device, then remembered) and when.
- Nathan can **resolve** and **delete** any mark. Resolved marks are hidden by default, with a toggle to show
  them, so the workspace shows what's left to do.
- Leaving comment mode returns the page exactly to its normal state.

## Non-goals (for this version)

- Accounts, sign-in or invitations.
- Replies or threads on a comment.
- @mentions and notifications (the Figma composer's "Use @ to mention someone" placeholder is dropped).
- Editing a mark after posting. Authors can delete their own and post again.
- Comment mode on the other pages (`network-multiply.html`, `network-globe.html`, `network-globe-pins.html`).
  The build should not prevent adding it there later.
- Transcribing voice memos.

## Anti-goals (failures even if it technically works)

- Any mark, card, count or comment UI visible outside comment mode, to anyone, including Nathan.
- The normal page getting slower or heavier for visitors who never click Comment. Nothing for comment mode
  (Convex client, styles, data) loads until the button is clicked.
- A comment or memo silently lost. Posting must clearly succeed or clearly fail with a way to retry; a memo
  being recorded must not be thrown away by an accidental click elsewhere.
- Overseers needing to install, sign up, or understand anything technical.
- Marks drifting off the thing they point at when the window is a different width than the one they were
  made at.

## Decisions made

### Backend: Convex

Chosen by Nathan after comparing Vercel Blob + Upstash Redis, Vercel Blob + Neon, Supabase and Convex.
Convex holds both the marks (database) and the voice memos (file storage), and gives live updates through
subscriptions.

- Provisioned through the **Vercel Marketplace** Convex integration, attached to the existing Vercel project
  for this repo, so deploy keys sync to Vercel. Nathan completes any account or dashboard step; the builder
  stops and asks when one is needed.
- The repo gains a `package.json` (with `convex` as a dependency) and a `convex/` folder holding the schema
  and functions. The pages remain plain HTML with no framework and no bundler.
- The page uses Convex's browser bundle from a script tag (`convex.ConvexClient`), pinned to an exact
  version. Convex's script-tag quickstart shows an old version (1.3.1); the builder confirms the current
  version's browser bundle works and pins that.
- Vercel's build command becomes `npx convex deploy --cmd '<...>'` so pushes to `main` deploy the Convex
  functions with the site. How the page learns the Convex URL is the builder's call (see below).

### Audio

- Recorded in the browser with `MediaRecorder`. The format is chosen at run time from what the browser
  supports (iPhone Safari records MP4/AAC, Chrome and Firefox WebM or Ogg Opus), and the actual MIME type is
  stored with the memo. The builder prefers formats that also play back on iPhone when the recording browser
  offers a choice.
- Uploaded to Convex file storage with an upload URL (mutation returns the URL, the browser POSTs the file,
  a second mutation saves the storage ID on the mark). Playback uses a URL from Convex storage.
- Recording requires mic permission. The UI explains what happened if permission is denied.

## My calls (Nathan to check)

These weren't discussed; they're the builder's defaults unless Nathan says otherwise.

1. **Desktop-first, phone-usable.** The workspace matches the Figma frame on a computer. On a phone the
   toolbar compacts, the tool rail becomes a bar along the bottom, and the sidebar becomes a sheet that slides
   up. Marks can be placed and dragged by touch.
2. **Toolbar buttons.** Everything saves the moment it's posted, so the Figma "Save review" button is
   dropped. "Share review" copies a link that opens the page straight into comment mode (e.g.
   `/?comment`). The toolbar's left side keeps the "Comment mode" pill (which also exits) and the
   "Reviewing Church Network — Home" label.
3. **Tool rail.** Four tools in this order: Comment, Voice memo, Arrow, Highlight. A fifth, unselected state
   lets the reviewer scroll and use the page without placing anything; pressing Esc or clicking the active tool
   again returns to it. Comment mode opens with the Comment tool selected, matching the composer hint "Click the
   page to place an anchor and write your feedback."
4. **The page in comment mode.** While a placing tool is active, clicks place marks instead of following
   links or pressing buttons, and the hub-row custom cursor is turned off. The hero globe pauses its flight so
   people can comment on a still frame. The Adjust button and panel are hidden.
5. **Layout.** On screens wide enough for the Figma layout, the page sits between the tool rail and the
   sidebar. On narrower screens the sidebar overlays the page and can be collapsed.
6. **Sidebar counts.** The stats row shows Comments, Voice memos, Arrows and Highlights (open items only),
   instead of the Figma frame's Comments / Anchors / Arrows.
7. **Names.** The first time someone posts, they're asked for their name; it's remembered on that device and
   can be changed from the composer.
8. **Owner controls.** Nathan opens the site once with a private key in the address (e.g. `?owner=<key>`);
   the page remembers it on that device and removes it from the address bar. Resolve, unresolve and delete on
   any mark are only accepted by the backend when the key matches a secret stored in Convex's environment.
   Each device also gets a random ID so authors can delete their own marks without the key.
9. **Memo length.** Voice memos stop recording at 3 minutes, with a visible timer. Reviewers can listen back,
   re-record or discard before posting. A short typed title is optional.
10. **Guardrails.** Text length limits and a cap on how many marks one device can post per minute, enforced
    in the backend. Nothing heavier, since the audience is small.
11. **Small screens.** The header nav hides below 760px wide; the Comment button stays visible in the
    header's top right at every width.
12. **Opening a shared link.** A link that opens straight into comment mode waits for the loading screen to
    finish, then enters comment mode.
13. **Deleting a voice memo** also deletes its audio file from storage.
14. **Setup.** The builder generates the owner key, stores it as a Convex environment variable, and gives it
    to Nathan with the one-time owner link. The repo isn't linked to Vercel locally yet (`.vercel/` is absent),
    so linking it is part of setup.

## Constraints

- Plain HTML/CSS/JS in `hero.html` (or small files next to it). No framework, no bundler, no build step for
  the page itself beyond the Convex deploy.
- Visual language comes from the existing page and the Figma frame: Geist, the page's color variables
  (`--heading`, `--text`, `--surface`, `--line`, the four word colors), pill buttons, 14–24px radii.
- External scripts load from pinned, exact versions, matching how `hero.html` already loads d3 and Lenis.
- Don't break what's there: the loading screen, the globe and its pins, the typed headline, the Adjust panel,
  the hub cursor, Lenis smooth scrolling and the curved hero edge all keep working outside comment mode.
- Respect `prefers-reduced-motion` for any comment-mode animation.
- Keyboard: Esc backs out (stop placing → close an open composer → leave comment mode); the Comment button
  and all tools are reachable and labeled.

## Left to the builder

- **Anchoring.** How a mark is tied to the page so it stays on target across widths. Expected direction:
  anchor to the nearest suitable element under the pointer (sections have IDs; deeper elements can be found
  by a stable path) and store the position as fractions of that element's box. Arrows anchor each end;
  highlights anchor their rectangle the same way. Also store the viewport width at creation for reference.
  When an anchor can no longer be found, the mark is still listed in the sidebar, flagged as "moved", rather
  than lost.
- **Data shape** in Convex: one `marks` table with a `kind` (comment, voice, arrow, highlight), anchor data,
  text, optional audio storage ID, MIME type and duration, author name, device ID, created time, resolved
  state. Indexes as needed for "open marks for this page".
- **How the page gets the Convex URL** (written into a small generated config file by the deploy command,
  or the public production URL committed in the page; it is not a secret).
- Live updates: subscribe with `client.onUpdate` while comment mode is open; unsubscribe and close the client
  when leaving.
- Exact visual details of each mark on the page (pin, arrow, highlight), following the Figma frame.
- The order of building, and how to test against a Convex dev deployment before production.

## Success looks like

An overseer opens the Vercel link on their own phone or computer and clicks **Comment**. They type their
name once, then leave a typed comment on the headline, an arrow at a button, a highlight over a section and a
30-second voice memo on the timeline. Nathan, on his own computer, already has comment mode open and sees each
one appear as it's posted, in the right place. He plays the memo, makes an edit, resolves the item, and
deletes a test mark. When he leaves comment mode, the page looks exactly as it did before any of this existed.

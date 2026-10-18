# Comment Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Comment button to `hero.html` that opens a review workspace where anyone can pin typed comments, voice memos, arrows and highlights to the live page, saved to Convex and shown live to everyone in comment mode.

**Architecture:** The normal page only gains a header button and a few lines of glue. Everything else lives in native ES modules under `review/`, loaded with `import()` on first click. A `ReviewStore` interface hides the backend: `store.js` talks to Convex through its browser bundle, `fake-store.js` is an in-memory twin used by Playwright. The Convex backend (`convex/`) holds one `marks` table plus file storage for audio, and enforces owner-only and rate-limit rules.

**Tech Stack:** Plain HTML/CSS/JS (no framework, no bundler), Convex (database, file storage, live queries) provisioned through the Vercel Marketplace, Vitest + convex-test + jsdom for unit tests, Playwright (Chromium) for browser tests.

**Spec:** `docs/superpowers/specs/2026-10-18-comment-mode-design.md`

## Global Constraints

- Nothing for comment mode loads until the Comment button is clicked or the page is opened with `?comment`: no Convex script, no `review/` module, no `review/review.css`.
- No mark, card, count or comment UI exists in the DOM outside comment mode.
- External scripts load from exact pinned versions (as `hero.html` does for d3 and Lenis). The Convex browser bundle is `https://unpkg.com/convex@<exact current version>/dist/browser.bundle.js`; confirm the file exists at that version before pinning.
- Every comment-mode element carries `data-review-ui` so anchoring and click-blocking can ignore it.
- `localStorage` access is always wrapped in try/catch; comment mode works (with less memory) when storage throws.
- Limits: text ≤ 2000 chars, voice title ≤ 120, name 1–60, voice memo ≤ 180000 ms, ≤ 10 marks per device per 60000 ms.
- Visuals follow the Figma frame "Church Network — Review Workspace" (TR-ANAHEIM, node `3022:1536`) using the page's tokens: Geist, `--heading`, `--text`, `--surface`, `--line`, `--c-disciples` / `--c-leaders` / `--c-churches` / `--c-movements`, pill buttons, 14–24px radii.
- Comment-mode animations respect `prefers-reduced-motion`.
- Outside comment mode, everything that works today keeps working: loading screen, globe and pins, typed headline, Adjust panel, hub cursor, Lenis, the curved hero edge.

## Review Focus

1. **A mark's element is gone** (content edited after the mark was made): the card stays in the sidebar labeled "Moved", and no pin is drawn at (0, 0). Test: Task 3 `resolveAnchor` returns null for a missing path; Task 6 e2e `moved mark is listed but not drawn`.
2. **Posting fails** (offline, rate limit, backend error): the draft stays in the composer with its text or recording intact, an error line appears, and Post can be pressed again. Test: Task 6 e2e `failed post keeps the draft and retries`.
3. **Mic denied or no MediaRecorder**: the voice composer explains what happened in plain words and offers a typed comment instead; nothing throws. Test: Task 7 e2e `mic denied shows a message`.
4. **Storage blocked** (private window): name is asked each time comment mode opens, device ID lives for the session, no exception. Test: Task 3 `identity works when localStorage throws`.
5. **Leaving mid-draft or mid-recording** (Esc, the Comment-mode pill, or switching tools): the reviewer is asked before the draft is thrown away. Test: Task 6 e2e `exit with an unsent draft asks first`, Task 7 e2e `exit while recording asks first`.

---

## File Structure

```
package.json                 Create  deps, scripts (test, test:e2e, dev, build)
vitest.config.js             Create  convex-test inlining
playwright.config.js         Create  python static server on 8791, fake mic flags
.gitignore                   Modify  node_modules/, dist/, .env.local, review/config.js, test-results/, playwright-report/
vercel.json                  Modify  buildCommand, outputDirectory
scripts/write-config.js      Create  writes review/config.js from CONVEX_URL (env or .env.local)
scripts/build-static.js      Create  copies site files to dist/ and writes dist/review/config.js
convex/schema.js             Create  marks table
convex/limits.js             Create  limits + validateMark (pure, shared with tests)
convex/marks.js              Create  list, create, generateUploadUrl, setResolved, remove, isOwner
convex/marks.test.js         Create  convex-test suite
review/anchor.js             Create  element paths, fractions, resolve to page coords
review/identity.js           Create  name, device ID, owner key
review/recorder.js           Create  mime choice, recording with limit
review/store.js              Create  Convex-backed ReviewStore
review/fake-store.js         Create  in-memory ReviewStore for tests
review/comment-mode.js       Create  enter/exit orchestration, page hooks, events
review/workspace.js          Create  toolbar, tool rail, sidebar, composer DOM
review/marks-layer.js        Create  draws pins, arrows, highlights; repositions
review/placing.js            Create  pointer handling per tool → draft geometry
review/review.css            Create  all comment-mode styles
tests/unit/*.test.js         Create  anchor, identity, recorder, fake-store
tests/e2e/*.spec.js          Create  Playwright specs per task
hero.html                    Modify  Comment button, lazy loader glue, review:enter/exit listeners
README.md                    Modify  Comment mode section
```

## Shared Interfaces (referenced by every task)

```js
// Anchor: a point tied to an element, as fractions of that element's box
// { path: string, fx: number, fy: number, vw: number }   vw = window.innerWidth when made

// Mark (as returned by list / delivered to subscribers)
// { _id, _creationTime, page: 'home', kind: 'comment'|'voice'|'arrow'|'highlight',
//   at?: Anchor            (comment, voice)
//   from?: Anchor, to?: Anchor   (arrow: tail→head; highlight: opposite corners)
//   text?: string          (comment: required; voice: optional title; arrow/highlight: optional note)
//   audio?: { storageId, mime: string, durationMs: number }, audioUrl?: string|null  (voice)
//   author: string, deviceId: string, resolved: boolean }

// ReviewStore (store.js and fake-store.js both implement it)
// subscribe(page, onMarks: (marks: Mark[]) => void): () => void
// create(input: Omit<Mark,'_id'|'_creationTime'|'resolved'|'audioUrl'>): Promise<string>   // rejects Error with .code
// uploadAudio(blob: Blob, mime: string, deviceId: string): Promise<string>                  // storageId
// setResolved(id: string, resolved: boolean, ownerKey: string): Promise<void>
// remove(id: string, opts: { ownerKey?: string, deviceId: string }): Promise<void>
// isOwner(ownerKey: string|null): Promise<boolean>
// close(): void

// Error codes (ConvexError data / Error.code): 'INVALID', 'RATE_LIMIT', 'NOT_OWNER', 'NOT_FOUND'
// Document events: 'review:enter', 'review:exit' (CustomEvent on document)
```

---

### Task 1: Convex backend and test tooling

**Files:**
- Create: `package.json`, `vitest.config.js`, `convex/schema.js`, `convex/limits.js`, `convex/marks.js`, `convex/marks.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Convex functions `marks:list({ page })`, `marks:create({...})`, `marks:generateUploadUrl({ deviceId })`, `marks:setResolved({ id, resolved, ownerKey })`, `marks:remove({ id, ownerKey?, deviceId })`, `marks:isOwner({ ownerKey })`; `limits.js` exports `MAX_TEXT=2000, MAX_TITLE=120, MAX_NAME=60, MAX_VOICE_MS=180000, RATE_WINDOW_MS=60000, RATE_MAX=10, validateMark(input) → null | 'INVALID'`.

- [ ] **Step 1: Set up tooling.** `npm init -y`, set `"type": "module"`, add `convex` (dependency) and `vitest`, `convex-test`, `@edge-runtime/vm`, `jsdom`, `@playwright/test` (devDependencies) at exact current versions. Scripts: `"test": "vitest run"`, `"test:e2e": "playwright test"`. `vitest.config.js` sets `server.deps.inline: ['convex-test']`. Add `node_modules/`, `dist/`, `.env.local`, `review/config.js`, `test-results/`, `playwright-report/` to `.gitignore`.

- [ ] **Step 2: Write the failing tests** in `convex/marks.test.js` (first line `// @vitest-environment edge-runtime`; `convexTest(schema, import.meta.glob('./**/*.js'))`; set `process.env.OWNER_KEY = 'owner-secret'` in `beforeEach`):
  - `creates a comment and lists it` → `list({page:'home'})` has one mark, `kind:'comment'`, `resolved:false`.
  - `rejects a comment with empty text` → `create` throws, error data `'INVALID'`.
  - `rejects text over 2000 chars`, `rejects a name over 60 chars`, `rejects an arrow without to`, `rejects a voice memo over 180000 ms` → `'INVALID'`.
  - `rate limits an 11th mark from one device within a minute` → 10 succeed, 11th throws `'RATE_LIMIT'`; a different `deviceId` still succeeds.
  - `setResolved needs the owner key` → wrong key throws `'NOT_OWNER'`; `'owner-secret'` sets `resolved:true`.
  - `author can remove their own mark; others cannot` → same `deviceId` succeeds; other device without key throws `'NOT_OWNER'`; other device with owner key succeeds.
  - `removing a voice memo deletes its file` → store a blob via `t.run(ctx => ctx.storage.store(new Blob(['x'])))`, create a voice mark with it, remove, then `ctx.storage.getUrl(id)` is `null`.
  - `list returns audioUrl for voice memos`.
  - `isOwner` → `true` only for `'owner-secret'`, `false` for `null`.

- [ ] **Step 3: Run** `npm test -- convex` → FAIL (modules missing).

- [ ] **Step 4: Implement.** `schema.js`: table `marks` with the Mark fields (validators: `v.union(v.literal(...))` for kind, optional anchors as `v.object({ path: v.string(), fx: v.number(), fy: v.number(), vw: v.number() })`, `audio` optional object with `v.id('_storage')`), index `by_page` on `page`, index `by_device` on `deviceId`. `limits.js`: constants plus `validateMark`. `marks.js`: errors thrown as `new ConvexError('<CODE>')`; rate limit counts the device's marks with `_creationTime > Date.now() - RATE_WINDOW_MS` via `by_device`; owner check compares to `process.env.OWNER_KEY` and is false when the env var is unset; `remove` calls `ctx.storage.delete` for voice marks; `list` maps voice marks to add `audioUrl: await ctx.storage.getUrl(...)`, ordered by `_creationTime`.

- [ ] **Step 5: Run** `npm test -- convex` → all PASS.

- [ ] **Step 6: Commit** `git add package.json package-lock.json vitest.config.js .gitignore convex/ && git commit -m "Add the Convex backend for comment mode"`

---

### Task 2: Provision Convex, deploy pipeline and config

Needs Nathan for any account or browser step: stop and ask when a command hands off to the browser.

**Files:**
- Create: `scripts/write-config.js`, `scripts/build-static.js`, `tests/unit/build-static.test.js`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `review/config.js` (gitignored, generated) exporting `export const CONVEX_URL = '<url>'`; `dist/` holding `hero.html`, the three `network-*.html` pages and `review/` with its own generated `config.js`.

- [ ] **Step 1: Link and provision.** `vercel link` (choose the project serving this repo), then `vercel integration add convex` with Production and Preview environments on and no custom prefix. Then `npx convex dev --once` to create the dev deployment and `.env.local`. Generate a 32-byte random owner key and set it with `npx convex env set OWNER_KEY <key>` (dev) and `npx convex env set OWNER_KEY <key> --prod`. Record the key for the handoff in Task 9; never commit it.

- [ ] **Step 2: Write the failing test** `tests/unit/build-static.test.js` → `build writes dist with pages, review modules and config`: run `buildStatic({ root, out, convexUrl: 'https://x.convex.cloud' })` on a temp copy; assert `dist/hero.html`, `dist/review/comment-mode.js` exist (create a stub file in the temp root), `dist/review/config.js` contains `https://x.convex.cloud`, and `dist/convex/`, `dist/node_modules/`, `dist/docs/` do not exist. Also `build fails without a Convex URL` → throws.

- [ ] **Step 3: Run** `npm test -- build-static` → FAIL.

- [ ] **Step 4: Implement** `scripts/build-static.js` exporting `buildStatic({ root, out, convexUrl })` and running it as a CLI with `process.env.CONVEX_URL` (copies `*.html` at the root and the `review/` folder; overwrites `review/config.js` in the output). `scripts/write-config.js` writes `review/config.js` locally from `CONVEX_URL` or `.env.local`; add `"dev:config": "node scripts/write-config.js"`. `vercel.json` gains `"buildCommand": "npx convex deploy --cmd 'node scripts/build-static.js'"` and `"outputDirectory": "dist"`, keeping `cleanUrls` and the `/` → `/hero` rewrite.

- [ ] **Step 5: Run** `npm test -- build-static` → PASS. Then `CONVEX_URL=https://x.convex.cloud node scripts/build-static.js && ls dist dist/review` shows the pages and `config.js`.

- [ ] **Step 6: Commit** `git add scripts/ tests/unit/build-static.test.js vercel.json package.json && git commit -m "Build the static site with Convex deploy"`

---

### Task 3: Anchors, identity and recorder helpers

**Files:**
- Create: `review/anchor.js`, `review/identity.js`, `review/recorder.js`, `tests/unit/anchor.test.js`, `tests/unit/identity.test.js`, `tests/unit/recorder.test.js` (all `// @vitest-environment jsdom`)

**Interfaces:**
- Produces:
  - `anchor.js`: `pathFor(el: Element) → string` (from the nearest ancestor with an id, e.g. `#story > ol:nth-of-type(1) > li:nth-of-type(3) > h3:nth-of-type(1)`; `body` when no id ancestor), `findByPath(path, doc = document) → Element|null`, `toFraction(rect, x, y) → {fx, fy}` (clamped 0–1), `fromFraction(rect, fx, fy) → {x, y}`, `anchorAt(clientX, clientY) → Anchor` (uses `document.elementsFromPoint`, skips anything inside `[data-review-ui]`), `resolveAnchor(anchor) → {x, y}|null` in page coordinates (adds `scrollX/scrollY`).
  - `identity.js`: `getName() → string|null`, `setName(name)`, `getDeviceId() → string` (stable per device, in-memory fallback), `captureOwnerKey(loc = location, hist = history) → string|null` (reads `?owner=`, stores it, removes only that param via `replaceState`), `getOwnerKey() → string|null`. Storage keys: `cn-review-name`, `cn-review-device`, `cn-review-owner`.
  - `recorder.js`: `pickMimeType(isSupported) → string` trying in order `audio/mp4`, `audio/webm;codecs=opus`, `audio/ogg;codecs=opus`, `audio/webm`, else `''`; `startRecording({ maxMs = 180000, onTick, onLimit }) → Promise<{ stop(): Promise<{ blob, mime, durationMs }>, cancel(): void }>`, rejecting with `Error` whose `.code` is `'MIC_DENIED'` (permission error) or `'UNSUPPORTED'` (no `MediaRecorder`/`getUserMedia`).

- [ ] **Step 1: Write the failing tests.**
  - anchor: `pathFor and findByPath round-trip` on a fixture with `<section id="story"><ol><li>…<h3>` elements (3rd `li`'s `h3`); `pathFor falls back to body`; `toFraction/fromFraction round-trip` for rect `{left:100, top:50, width:200, height:100}` and point `(150, 75)` → `{fx:.25, fy:.25}` and back; `toFraction clamps outside points to 0–1`; `resolveAnchor returns null for a missing path`.
  - identity: `name persists`; `device id is stable across calls`; `captureOwnerKey stores the key and strips only ?owner` (`/?comment&owner=abc` → `/?comment`, returns `'abc'`, `getOwnerKey()==='abc'`); `identity works when localStorage throws` (stub `localStorage.getItem/setItem` to throw: `getName()` is null, `setName` doesn't throw, `getDeviceId()` returns the same value twice in a session).
  - recorder: `prefers mp4 when supported`; `falls back to webm opus`; `returns empty string when nothing matches`; `startRecording rejects UNSUPPORTED without MediaRecorder`.

- [ ] **Step 2: Run** `npm test -- tests/unit` → FAIL.

- [ ] **Step 3: Implement** the three modules to those signatures. `startRecording` stops itself at `maxMs`, calling `onLimit`; `onTick(ms)` fires about every 250 ms; `cancel` stops tracks and discards data; tracks are always stopped on `stop`/`cancel`.

- [ ] **Step 4: Run** `npm test -- tests/unit` → PASS.

- [ ] **Step 5: Commit** `git add review/anchor.js review/identity.js review/recorder.js tests/unit && git commit -m "Add anchor, identity and recorder helpers for comment mode"`

---

### Task 4: Review stores

**Files:**
- Create: `review/store.js`, `review/fake-store.js`, `tests/unit/fake-store.test.js`

**Interfaces:**
- Consumes: Convex functions from Task 1; `CONVEX_URL` from `review/config.js` (Task 2).
- Produces: `createConvexStore(url) → ReviewStore` (loads the pinned Convex browser bundle by injecting its script tag once, then `new convex.ConvexClient(url)`; `subscribe` uses `client.onUpdate('marks:list', { page }, cb)`; `uploadAudio` calls `marks:generateUploadUrl`, POSTs the blob with `Content-Type: mime`, returns `storageId`; errors become `Error` with `.code` from `ConvexError` data, or `'NETWORK'`). `createFakeStore() → ReviewStore & { failNext(code: string): void, marks: Mark[] }`, which applies the same validation (imports `validateMark` and limits from `../convex/limits.js`, which resolves when tests serve the repo root; production never loads the fake store, so the build does not copy `convex/`), notifies subscribers synchronously after each change, accepts owner key `'test-owner'`, and stores audio as object URLs.

- [ ] **Step 1: Write the failing test** `fake store matches the backend rules`: subscribe then create → subscriber receives one mark; `failNext('NETWORK')` makes the next `create` reject with `.code === 'NETWORK'` and the following one succeed; `setResolved` with a wrong key rejects `'NOT_OWNER'`; `remove` by the author's device succeeds; `uploadAudio` returns an id whose mark gets an `audioUrl`.

- [ ] **Step 2: Run** `npm test -- fake-store` → FAIL.

- [ ] **Step 3: Implement** both stores to the interface. The Convex store is checked live in Task 9.

- [ ] **Step 4: Run** `npm test -- fake-store` → PASS.

- [ ] **Step 5: Commit** `git add review/store.js review/fake-store.js tests/unit/fake-store.test.js && git commit -m "Add the Convex and in-memory review stores"`

---

### Task 5: Comment button and the workspace shell

**Files:**
- Create: `review/comment-mode.js`, `review/workspace.js`, `review/review.css`, `playwright.config.js`, `tests/e2e/shell.spec.js`
- Modify: `hero.html` (header markup near line 668, a small inline script after the header, listeners inside the globe script beside `setPlaying` near line 2158, CSS for the button)

**Interfaces:**
- Consumes: `ReviewStore`, `identity.captureOwnerKey/getOwnerKey`, `store.isOwner`.
- Produces: `comment-mode.js` exports `enter({ page = 'home' } = {}) → Promise<void>`, `exit() → Promise<boolean>` (resolves `false` when the reviewer cancels), `isOpen() → boolean`. It picks the store `createFakeStore()` when `window.__reviewStoreFactory === 'fake'` (also exposing it as `window.__reviewFake`), else `createConvexStore(CONVEX_URL)`. It adds `html.review-open`, dispatches `review:enter` / `review:exit`, and removes every node it created on exit. `workspace.js` exports `createWorkspace({ onExit, onToolChange, onShare }) → { el, setTool(tool), setOwner(bool), sidebar: { setMarks(marks, { showResolved, selectedId }), onSelect(cb), composer } , destroy() }` with tools `'browse' | 'comment' | 'voice' | 'arrow' | 'highlight'`.

- [ ] **Step 1: Write the failing e2e tests** (`playwright.config.js`: `webServer` runs `python3 -m http.server 8791 --bind 127.0.0.1`, `baseURL` `http://127.0.0.1:8791`, Chromium with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream`; every spec's `beforeEach` sets `window.__reviewStoreFactory = 'fake'` via `addInitScript` and waits for the `page:revealed` event):
  - `comment button sits beside the nav` → `#comment-toggle` visible in `.site-header` at 1440×900, right edge within the header wrap, not overlapping `.site-nav`; at 500×844 still visible.
  - `nothing loads before the button is clicked` → no request matching `/review/` or `convex` and no `[data-review-ui]` in the DOM.
  - `entering shows the workspace` → after click: toolbar with text `Comment mode` and `Reviewing Church Network — Home`, a "Share review" button and no "Save review", tool rail buttons named Comment, Voice memo, Arrow, Highlight, sidebar heading `Review activity`; the Comment tool is pressed; `.adjust` hidden.
  - `exiting restores the page` → click the Comment-mode pill: no `[data-review-ui]` remains, `html` lacks `review-open`, `.adjust` visible.
  - `Esc backs out one level` → with Comment tool active, Esc → browse tool; Esc again → leaves comment mode.
  - `?comment opens comment mode after the loading screen` and `?owner=test-owner is stored and removed from the address`.
  - `share review copies a comment-mode link` → clipboard text ends with `?comment` (grant `clipboard-read`/`clipboard-write`).
  - `page sits between rail and sidebar on wide screens` → at 1920×1080, the hero's bounding box doesn't intersect the rail or the sidebar.
  - `globe pauses and hub cursor is off in comment mode` → `document.documentElement.dataset.globe` reads `paused` after entering and `playing` after exiting (the globe script sets this attribute in its `review:enter`/`review:exit` listeners); hovering a hub row in comment mode leaves `.hub-cursor .ball` at scale 0.

- [ ] **Step 2: Run** `npx playwright install chromium && npm run test:e2e -- shell` → FAIL.

- [ ] **Step 3: Implement.** In `hero.html`: a `<button class="comment-toggle" id="comment-toggle" type="button">Comment</button>` in `.site-header .wrap` after the nav, styled as the page's secondary pill at nav size and kept visible below 760px; an inline script that on click (or on `page:revealed` when `?comment` is present) adds `<link rel="stylesheet" href="review/review.css">` once and `import('./review/comment-mode.js').then(m => m.enter())`; inside the globe script, `review:enter` remembers `playing` and calls `setPlaying(false)`, `review:exit` restores it; CSS `html.review-open .adjust, html.review-open .panel { display: none }` and the hub cursor disabled under `html.review-open`. In `review/`: the workspace DOM and styles per the Figma frame. On screens ≥ 1280px wide, `html.review-open body` becomes `position: relative` with left and right margins equal to the rail and sidebar widths. Below that, the sidebar overlays the page and collapses to a tab. Use `window.__lenis` for any programmatic scroll when present.

- [ ] **Step 4: Run** `npm run test:e2e -- shell` → PASS. Also `npm test` → still PASS.

- [ ] **Step 5: Commit** `git add hero.html review/comment-mode.js review/workspace.js review/review.css playwright.config.js tests/e2e/shell.spec.js && git commit -m "Add the Comment button and review workspace shell"`

---

### Task 6: Comments, arrows, highlights and the sidebar

**Files:**
- Create: `review/placing.js`, `review/marks-layer.js`, `tests/e2e/marks.spec.js`
- Modify: `review/comment-mode.js`, `review/workspace.js`, `review/review.css`

**Interfaces:**
- Consumes: `anchorAt`, `resolveAnchor`, `getName/setName/getDeviceId/getOwnerKey`, `ReviewStore`, `createWorkspace`.
- Produces: `placing.js` exports `createPlacing({ getTool, onDraft }) → { destroy() }`. While tool is comment or voice, a click calls `onDraft({ kind, at })`. While tool is arrow or highlight, a drag of at least 8px calls `onDraft({ kind, from, to })`. Pointer events on the page are captured, with `preventDefault` so links and buttons don't fire, and anything under `[data-review-ui]` is ignored. `marks-layer.js` exports `createMarksLayer() → { render(marks, { selectedId, showResolved }), onSelect(cb), reposition(), destroy() }`. It draws in an absolutely positioned layer covering the document, repositions on resize, on `ResizeObserver` of `document.body`, and after fonts and images load. A mark whose anchor resolves to null isn't drawn.

- [ ] **Step 1: Write the failing e2e tests** (fake store):
  - `places a comment on the headline` → click the hero title, composer opens, type name `Ana` (first time only) and text, Post → a pin appears at the click point (±4px) and a sidebar card shows `Ana`, the text and the "Comment" tag; stats show Comments 1.
  - `name is asked only once` → second comment goes straight to the text field.
  - `draws an arrow and a highlight` → drag on the page with each tool; both render, cards appear, stats count each.
  - `marks stay on target at another width` → place a pin on `#story .step:nth-child(3) h3`, resize 1440→1024: the pin is still inside that element's box.
  - `clicking a card scrolls to its mark and selects it`; clicking a mark selects its card.
  - `failed post keeps the draft and retries` → `__reviewFake.failNext('NETWORK')`, Post → error text shown, text still in the field; Post again → card appears.
  - `exit with an unsent draft asks first` → typed but unposted text, click the Comment-mode pill → a confirm inside the workspace; Cancel keeps the draft, Discard exits.
  - `owner can resolve and delete; resolved hide by default` → with `?owner=test-owner`, Resolve hides the card and pin and drops the count. "Show resolved" shows it faded. Delete removes it. Without the owner key, Resolve isn't shown, and Delete shows only on the reviewer's own marks.
  - `moved mark is listed but not drawn` → seed `__reviewFake` with a mark whose `at.path` is `#nope > div:nth-of-type(1)`: card shows "Moved", no pin.
  - `live updates arrive without refresh` → `__reviewFake.create(...)` from the test adds a pin and card while comment mode is open.
  - `links don't navigate while placing` → click "Learn more" with the Comment tool → URL unchanged, composer opens.
  - `nothing remains after exit` → after placing marks and exiting, no pins, arrows or highlights in the DOM.

- [ ] **Step 2: Run** `npm run test:e2e -- marks` → FAIL.

- [ ] **Step 3: Implement** placing, the marks layer and the composer/cards/stats per the Figma frame. Stats are open Comments, Voice memos, Arrows and Highlights. Card tags are Comment, Voice memo, Arrow and Highlight. Cards show relative time ("2 min ago").

- [ ] **Step 4: Run** `npm run test:e2e -- marks` and `npm run test:e2e -- shell` → PASS.

- [ ] **Step 5: Commit** `git add review/ tests/e2e/marks.spec.js && git commit -m "Place comments, arrows and highlights in comment mode"`

---

### Task 7: Voice memos

**Files:**
- Create: `tests/e2e/voice.spec.js`
- Modify: `review/workspace.js`, `review/comment-mode.js`, `review/review.css`

**Interfaces:**
- Consumes: `startRecording`, `pickMimeType`, `store.uploadAudio`, `store.create` with `{ kind: 'voice', at, text?, audio: { storageId, mime, durationMs } }`.

- [ ] **Step 1: Write the failing e2e tests** (fake store, fake mic):
  - `records and posts a voice memo` → Voice memo tool, click the timeline, Record → timer counts up; Stop → a preview player with play and the length; optional title; Post → card shows a play button and the length; pressing play starts playback (the `audio` element's `paused` becomes false).
  - `re-record and discard` → Re-record clears the preview and starts again; Discard closes the composer with nothing posted.
  - `stops at the limit` → with `window.__reviewMaxVoiceMs = 1500` set in the init script (the composer uses it when present, else 180000), recording stops by itself and shows "Memos can be up to 3 minutes".
  - `mic denied shows a message` → in a context without mic permission (`permissions: []` and no fake-UI flag, or stub `getUserMedia` to reject with `NotAllowedError`): message says the mic is blocked and how to allow it, with a "Type a comment instead" button that switches to the Comment tool keeping the pin.
  - `exit while recording asks first` → Recording, click the Comment-mode pill → confirm; Cancel keeps recording.
  - `failed upload keeps the recording` → `failNext('NETWORK')` on upload; error shown, preview kept, Post retries.

- [ ] **Step 2: Run** `npm run test:e2e -- voice` → FAIL.

- [ ] **Step 3: Implement** the voice composer and the voice card. Upload happens on Post: `uploadAudio`, then `create`. The card plays `audioUrl` with a custom play/pause control and progress in the page's style.

- [ ] **Step 4: Run** `npm run test:e2e` → all PASS.

- [ ] **Step 5: Commit** `git add review/ tests/e2e/voice.spec.js && git commit -m "Add voice memos to comment mode"`

---

### Task 8: Phone layout

**Files:**
- Create: `tests/e2e/phone.spec.js`
- Modify: `review/review.css`, `review/workspace.js`, `review/placing.js`

- [ ] **Step 1: Write the failing e2e tests** at 390×844 with `hasTouch: true, isMobile: true`:
  - `tools sit in a bottom bar and the sidebar is a sheet` → tool buttons are in a bar whose top is in the lower 20% of the viewport; the sidebar is collapsed to a handle showing the count; tapping the handle opens it over the lower part of the screen.
  - `tap places a comment` → tap the subtitle with the Comment tool; composer opens in the sheet.
  - `drag draws a highlight by touch` → touch drag with the Highlight tool draws one.
  - `toolbar fits` → no horizontal scroll (`scrollWidth === innerWidth`) in comment mode.

- [ ] **Step 2: Run** `npm run test:e2e -- phone` → FAIL.

- [ ] **Step 3: Implement** the narrow-screen layout (below 760px) and touch handling in `placing.js`. While a placing tool is active, a one-finger drag draws, and with Browse, one finger scrolls.

- [ ] **Step 4: Run** `npm run test:e2e` → all PASS.

- [ ] **Step 5: Commit** `git add review/ tests/e2e/phone.spec.js && git commit -m "Lay out comment mode for phones"`

---

### Task 9: Live check, deploy and docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Live check against the Convex dev deployment.** `npm run dev:config`, serve the folder on 8791, open `hero.html` in two browser windows without the fake flag. In window A, post a comment, an arrow, a highlight and a voice memo. Window B shows each one without refreshing, and its memo plays. With `?owner=<key>` in window B, resolve one mark and delete one: window A updates. Check the browser console: no errors.

- [ ] **Step 2: Docs.** README gains a "Comment mode" section covering:
  - what the button does,
  - the four mark types,
  - the owner link and that the key lives in Convex as `OWNER_KEY`,
  - `npm test`, `npm run test:e2e`, `npx convex dev` and `npm run dev:config` for local work,
  - the Vercel build command.

- [ ] **Step 3: Commit, then deploy** with Nathan's go-ahead to push. `git add README.md && git commit -m "Document comment mode"`. After the push, watch the Vercel deployment until it's Ready. On the production URL, repeat a short version of Step 1: post one comment, see it in a second window, resolve and delete it.

- [ ] **Step 4: Hand off** the owner link (`<production URL>/?owner=<key>`) to Nathan directly in chat, never in a file or commit.

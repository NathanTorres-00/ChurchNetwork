# Versions Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Versions pill and left-hand panel on the hero that list every `main` build and swap any old build into the page area, live.

**Architecture:** At build time a small Node module asks the Vercel API for the project's production deploys, merges plain summaries from a repo file (`versions.json`) or a `Version:` commit line, and `build-static.js` writes the list to `dist/versions.json`. A plain ES module in `versions/` (loaded by `hero.html`, no bundler, same as `review/`) draws the pill and panel, fetches that list when the panel opens, and shows a chosen build in an iframe pointed at its permanent deploy address.

**Tech Stack:** Vanilla JS ES modules, Node 24 `fetch`, Vitest (unit), Playwright (e2e), Vercel REST API `GET /v6/deployments`.

**Spec:** `docs/superpowers/specs/2026-10-30-versions-panel-design.md`

## Global Constraints

- Hero only. No pill on `network-multiply.html`, `network-globe.html`, `network-globe-pins.html`.
- Pill at the **bottom left**, mirroring Adjust (`.adjust` in `hero.html`: bottom 16px, white pill, hairline `--hair`, 13px/500 text). Visible to every visitor; not tied to `?controls=0`.
- Panel slides from the **left**, width `var(--panel-w)` (304px), white, `border-right: 1px solid var(--hair)`, `transform .7s cubic-bezier(.65, 0, .35, 1)`, Close button, Esc closes. No slide under `prefers-reduced-motion: reduce`.
- Only READY **production** deploys of the `churchnetwork` project (`prj_l343H91mwTjs9V7niqkw3HG62tL4`, team `team_JLMQ6yNjpfOz24KRC3kiBMdu`). One row per commit SHA (newest deploy wins). Newest first.
- Copy, exactly: title **Versions**; status **"N builds since Mon D"** (e.g. "12 builds since Oct 16"); tags **Current**, **Viewing**; bar **"Viewing the {date} version"** with button **Back to current**; error note **"Version history isn't available right now"**.
- Row date format: `Oct 28 · 11:24 AM`, in the viewer's own time zone.
- Summary precedence: `versions.json` entry for the SHA → `Version: …` line in the commit message → the commit's first line.
- Token env var: `VERCEL_VERSIONS_TOKEN`. Never written into `dist/`. Missing token or API failure never fails the build.
- A build shown inside the panel's frame never shows its own pill.
- Comment mode is not touched.

## Review Focus

1. **Token missing or API down at build time** → the build still succeeds and the panel shows only the current build plus the error note. (Task 1 `fetchDeployments` rejects → Task 2 test.)
2. **Same commit deployed twice** (redeploy, or the Oct 28 preview + production pair) → one row. (Task 1 test.)
3. **Opening the panel while the list is still loading or `versions.json` 404s** (local `python3 -m http.server` has no `dist/versions.json`) → panel opens, shows the note, no console error thrown. (Task 3 test.)
4. **Esc while viewing an old build** → panel closes and the live page is back with the globe resumed; Adjust's own Esc handling unaffected. (Task 3 test.)
5. **Phone width** → pill doesn't overlap Adjust or the hero buttons; tapping a row shows the build full screen with a way back. (Task 4 test.)

---

### Task 1: Version list module

**Files:**
- Create: `scripts/versions.js`
- Test: `tests/unit/versions.test.js`

**Interfaces:**
- Produces:
  - `summaryOf(message: string, notes: Record<sha, string>, sha: string) => string`
  - `buildVersionList({ deployments, current, notes }) => Version[]` where
    `deployments: { url: string, created: number, meta: { githubCommitSha: string, githubCommitMessage: string } }[]`
    (the Vercel API shape), `current: { url, created, sha, message } | null`, `notes: Record<sha, string>`, and
    `Version = { sha: string, href: string, createdAt: number, summary: string, current: boolean }`.
    `href` is `https://<url>/`. Sorted newest first; deduped by SHA keeping the newest; `current` (if given)
    replaces any deploy with the same SHA and is the only entry with `current: true`. If `current` is null, the
    newest entry is `current: true`.
  - `fetchDeployments({ token, fetch = globalThis.fetch }) => Promise<Deployment[]>` — calls
    `https://api.vercel.com/v6/deployments?projectId=prj_l343H91mwTjs9V7niqkw3HG62tL4&teamId=team_JLMQ6yNjpfOz24KRC3kiBMdu&target=production&state=READY&limit=100`
    with `Authorization: Bearer <token>`, follows `pagination.next` by adding `&until=<next>` until it's null,
    returns all `deployments`. Rejects on a missing token or a non-OK response.
  - `readNotes(path: string) => Record<sha, string>` — reads the repo `versions.json`
    (`[{ "sha": "...", "summary": "..." }]`) into a map; returns `{}` if the file is missing.

- [ ] **Step 1: Write the failing tests** in `tests/unit/versions.test.js`:

```js
const dep = (sha, created, message = `Subject ${sha}\n\nBody`) =>
  ({ url: `cn-${sha}.vercel.app`, created, meta: { githubCommitSha: sha, githubCommitMessage: message } });

test('summary prefers the notes file, then a Version line, then the subject', () => {
  expect(summaryOf('Fix it\n\nVersion: New logo\n\nMore', { a: 'From notes' }, 'a')).toBe('From notes');
  expect(summaryOf('Fix it\n\nVersion: New logo\n\nMore', {}, 'a')).toBe('New logo');
  expect(summaryOf('Fix it\n\nBody', {}, 'a')).toBe('Fix it');
});

test('list is newest first, one row per sha, href is the deploy root', () => {
  const list = buildVersionList({ deployments: [dep('a', 1), dep('b', 3), dep('a', 2)], current: null, notes: {} });
  expect(list.map(v => [v.sha, v.createdAt])).toEqual([['b', 3], ['a', 2]]);
  expect(list[0]).toMatchObject({ href: 'https://cn-b.vercel.app/', current: true });
  expect(list[1].current).toBe(false);
});

test('the build being made is the current row and replaces its own sha', () => {
  const current = { url: 'cn-new.vercel.app', created: 9, sha: 'b', message: 'X\n\nVersion: Today' };
  const list = buildVersionList({ deployments: [dep('a', 1), dep('b', 3)], current, notes: {} });
  expect(list[0]).toEqual({ sha: 'b', href: 'https://cn-new.vercel.app/', createdAt: 9, summary: 'Today', current: true });
  expect(list).toHaveLength(2);
});

test('fetchDeployments follows pagination and sends the token', async () => { /* fake fetch: page 1 next=5, page 2 next=null; assert 2 calls, second URL has until=5, header Bearer t, result length = sum */ });
test('fetchDeployments rejects without a token or on a non-OK response', async () => { /* ... */ });
test('readNotes maps sha to summary and tolerates a missing file', () => { /* ... */ });
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/versions.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `scripts/versions.js` with the four exports above. `Version:` match: first line matching `/^Version:\s*(.+)$/m`, trimmed.
- [ ] **Step 4: Run** `npx vitest run tests/unit/versions.test.js` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add scripts/versions.js tests/unit/versions.test.js && git commit -m "Build the version list from Vercel deploys"`

---

### Task 2: Write the list at build time, plus the notes file

**Files:**
- Modify: `scripts/build-static.js` (export stays `buildStatic`; the `if (process.argv[1] …)` main block becomes async)
- Create: `versions.json` (repo root, the summary notes)
- Test: `tests/unit/build-static.test.js`

**Interfaces:**
- Consumes: Task 1 `fetchDeployments`, `buildVersionList`, `readNotes`.
- Produces:
  - `buildStatic({ root, out, convexUrl, versions = [], versionsAvailable = false })` — additionally copies `versions/` to `dist/versions/` and writes `dist/versions.json` as `{ "versions": Version[], "available": boolean }`.
  - The repo-root `versions.json` must **not** be copied into `dist/` as-is (it would collide); it's only read by `readNotes`.
  - Main block: `notes = readNotes(join(root, 'versions.json'))`; `current` from `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_MESSAGE`, `Date.now()` (null when `VERCEL_URL` is unset); try `fetchDeployments({ token: process.env.VERCEL_VERSIONS_TOKEN })`, on any error log one line `Version history unavailable: <message>` and use `[]` with `available = false`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/build-static.test.js` (extend `fixture()` with `put('versions/versions-panel.js', 'export {}')` and `put('versions.json', '[{"sha":"a","summary":"S"}]')`):
  - `build copies versions/ and writes the list` — `buildStatic({ …, versions: [{ sha: 'a', href: 'https://x/', createdAt: 1, summary: 'S', current: true }], versionsAvailable: true })` → `dist/versions/versions-panel.js` exists; `JSON.parse(dist/versions.json)` equals `{ versions: [that entry], available: true }`.
  - `build writes an unavailable list by default` — no `versions` arg → `{ versions: [], available: false }`.
  - Existing tests still pass (the root `versions.json` notes file must not leak: assert `dist/versions.json` parses to the `{ versions, available }` shape, not the notes array).
- [ ] **Step 2: Run** `npx vitest run tests/unit/build-static.test.js` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the `buildStatic` changes and the async main block.
- [ ] **Step 4: Write `versions.json`** at the repo root with the 12 entries from the spec's draft table, using these full SHAs (oldest last):
  `0681ff291a4184cc96ccae01265b12a51acdfbe3`, `495082a6103e16e4ba3244bf06d623fea9741d17`, `3dd524e46dadccf56bbc613b271fc71334f9ca15`, `4d8ca0488b965ce491282c44cb961a7ca3f65ada`, `a2196d2cc70b5b6ce84301ce0690814a181f1e69`, `2e6cdaab9a1ca55f73898fa42cfdfac1b89e655e`, `3fda74349694aa6388cd496f1410a2ca5d2daa3c`, `749ad32b3562ae299e18fd9b1fdde9bdddfd5c7c`, `5775eab179cc1fe41bf282b9cbd02f6bafd04a74`, `1525f6bea2b6509b8caa7856d2c4a7825404a92e`, `661f6f742742c3a45fb650d3385058127f96a9b9`, `fa669724f960cdf618bdb9e5cb2e2a87d8f9400f`.
  Summaries copied verbatim from the spec table, same order.
- [ ] **Step 5: Run** `npm test` — Expected: all PASS.
- [ ] **Step 6: Commit** — `git add scripts/build-static.js versions.json tests/unit/build-static.test.js && git commit -m "Write the version list into the static build"`

---

### Task 3: Pill, panel and frame on the hero (desktop)

**Files:**
- Create: `versions/versions-panel.js`, `versions/versions.css`
- Modify: `hero.html` — a `<link rel="stylesheet" href="versions/versions.css">` in the head; the pill button before `<aside class="panel">`; a `<script type="module">` that imports `initVersions` and calls it; in the globe script beside the `review:enter`/`review:exit` listeners, listen for `versions:view` / `versions:current` the same way (pause, then restore).
- Test: `tests/e2e/versions.spec.js`

**Interfaces:**
- Produces:
  - `initVersions({ listUrl = '/versions.json' } = {})` — no-op when framed (`window.self !== window.top` or `?framed=versions`). Otherwise creates:
    - `button#versions-toggle.versions-pill` (text "Versions", `aria-expanded`, `aria-controls="versions-panel"`)
    - `aside#versions-panel.versions-panel` with head (title "Versions", `button.versions-close` "Close"), `p.versions-status`, `ol.versions-list` of `li > button.versions-row` (date line with tag, summary line)
    - `div.versions-stage` (fixed, left `var(--panel-w)` to the right edge, full height, above the page and below the panel) containing `div.versions-bar` ("Viewing the **{date}** version" + `button.versions-back` "Back to current") and `iframe.versions-frame` (`title="Earlier version of the site"`).
  - Fetches `listUrl` on first open. On a non-OK response, bad JSON, or `available: false`, the status reads "Version history isn't available right now" and the list shows whatever `versions` it has (possibly none).
  - Clicking a non-current row: iframe `src = href + '?framed=versions'`, stage shown, row gets `.is-viewing` + tag **Viewing**, dispatches `document` event `versions:view`. Clicking the current row, **Back to current**, Close, or Esc (while open) hides the stage, clears `src` to `about:blank`, dispatches `versions:current`. Esc also closes the panel.
  - Date: `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })` + `' · '` + `{ hour: 'numeric', minute: '2-digit' }`.
- Visual: match the mockup in the spec conversation (row hover `#F4F4F6`, viewing row `#3F3F46` fill with white text, tag pill 10px). Pill sits `left: 16px; bottom: 16px; z-index: 6`; panel `z-index: 7`; stage `z-index: 6`, bar `#3F3F46`.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/versions.spec.js`. In `beforeEach`, `page.route('**/versions.json', r => r.fulfill({ json: FIXTURE }))` where `FIXTURE.versions` has 3 entries whose `href`s are `http://127.0.0.1:8792/network-multiply.html` (two old ones) and the current one; then `openPage(page)`.
  - `pill opens and closes the panel` — click `#versions-toggle` → `#versions-panel` has class `is-open`, status text `3 builds since …`, 3 `.versions-row`; click `.versions-close` → not `is-open`.
  - `clicking an old version swaps it into the stage` — click the 2nd row → `.versions-stage` visible, `.versions-frame` `src` contains `network-multiply.html?framed=versions`, bar text contains `Viewing the`, row has `is-viewing`, `html[data-globe="paused"]`.
  - `back to current restores the live page` — then click `.versions-back` → stage hidden, frame `src` is `about:blank`, `html[data-globe="playing"]`.
  - `Esc closes the panel and returns to current` — open, view row 2, press Escape → panel closed, stage hidden.
  - `missing list shows the note` — override the route with `r.fulfill({ status: 404 })` → status text `Version history isn't available right now`, no `pageerror` events.
  - `framed builds hide the pill` — `page.goto('/hero.html?framed=versions')` (with `openPage`) → `#versions-toggle` count 0.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/versions.spec.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `versions/versions-panel.js`, `versions/versions.css`, and the `hero.html` changes.
- [ ] **Step 4: Run** `npx playwright test tests/e2e/versions.spec.js` — Expected: PASS. Then `npm run test:e2e` — Expected: no other spec regresses (watch `shell.spec.js` and `phone.spec.js` for pill overlap).
- [ ] **Step 5: Commit** — `git add versions/ hero.html tests/e2e/versions.spec.js && git commit -m "Add the Versions panel to the hero"`

---

### Task 4: Phones and reduced motion

**Files:**
- Modify: `versions/versions.css`, `versions/versions-panel.js`
- Test: `tests/e2e/versions.spec.js`

**Interfaces:**
- Consumes: Task 3 elements and classes.
- Produces: at `max-width: 640px` the panel covers the screen (`width: 100%`), the stage is full screen (`left: 0`), and the bar gains `button.versions-reopen` "Versions" (left) beside **Back to current**. Tapping a non-current row closes the panel and shows the stage. `versions-reopen` opens the panel over the stage. Under `prefers-reduced-motion: reduce` the panel has `transition: none`.

- [ ] **Step 1: Write the failing tests** (`test.describe` with `viewport: { width: 390, height: 844 }`, `hasTouch: true`):
  - `phone: tapping a version shows it full screen` — open panel, tap row 2 → panel not `is-open`, stage bounding box `x === 0` and width 390, `.versions-reopen` visible.
  - `phone: Versions in the bar reopens the panel` — tap `.versions-reopen` → panel `is-open`, stage still showing.
  - `phone: pill clears Adjust and the hero buttons` — `intersects()` (from `helpers.js`) of `#versions-toggle` with `#adjust` and with each `.button-primary, .button-secondary` in the hero is false.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/versions.spec.js` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** the CSS and the row/reopen behavior.
- [ ] **Step 4: Run** `npx playwright test tests/e2e/versions.spec.js` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "Versions panel on phones"`

---

### Task 5: Token, README, deploy and check

**Files:**
- Modify: `README.md` (a **Versions** section under Hero: what the pill does; where the list comes from; the `versions.json` notes file and the `Version:` line convention, placed right after the commit subject; `VERCEL_VERSIONS_TOKEN`; that Vercel Authentication is off so build addresses are public; that Comment mode inside an old build writes to the live review; the Deploying section notes `dist/versions.json` and `versions/`)

- [ ] **Step 1: Token.** Ask Nathan for a Vercel access token (Account Settings → Tokens, scoped to the team). Add it: `vercel env add VERCEL_VERSIONS_TOKEN production` (and `preview`). Do not commit it or echo it.
- [ ] **Step 2: Retention.** Confirm with Nathan that Project → Settings → Security → Deployment Retention keeps production deploys indefinitely.
- [ ] **Step 3: README** as above. Convention going forward: the head commit of every push to `main` carries a `Version: <plain summary>` line right after its subject (a commit can't name its own SHA, so the notes file is for past builds and corrections).
- [ ] **Step 4: Run** `npm test && npm run test:e2e` — Expected: all PASS.
- [ ] **Step 5: Commit and push** (Nathan approves the push). This commit is the head of the push, so it carries the line: `git commit -am $'Document the Versions panel\n\nVersion: Versions panel: step back through every earlier build of the site'`, then `git push`.
- [ ] **Step 6: Verify the deploy.** In the Vercel build log, no `Version history unavailable` line. `curl -s https://churchnetwork.vercel.app/versions.json` → `available: true`, 13 entries, newest is the new build with `current: true`, summaries match `versions.json`. Open the live site, open Versions, step through at least three old builds: each loads with no sign-in and the globe runs; Back to current works.

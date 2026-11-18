# Feedback pins: a guide for coding agents

Feedback pins keeps comments on this site's pages and components. You (a coding
agent working in this project) may list, add, reply to, resolve, reopen and
delete them for the person you work for. Every change you make is shown in
Stacki as made by **that person's agent**, with your name.

## Use the tool

Run these from anywhere inside the project. The tool validates the data, writes the
file the way Stacki does, and records you in the activity log. It needs Node 18+.

```sh
T=.stacki/apps/feedback-pins/feedback.mjs

node $T list                                  # open threads: id, status, file, element, comments
node $T list --status all --json              # everything, as JSON
node $T list --file src/pages/index.astro     # one page or component

node $T add --file src/pages/index.astro --tag a --class button --text "Get started" \
  --body "This link has no visible focus style." --agent Claude --model claude-opus-5-5
node $T reply   --thread t_1a2b3c4d5e6f --body "Fixed in the button component." --agent Claude
node $T resolve --thread t_1a2b3c4d5e6f --agent Claude
node $T reopen  --thread t_1a2b3c4d5e6f --agent Claude
node $T delete  --thread t_1a2b3c4d5e6f --agent Claude                    # soft delete
node $T delete  --thread t_1a2b3c4d5e6f --comment c_9f8e7d6c5b4a --agent Claude
```

- `--agent` is required on every change: the name you go by as an agent (the
  examples use `Claude`).
  `--model` is optional.
- The person you work for is read from `git config user.name`. Add
  `--login <github-login>` if you know their GitHub login (it shows their picture).
- `add` prints the new thread id; `reply` prints the new comment id.
- Exit code 1 and a message on stderr mean nothing was written.

## Anchoring a comment to an element

A comment belongs to a **file** (`--file`, a path from the project root, such as
`src/pages/pricing.astro` or `src/components/Hero.astro`) and optionally to an
**element** in it. Describe the element as it is written in that file:

| Flag | Meaning |
|---|---|
| `--tag` | The tag or component name: `a`, `section`, `Button` |
| `--class` | A class the element has; repeat for more. A subset is enough |
| `--text` | Words the element contains (its own text) |
| `--index` | Which match, from 0, when several elements fit |
| `--key` | The element's `data-stacki-key` value, if it has one (exact, survives edits) |
| `--at` | Where on the element, `x,y` each 0 to 1 (optional; default its top left) |

### Pinning inside a component

A page's file owns only its own markup. A nav link that `index.astro` shows through
`<Layout>` → `Nav` → `NavLink` is written in `NavLink.astro`, so comment on **that
file** (since 1.8.0, the way the app does it too):

```sh
node $T add --file src/components/global/NavLink.astro --tag a --class nav_link \
  --body "This link has no visible focus style." --agent Claude
```

The thread belongs to the component's file and shows wherever the component is open;
on pages, the component's instances show a small "N inside" count.

Threads from 1.7 may carry a Stacki **node ref** instead (`ref`, `refAt`, `refName`:
the page's element first, then each element down to one inside closed components).
The app still draws them where the ref resolves, read-only. The tool still accepts
`--ref '{"steps":[{"file","key"?,"nodeId"?,"copy"?}]}'`, `--ref-at x,y` and
`--ref-name` for such threads, but prefer the component's own file.

### Scope: comments on a component's instances

A comment on a component instance can apply to more than that instance. Add
`--scope` and `--component <Name>` (the component's name as used in the page):

| `--scope` | Applies to | Also needs |
|---|---|---|
| `instance` (default) | the one element described | |
| `section` | every instance inside one `<section>` of the page | `--section-key` (the section's `data-stacki-key`) or `--section-class` |
| `page` | every instance on `--file` | |
| `component` | every instance across the site, and the component's own file | `--component-path src/components/Heading.astro` (recommended) |
| `site` | older name for `component`; the tool stores it as `component` | |
| `matches` | every element of a component's own markup like the pinned one (same tag, and its first class when it has one): "Every .footer_link in Footer". `--within instance` (default) is the instance clicked, `all` every instance | `--component-path` (the file matched, such as `src/components/global/Footer.astro`), `--match-tag a`, `--match-class footer_link` (optional), and usually `--ref` to the clicked element |

```sh
node $T add --file src/pages/index.astro --tag Heading --scope page --component Heading \
  --body "Headings should use sentence case." --agent Claude
```

The app no longer offers scopes for new comments (1.8.0); scoped threads are still
read and shown. Use the narrowest scope that says what you mean.

Stacki draws a scoped comment's pin on every matching instance (its number shows a
"+") and names the scope in the list ("All Headings on this page").

Stacki finds the element when the file is open and draws the pin there. A key wins
over a description. With no element, the comment is on the file as a whole. If no
element matches, the thread shows as "Detached" and a person can re-attach it.

## Where the data lives

`.stacki/app-data/feedback-pins.json`, committed with the site. It is Stacki's
app storage file: `{ "version": 1, "values": { … } }` with one key per thread,
`pins/<thread id>`, whose value is the thread **as a JSON string**. Keys are sorted
and the file is two-space JSON. Every value must be a string: one value that is not
makes Stacki refuse the whole file. Prefer the tool to editing this by hand.

## The thread schema (`schemaVersion: 2`)

```json
{
  "schemaVersion": 2,
  "id": "t_1a2b3c4d5e6f",
  "page": "src/pages/index.astro",
  "target": { "name": "a", "classes": ["button"], "text": "Get started", "index": 0 },
  "key": "k3f9a0c1b2d4e",
  "at": { "x": 0.5, "y": 0.5 },
  "status": "open",
  "createdAt": 1794358028647,
  "updatedAt": 1794358028647,
  "comments": [
    {
      "id": "c_9f8e7d6c5b4a",
      "actor": { "kind": "agent", "person": { "name": "Timothy Ricks", "login": "flowtricks" }, "agent": { "name": "Claude", "model": "claude-opus-5-5" } },
      "author": "Timothy Ricks",
      "github": "flowtricks",
      "body": "This link has no visible focus style.",
      "createdAt": 1794358028647
    }
  ],
  "activity": [
    { "action": "comment", "at": 1794358028647, "commentId": "c_9f8e7d6c5b4a", "actor": { "kind": "agent", "person": { "name": "Timothy Ricks", "login": "flowtricks" }, "agent": { "name": "Claude" } } }
  ]
}
```

| Field | Rules |
|---|---|
| `id` | `t_` and 12 lowercase hex characters (`c_` for comments). Unique. Matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,55}$` (no `:`) |
| `page` | Required. The file path from the project root |
| `target`, `key`, `at` | Optional anchor, as above. `target.kind` is optional |
| `ref`, `refAt`, `refName` | Optional (1.7.0): the element pinned inside component instances, as above. `target`, `key` and `at` still describe the page's own element that holds it, for older versions |
| `scope` | Optional (write `component` for site-wide; `site` is read as it): `{ "kind": "section" \| "page" \| "site" \| "component" \| "matches", "match"?: { "tag": "a", "class"?: "footer_link" }, "within"?: "instance" \| "all", "component": { "name": "Heading", "path"?: "src/components/Heading.astro" }, "page": "<file>", "section"?: { "key"?: "k…", "target"?: { … } } }`. Absent means this instance only |
| `status` | `open` or `resolved`; with `resolvedAt` (ms) and `resolvedBy` (text) when resolved |
| times | Milliseconds since 1970 (`Date.now()`) |
| `comments` | At least one with a non-empty `body` (at most 2,000 characters); at most 200 |
| `actor` | `kind` is `human`, `agent` or `unknown`. An agent sets `agent.name` and `person` (the person it works for: `name`, `login` if known). Never write `human` |
| `activity` | Append-only log of `{ action, at, actor, commentId? }`; `action` is `comment`, `reply`, `resolve`, `reopen`, `edit`, `delete` or `move`. At most 200 entries |
| `deletedAt` | A soft delete, on a thread or a comment. Never remove a key or a comment |
| others | `viewport`, `snapshot`, `reactions`, `mentions`, `editedAt`, `by`, `avatar`: written by the app; keep them as they are |

## Rules

- **Always record yourself.** Every change appends one `activity` entry with your
  agent actor. A change with no entry is shown as "edited outside Stacki".
- **Never rewrite someone else's words.** Reply instead of editing another
  comment. Edit only comments your own agent actor wrote, and log `edit`.
- **Delete softly.** Set `deletedAt` and log `delete`; never remove a key.
- **Keep the file valid.** Keys sorted, values are JSON strings, `version: 1`.
  Leave any value you cannot parse exactly as it is.
- **Stay in bounds:** 990 threads, 256 KiB per thread, 4 MiB in all.
- Do not touch `.stacki/apps/`; the data lives only in `.stacki/app-data/`.
- **No native dialogs.** The app never calls `alert()`, `confirm()` or `prompt()`:
  they draw the operating system's sheet and block the window. Questions in the
  app are an in-app popover (`FP.confirmAction` in `confirm.js`, the UI kit's
  `stackiConfirm` when it exists). The tool never asks either: `delete` runs
  without a prompt, so be sure before you call it; it is a soft delete.

When a person asks you to "resolve every comment the client left", list with
`--json`, choose by `comments[0].author` or `actor`, and resolve each by id.

# Feedback pins

Comment anywhere on a page or component, right on the canvas in Stacki. Pins
sit on the exact spot you clicked, threads
have replies, @mentions, reactions and unread markers, and everything is kept in
the project, so feedback commits, merges and pulls with the site. No server.

It is also a tour of the Stacki app API: each feature below names the API it
uses. The full reference is Stacki's `docs/apps.md`.

## Using it

The panel stays calm: a header row (the open file, the comment icon, ⋯), the
Open / Resolved / All tabs, and the list. Everything else opens from an icon.

- **Comment mode** (the comment icon, C, or ⌘⌥⇧1) is on when the app opens:
  click anywhere on the canvas, type, press ⌘↵. It stays on for the next
  comment; Escape turns it off.
- **Search** (the magnifier, or /) and **Filters** (files, people, sort) sit
  beside the tabs. A dot on the filter icon means a filter is not the default;
  **Filters** in the popover resets them.
- **⋯** holds Show pins, Outline pinned elements, Next unresolved, Export,
  Import, Your name (only when Stacki knows no name for you) and Keyboard
  shortcuts.

| Key | In the panel (when you are not typing) |
|---|---|
| C | comment mode on or off |
| J / K | next / previous thread, and go to its pin |
| ↵ | go to the open thread's pin |
| R | reply to the open thread |
| E | resolve or reopen it |
| / | search |

| Command (anywhere in Stacki, also in the palette's Apps tab) | Key |
|---|---|
| Feedback: new comment (registered at run time, for roles that may comment) | ⌘⌥⇧1 |
| Feedback: show or hide pins | ⌘⌥⇧2 |
| Feedback: next unresolved thread | ⌘⌥⇧3 |

## The tour: feature by feature

### Look and feel: the UI kit

The panel is built from Stacki's own components, served to every app from
`__stacki/ui.js` and `__stacki/ui.css`: `<stacki-tabs>` (Open, Resolved, All),
`<stacki-search>`, `<stacki-dropdown>` (files, people, sort),
`<stacki-textarea>`, `<stacki-input>`, `<stacki-button>` (with `icon` and
`aria-label` for the comment-mode and search icons), `<stacki-menu>` (⋯, its
`checked` rows end with their check) and `<stacki-reset-label>` (the filters'
reset). The filter button and its popover are our own markup inside
`.stacki-ui`, since the kit has no filter icon or popover. Everything uses the `--stacki-*` tokens, so a
change to Stacki's design reaches the app with Stacki's next release.
`stacki.ui.theme()` and `theme.change` give the pin colours, which the overlay
needs as hex.

### Placing a pin: canvas clicks and point anchors

- `canvas.capture({ on: true, cursor })` takes canvas clicks for comment mode;
  `canvas.click` answers the element and the point within it (`at`, 0–1 each way),
  and the `canvas.capture` event's `reason` says who ended it: `'escape'` and
  `'replaced'` turn comment mode off, `'app'` is the app's own call. Clicks on a
  pin stay the pin's while comment mode is on.
- A pin is a `label` overlay item on a **point anchor**, `{ nodeId, at }`, so it
  stays on that spot through scroll, resize, reflow and zoom. A click on markup no
  element owns is kept as a `rect` anchor.
- `node.key` writes Stacki's durable `data-stacki-key` on the element so the pin
  finds it again after edits, moves and Git merges; `app.info().can.setAttribute`
  says whether this editor can write it (Studio cannot yet, so pins fall back to
  matching the element's tag, classes and text).
- **The cursor.** In pin mode a comment bubble follows the pointer:
  `canvas.capture({ on: true, cursor: { image: 'cursor.svg', hotspot: { x: 2, y: 22 } } })`.
  `cursor.svg` is 24 × 24 pixels and well under 4 KiB; the hotspot is the tail
  tip, where the pin lands. A Stacki that refuses the image gets `'crosshair'`.

### Pins on the canvas: overlays

- `overlay.set` draws every pin of the open file as Stacki's `pin` item: a round
  24px badge with a tail, numbered to match the list, `tone: 'accent'` when open
  and `'success'` when resolved, the author's picture (`avatarURL`) on hover, and
  `active: true` (a ring) for the open thread. A pulse blinks the ring.
- **Clustering:** `cluster: true` labels within 24px collapse into one count
  bubble, and zooming in spreads them out again.
- **Hover card:** `overlay.hover` names the pin under the pointer; the app draws
  `hover-card.html` as an overlay `frame` beside the pin's badge (placed with
  `node.measure`, flipped near the canvas's edges), styled as Stacki's popover.
  The card and the app talk with `overlay.post` / `overlay.message`: the card says
  it is ready, the app sends the first comment, its author and the snapshot, and
  the card sends back its height so the frame fits it.
- **Open thread:** its element gets a `box` whose `label` previews the comment.
- **Outlines** (⋯ → Outline pinned elements): a dashed `box` on every pinned element.
- **Pulse:** going to a pin flashes it a few times by redrawing it.
- `overlay.click` on a pin opens its thread.
- **Move:** in a thread, **Move** shows "Click the new spot · Esc to cancel" and
  the next canvas click places the pin again (logged as `move`). Escape cancels
  only the move.
- **Drag to move:** pins are `draggable` (Stacki shows a grab cursor; the hover
  card says "Drag the pin to move it"). `overlay.drag` reports `start`, `move`
  and `end`; the app redraws the pin under the pointer on each move and writes its
  new place once on `end` (a cancelled drag puts it back). A pin collapsed into a
  count bubble cannot be dragged: zoom in until it stands alone. **Move** in the
  thread still works by two clicks.
- **Detached pins:** a pin whose element is gone is not drawn; its thread says
  "Detached" and offers **Re-attach**, which places it with the next click.

### Going to a comment: navigation

Clicking a thread, J/K, ↵, a pin, or **Next unresolved** takes you to it,
wherever it was left:

- `page.open({ path })` opens its page, or `component.open({ path })` enters its
  component, each resolving once the file is open;
- `canvas.setWidth` puts the canvas back at the exact width it was left at
  (where `app.info().can.setWidth`), else `canvas.setDevice` its device class;
- `canvas.scrollTo({ nodeId, block: 'center' })` waits for the element to be
  drawn and brings it into view (where `app.info().can.scrollTo` allows), and
  `selection.set` selects it;
- the pin pulses.

A role without the Pages panel cannot open other pages, and one that may not
edit components cannot enter them: the app says so instead of moving.

### Pages and components: per-file threads

`page.get()` gives the open file's path and tree, the component's own when you
are inside one. A thread belongs to that file:
the header reads **Page · index.astro** or **Component · Hero.astro** (a file
under `src/pages/` is a page). The file name in the header is a dropdown: the open
file's threads, or **All pages**, every thread in the project grouped by file (the
open file first, then the most recently active, each heading with its count). The
tabs, search and filters apply across pages, and a click on a thread elsewhere opens
its page (or the page a component comment was left on) and goes to the pin. The
choice is remembered per person (`prefs/view`, local). `page.change` switches files.
`hover.change` lights up a thread in the list while you hover its element.

### Threads: storage, people, permissions

- **Storage.** `stacki.storage` with `scope: 'project'` keeps one key per thread
  in `.stacki/app-data/feedback-pins.json`: it commits and merges with the site.
  `scope: 'local'` keeps what is only yours: your display name, read markers,
  the Show pins and Outline choices.
- **Who you are.** `person.get` signs comments (Git name, GitHub login and
  avatar) and gives a stable id, so **Mine**, reactions and unread work even when
  you hide your details from apps (`person.change`).
- **Replies, edits, deletes, resolve.** Edit and delete your own comments.
- **@mentions.** Type `@` for the picker (↑↓, Enter or Tab). It lists
  `people.list()` (role members, then the project's committers, with their
  pictures), then anyone else who has commented. Mentions of you are picked out
  and filterable (**Mentions me**).
- **Reactions:** 👍 ❤️ 🎉 👀 ✅, one per person per emoji.
- **Unread:** a blue dot on threads with comments from others since you last
  opened them, kept per person in local storage.
- **Permissions:** see [Roles](#roles).
- **Context.** Each thread records the device and canvas width it was left at
  (`canvas.getViewport`, `canvas.change`), shown as a chip ("Phone · 390px").
- **Snapshot.** A new thread on an element keeps a thumbnail of it:
  `canvas.snapshot({ nodeId, widthMax })`, taken at 240 CSS pixels times the
  screen's pixel ratio so it is sharp, shown at its natural size at the top of
  the thread and in the hover card.
  Desktop only (`app.info().can.snapshot`); Studio threads have none. A thumbnail
  over 120,000 characters is skipped, and none is taken once the project's threads
  fill 3 MiB of the app's 4 MiB of storage.

### Keeping people in the loop

- `app.badge` shows the project's open threads on the Apps rail button.
- `storage.change` with `origin: 'other'` (a teammate in Studio, or a `git pull`)
  refreshes the list and sends `ui.notify`: by name when someone mentioned you,
  else a count. What arrived while the app was closed is announced once on open.
- `project.change` reloads after edits to the open file.

### Export and import: project files

**Export** writes Markdown (a checklist per file), CSV or JSON with
`files.write` to a path you choose, one undo step on Desktop. Writing files
needs a role with `code:edit`; without it, **Copy** (`clipboard.write`, since
the sandboxed frame cannot write the clipboard itself) and **Download** still
work. **Import** reads the JSON back.

### Roles

The manifest declares four switches; admins set them per role in Settings,
Roles, under Feedback pins:

| Permission | Default | Without it |
|---|---|---|
| `comment`: Leave and reply to comments | on | **View only**: threads, pins and navigation work; the comment icon, comment mode, replies, reactions, edit, Move, dragging and the New comment command are hidden, and the header shows a muted "View only" chip |
| `resolve-threads`: Resolve threads | on | no Resolve or Reopen |
| `delete-any-comment`: Delete anyone's comments | off | people delete only their own |
| `moderate`: Moderate feedback | off | people edit only their own |

Turn `comment` off to make a Reviewer or Client role read-only. The app reads the
switches from `role.get().permissions`, follows `role.change` live (no reload),
and checks `role.can` again before resolving. Stacki stores and resolves them;
the app enforces them, as the guide asks.

### Moving from version 1.0 and 1.1

Older versions wrote pins into the markup as `data-feedback` attributes, or kept
them in a self-hosted Cloudflare Worker. The first time a file with such pins is
open, the app moves them into project storage silently: each attribute is
removed with `node.removeAttribute`, one undo step named "Move feedback pin to
project storage" (Desktop; Studio copies them and leaves the attribute).
Version 1.0 signed comments with the role's name ("Admin") when it knew no
person; those comments are given to the person running the move (`person.get`),
and threads an earlier move stored that way are fixed once, on load. Worker pins
move with the old version's Export, then Import here.

## Coding agents

AI coding agents working in the project can list, add, reply
to, resolve, reopen and delete comments: "resolve every comment the client left",
"audit accessibility and leave comments". **[AGENTS.md](AGENTS.md)** is their
guide, and `feedback.mjs` beside it is their tool: it validates the data and
writes Stacki's storage file exactly as Stacki does.

- **Who did what.** Every comment carries an `actor`: `human` (done in the app),
  `agent` (a coding agent, with its name, working for a person) or `unknown`.
  An agent's comment shows as "Timothy's agent" with a sparkle **Claude** badge
  (its tooltip names the model and the person).
- **Activity log.** Each thread keeps an append-only log of comment, reply,
  resolve, reopen, edit, delete and move, with the actor and time. The list shows
  the latest ("Resolved by Timothy's agent (Claude) · 2m"); the full log is the
  line's tooltip.
- **Outside edits.** A change that arrives from outside Stacki (`storage.change`,
  origin `other`) with no log entry of its own is labelled "Edited outside Stacki"
  in the log, never assumed human. The label is worked out from the data alone,
  so two windows write the same entry and Git merges it as one.
- **Soft delete.** Deleting sets `deletedAt` and logs it; the record survives. Deleting a thread asks first in a small popover on its trash button (`confirm.js`), never the browser's own dialog.
- **Unreadable entries** (bad JSON, no file, a newer schema) are skipped with a
  "1 comment couldn't be read" note (its tooltip names the key and why), and are
  never rewritten.
- **Filter:** People → Left by agents.

### Commenting inside components

A pin belongs to the file open on the canvas. On a page it goes on the page's own
elements; to comment on a nav link that `<Layout>` renders, go inside the component
(double-click it, or pick it in the Navigator) and pin there: the thread belongs to
that component's file (keyed with `node.key` in it), so it shows wherever the
component is open. On a page, each instance of a component with open threads in its
own file shows a small "N inside" count; clicking it opens the component at its first
thread.

- **Comment mode** (the pin button) observes clicks (`canvas.capture` with `mode:
  'observe'`): the editor keeps selecting, double-clicking into components and the
  Navigator, and a single click also puts a draft pin on the clicked element. Drag the
  draft to move it, or click elsewhere; your words stay.
- **Comment on selection** (the + button, or C): select an element on the canvas or
  in the Navigator, then start a draft at its centre.
- Cancel, or Escape while the panel has focus, takes the draft away (Escape on the
  canvas is the editor's: it leaves a component). Opening another rail
  panel leaves comment mode; words typed stay, parked until you place them again (also
  after going into another file).
- Pins from 1.7 inside closed components (stored by ref) still show where their ref
  resolves, read-only: open the component to comment there.

Threads saved with scopes (section, page, site, component, matches) still read and
show as before ("All Headings on this page"), drawn on every matching instance;
new comments have no scope.

## Where comments are saved

```json
{
  "id": "t_a1b2c3",
  "page": "src/pages/index.astro",
  "key": "k3f9a0c1b2d4e",
  "at": { "x": 0.33, "y": 0.5 },
  "target": { "kind": "element", "name": "button", "classes": ["btn"], "text": "", "index": 1 },
  "viewport": { "device": "phone", "widthPx": 390 },
  "snapshot": { "url": "data:image/png;base64,…", "width": 160, "height": 90 },
  "status": "open",
  "createdAt": 1762790400000,
  "updatedAt": 1762790500000,
  "comments": [
    { "id": "c_x", "author": "Tim", "github": "tim", "by": "…", "body": "Make this primary @sam", "mentions": ["sam"], "reactions": { "👍": ["…"] }, "createdAt": 1762790400000 }
  ]
}
```

`page` is the thread's file: a page's path or a component's.

## Limits

- The canvas draws up to 64 pins and outlines at once: Stacki's overlay limit.
- A comment holds 2,000 characters; a thread 200 comments; a reaction 64 people.
- The project holds up to 990 threads: Stacki keeps at most 1,000 keys per app.

## What the app API does not offer yet

- A filter icon and a popover in the kit: the filter button and its popover are
  the app's own markup.
- A pressed (toggle) state on `<stacki-button>`: the comment-mode icon marks its
  host and says its state in its name.
- Shortcut hints and separators in `<stacki-menu>` rows.
- Whether `commands.register` replaces the app's earlier run-time commands (the
  app relies on it to drop New comment for a view-only role).

## Install

Keep this folder in `.stacki/apps/feedback-pins/`: it is installed as it is. To
share it as a file:

```sh
cd feedback-pins && zip -r ../feedback-pins.zip . -x '.*'
```

In Stacki: **E** → the header's **+** menu → **Upload app file** → **Install** →
**Open**.

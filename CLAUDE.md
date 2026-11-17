# Read this first: you are in the Astro migration folder

This folder is **not** the live site. It is a second checkout of the same repo, set up on 2026-11-17 so
the move to Astro and Lumos can happen without touching the site people use.

| Folder | Branch | What it is |
|---|---|---|
| `../NetworkMultiply` | `main` | The live site (Vercel deploys `main`). Nathan keeps fixing it there. **Never edit, commit, switch branches or run `git stash`/`reset` in that folder from here.** You may read its files and serve it for comparison. |
| `../NetworkMultiply-astro` (this one) | `AstroMigrate` | The migration. All your work goes here. |

Both folders share one git repo (this is a `git worktree`), so commits made here are visible from the other
folder, and the other way round, but neither folder's files change when the other one does.

## The job

Follow the plan, task by task:

- Plan: `docs/superpowers/plans/2026-11-15-astro-lumos-migration.md` (updated 2026-11-17 for this setup)
- Design (approved by Nathan): `docs/superpowers/specs/2026-11-15-astro-lumos-migration-design.md`

Read both before starting. Task 1 Step 1 (tag and branch) is already done: tag `pre-astro` is at `4313c39`,
the last `main` commit when this branch was cut. Start at Task 1 Step 2. Use the
`superpowers:executing-plans` or `superpowers:subagent-driven-development` skill, as the plan says.

## Rules

- **Do not push, merge, deploy, or run `vercel` commands.** Pushing `AstroMigrate` would make Vercel
  build a preview. Production would not change, but Nathan hasn't approved a preview yet. Everything is checked locally.
- **Do not merge `AstroMigrate` into `main`.** Nathan decides when the migration is done.
- Commit on `AstroMigrate` after each task, in the repo's style (`Area: what changed`). The `Version:` line
  that `main` needs on every push is not needed here, because nothing here is pushed.
- Stop where the plan says to stop for Nathan, especially **Task 4 Step 6** (he opens the project in
  Stacki before the pattern is repeated).
- The loose files in the main folder (thumbnail PNGs, the mp4, `Vision & How-To English/`) are not in this
  folder and should stay out of the site.

## Keeping up with `main`

`main` keeps moving while this migration runs, and the design says the port follows what `main` holds.

- Before starting each task, run `git log --oneline pre-astro..main`. Anything listed is new on `main`.
  Read those commits, and if they touch a page or section you have ported or are about to port, carry the
  change into the Astro version. Note it in `docs/superpowers/migration-differences.md` as "ported from main
  <sha>".
- Port from **committed** changes only. Ignore uncommitted edits in `../NetworkMultiply`; they're still in progress.
- As this branch was cut, `main` had uncommitted work in progress: the footer globe loading once at idle time
  and replaying on return (`assets/site-footer.js`, plus edits to `hero.html`, `groups.html` and
  `tests/e2e/groups.spec.js`). Expect it to land on `main` soon and port it then.
- To pull `main`'s files in, read them from `../NetworkMultiply` or with `git show main:<path>`. Don't
  merge `main` into this branch; this branch deletes and restructures too much for a merge to help.

## Running things

- New site: `npm run dev` (or build and `npm run preview`) in this folder, on port 4321.
- Old site for side-by-side comparison: in `../NetworkMultiply`, run
  `python3 -m http.server 8792 --bind 127.0.0.1` (read-only use of that folder). `tools/compare.mjs`
  (written in Task 1) screenshots both.
- `node_modules` is separate in each folder. Run `npm install` here after the scaffold step.

## Open questions for Nathan

- The production domain for `SITE_URL` (Task 1 Step 4). Until he answers, use `https://example.com` and
  list it as open.
- The Lumos version: npm lists `create-lumos` at 0.3.9; the plan assumed Lumos 1.0.4. Check what the
  scaffold actually gives you (see Task 1 Step 2).

## When the migration is finished

Hand back as the plan's Task 8 Step 6 says. After Nathan approves, the branch is merged into `main` from
the main folder, and this folder is removed with `git worktree remove ../NetworkMultiply-astro`. Comment
mode, Versions and Convex can always be restored from tag `pre-astro`.

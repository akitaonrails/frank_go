# Keeping frank_go rebaseable on Sabaki upstream

frank_go is built **on top of Sabaki** (fork base: `akitaonrails/Sabaki`,
upstream: `SabakiHQ/Sabaki`). We want to keep pulling upstream improvements, so
every change follows these rules.

## Remotes

| Remote | URL | Purpose |
|---|---|---|
| `origin` | git@github.com:akitaonrails/frank_go.git | our app |
| `sabaki` | git@github.com:akitaonrails/Sabaki.git | the user's Sabaki fork |
| `upstream` | https://github.com/SabakiHQ/Sabaki.git | Sabaki upstream |

## Rules for new code

1. **All frank_go code lives in `src/frank/`** (modules, components, styles) and
   `data/` + `scripts/`. Upstream will never touch these paths, so they rebase
   cleanly.
2. **Touch upstream files only at narrow integration points**, and mark every
   such edit with a `// frank_go:` comment so conflicts are self-explanatory
   during rebase. Current touch points are listed below and MUST be kept
   up to date.
3. Prefer *additive* edits (new imports, new props, new menu entries appended to
   arrays) over restructuring upstream code.
4. No reformatting of upstream files; match upstream Prettier config exactly.
5. Tests for frank_go code live in `test/frank/` (upstream tests stay untouched).

## Upstream integration points

Keep this table current — it is the rebase conflict map.

| File | What we changed | Why |
|---|---|---|
| `src/components/MainView.js` | compute `paintMap` from beginner overlay when enabled; pass tsumego props | influence overlay + tsumego mode rendering |
| `src/components/App.js` | render frank drawers/bars | mount our UI |
| `src/menu.js` | added "Beginner" menu section (overlay toggle, tsumego mode, KataGo play) | entry points |
| `src/setting.js` | added `frank.*` setting defaults | persisted toggles/progress |
| `src/modules/sabaki.js` | small hooks (mode registration, tsumego click interception) | mode wiring |

(Exact hooks are annotated inline with `// frank_go:`.)

## Rebase procedure

```sh
git fetch upstream
git checkout main
git rebase upstream/master
# conflicts, if any, will be confined to the files in the table above;
# resolve by re-applying the `// frank_go:` marked hunks
npm ci && npm test && npm start   # verify
git push origin main --force-with-lease
```

Optionally keep the user's Sabaki fork in sync first
(`git push sabaki upstream/master:master`).

## Branding

We intentionally do **not** rename Sabaki internals (package name, ids, class
names) — renames would create conflicts in dozens of files. Product-level
branding is limited to `docs/` and, later, a minimal splash/menu label change
listed in the table above.

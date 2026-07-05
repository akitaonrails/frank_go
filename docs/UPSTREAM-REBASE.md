# Keeping frank_go rebaseable on Sabaki upstream

frank_go is built **on top of Sabaki** (upstream: `SabakiHQ/Sabaki`; the full
Sabaki history lives in this repo). We want to keep pulling upstream
improvements, so every change follows these rules.

## Remotes

| Remote     | URL                                      | Purpose         |
| ---------- | ---------------------------------------- | --------------- |
| `origin`   | git@github.com:akitaonrails/frank_go.git | our app         |
| `upstream` | https://github.com/SabakiHQ/Sabaki.git   | Sabaki upstream |

## Rules for new code

1. **All frank_go code lives in `src/frank/`** (modules, components, styles) and
   `data/` + `scripts/`. Upstream will never touch these paths, so they rebase
   cleanly.
2. **Touch upstream files only at narrow integration points**, and mark every
   such edit with a `// frank_go:` comment so conflicts are self-explanatory
   during rebase. Current touch points are listed below and MUST be kept up to
   date.
3. Prefer _additive_ edits (new imports, new props, new menu entries appended to
   arrays) over restructuring upstream code.
4. No reformatting of upstream files; match upstream Prettier config exactly.
5. Tests for frank_go code live in `test/frank/` (upstream tests stay
   untouched).

## Upstream integration points

Keep this table current — it is the rebase conflict map.

| File                                   | What we changed                                                                                                             | Why                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `src/components/MainView.js`           | overlay `paintMap` branch (dead-stone dimming), guess-mode paint suppressed in study, stone cursor, hover move-name tooltip | overlay + move names       |
| `src/components/App.js`                | pass `frank*` menu-state props to `MainMenu`                                                                                | menu checkbox state        |
| `src/components/Sidebar.js`            | import + always-on `PracticeSidebar`, `frank-practice`/`frank-fill` classes                                                 | practice controls          |
| `src/components/Goban.js`              | `onFrankVertexEnter/Leave` props wired into the vertex mouse handlers                                                       | hover move-name preview    |
| `src/menu.js`                          | guarded requires of frank modules; View checkboxes; "Practice" menu; beginner-mode menu filter                              | entry points               |
| `src/setting.js`                       | `frank.*` defaults block; menu-bar/update-check defaults flipped                                                            | persisted toggles/progress |
| `src/modules/sabaki.js`                | `frank*` state keys, `updateSettingState` mappings, `showSidebar` returns true, guess-mode records `frankLastWrongGuess`    | state plumbing             |
| `src/main.js`                          | startup update check disabled (queries upstream Sabaki releases)                                                            | no false update nags       |
| `index.html`                           | `style/frank.css` stylesheet link                                                                                           | styles                     |
| `package.json`                         | `frank:*` npm scripts; version reset to frank_go's own                                                                      | convenience                |
| `README.md`                            | fully replaced by the frank_go README (original preserved in docs/SABAKI.md)                                                | product framing            |
| `.github/workflows/ci.yml`             | also triggers on pushes to `main`                                                                                           | CI on our branch           |
| `.github/workflows/create-release.yml` | trigger changed to `workflow_dispatch` (we release via AUR)                                                                 | avoid double releases      |

New files (`.mocharc.json`, `src/frank/**`, `src/components/frank/**`,
`style/frank.css`, `test/frank/**`, `scripts/frank/**`, `data/**`,
`.github/workflows/aur-release.yml`, `docs/SABAKI.md`) never conflict. Exact
hooks are annotated inline with `// frank_go:`.

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

(To contribute a fix back to Sabaki itself, create a fresh fork of
SabakiHQ/Sabaki at that time — frank_go does not depend on one.)

## Branding

We intentionally do **not** rename Sabaki internals (package name, ids, class
names) — renames would create conflicts in dozens of files. Product-level
branding is limited to `docs/` and, later, a minimal splash/menu label change
listed in the table above.

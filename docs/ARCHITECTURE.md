# frank_go Architecture

frank_go is a beginner-focused, offline-first Go trainer built **on top of
Sabaki** (see [UPSTREAM-REBASE.md](UPSTREAM-REBASE.md) for the fork/rebase
strategy — read it before touching upstream files).

## Layout

```
data/
  SOURCES.md                  ← provenance & licensing of all bundled data
  tsumego/
    collections/*.sgf         ← 7 bundled problem books (4,341 positions)
    index.json                ← generated problem database (levels 1-10)
  games/
    famous/*.sgf + index.json ← 13 curated landmark games
    bulk/                     ← optional 90k-game archive (gitignored)
  katago/                     ← engine, networks, configs (gitignored)

scripts/frank/
  build-tsumego-index.mjs     ← collections/*.sgf → index.json
  fetch-games.mjs             ← downloads the CWI bulk archive
  setup-katago.mjs            ← one-command local KataGo install

src/frank/                    ← all frank_go renderer logic
  data/problemStore.js        ← queryable problem DB (level/category/…)
  tsumegoProgress.js          ← pure progression rules (streaks, levels)
  tsumegoSession.js           ← practice orchestration + KataGo sparring
  beginnerOverlay.js          ← influence "area painting" paint maps
  positionJudge.js            ← dead-stone heuristics: score estimate, L&D verdict
  katagoPlay.js               ← play-vs-KataGo game lifecycle (restart/undo/…)
  famousGames.js              ← loads the famous-games pack for study

src/components/frank/
  PracticeSidebar.js          ← practice controls docked in the right sidebar

style/frank.css               ← styles for frank_go UI
test/frank/*Tests.js          ← mocha tests (run via `npm test`)
```

## Features and how they hang together

### Beginner area painting (`Ctrl/Cmd+Shift+B`)

`beginnerOverlay.js` computes a paint map from the current board:
distance-decayed radiance around stones gives the _intention_ gradient; when
both colors are present, direction comes from `@sabaki/influence` and fully
enclosed regions get decisive ±1 paint. `MainView` feeds it into Shudan's
existing `paintMap` channel (the one scoring/estimator already use), so
rendering, theming and transformations come for free. Toggle lives in
`frank.show_beginner_overlay` (View and Practice menus).

### Tsumego practice (`Ctrl/Cmd+Shift+K`)

`tsumegoSession.startPractice()` picks a problem near the player's level from
`problemStore` (seeded RNG, unsolved-first), renders it to SGF (`problemToSgf`)
and pushes it through `sabaki.loadContent` — the problem is just a normal game
on the board. If a KataGo engine is configured, it is attached as a **sparring
partner** on the problem's opposing color, so the position answers back
(toggleable in the sidebar; `frank.tsumego_sparring`). When the engine plays far
outside the problem region or passes, the local fight is over: the stray move is
removed, engine replies stop, and the region is judged against the problem's
inferred goal (kill vs live, guessed from the initial position) — success shows
a "Solved!" banner and auto-advances; failure shows what still looks alive/dead
and leaves the player to Reset or mark Missed. The `PracticeSidebar` (docked at
the top of the right sidebar, which auto-opens) drives the loop: Solved/Missed
call `applyResult` (5-streak → level up, 2 misses → level down) and persist via
`frank.tsumego_*` settings; "Check position" shows a heuristic life & death
verdict from `positionJudge.judgeRegion` (dead-stone Monte Carlo). Bundled
problems have **no solution trees** (see `data/SOURCES.md`), so the final grade
stays the player's call; engine-verified grading is the next milestone (below).

### Home panel

When nothing is running, the sidebar (open by default, `frank.show_home_panel`)
shows a start panel: continue tsumego at the saved level, play KataGo as
Black/White (or a setup hint when no engine is configured), and "Study a famous
game", which loads a random game from `data/games/famous` and shows its story.
In beginner mode (default) the advanced Sabaki menus (Edit, Find, Engines,
Tools, Developer) are removed from the menu bar; View > Show Advanced Menus
restores them (`frank.advanced_mode`).

### Play vs KataGo (Practice menu)

`scripts/frank/setup-katago.mjs` gets a working engine in one command and
registers it in Sabaki's `engines.list`. `katagoPlay.playAgainstKataGo(sign)`
starts a new game, attaches the best-matching KataGo entry and assigns it the
opposite color; Sabaki's own engine flow (`generateMove` after each human move)
does the rest. The `PracticeSidebar` offers Estimate Score
(`positionJudge.estimateScore`), Undo (player move + engine reply), Pass,
Restart and Quit, and both practice flows auto-hide the raw GTP console
(`view.show_leftsidebar`). The area painting overlay works during play.

## Testing

`npm test` runs upstream's mocha suite plus `test/frank/**/*Tests.js` (see
`.mocharc.json`). Pure logic (problem store, progression, overlay math) is
unit-tested; UI and session glue are exercised manually via `npm start`. Always
run `npx prettier --write` on touched files (upstream config: no semicolons,
single quotes).

## Design rules

1. New logic goes in `src/frank/` / `src/components/frank/`; upstream files get
   only marked (`// frank_go:`) hook lines. Table of touch points:
   [UPSTREAM-REBASE.md](UPSTREAM-REBASE.md).
2. Pure logic is separated from Sabaki-coupled orchestration so it can be
   unit-tested without Electron.
3. Data provenance is documented in `data/SOURCES.md`; gray-licensed data is
   fetched on demand, never committed.

## Roadmap candidates

- **Engine-verified tsumego grading**: run KataGo's Analysis Engine on the
  problem region and compare group ownership before/after the player's line,
  replacing self-grading when an engine is available.
- **HumanSL ranked ladder**: `setup-katago.mjs --human` already installs the
  human-imitation network; expose rank profiles (20k→1d) as a progression ladder
  for play.
- **Famous-games study mode**: guess-the-next-move (Sabaki's guess mode) over
  `data/games/famous` with the stories from `index.json`.
- **OGS integration** (online, later): REST/realtime API, puzzles API — see
  `docs/research/01-open-source-go-apps.md`.

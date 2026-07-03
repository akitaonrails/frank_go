<!-- frank_go -->

# frank_go

A beginner-focused, offline-first Go/Baduk trainer built on top of
[Sabaki](https://github.com/SabakiHQ/Sabaki). On top of everything Sabaki does
(below), frank_go adds:

- **Tsumego practice** (`Practice > Start Tsumego Practice`, Ctrl/Cmd+Shift+K) —
  4,341 bundled life & death problems from classic collections, served at your
  level: solve 5 in a row to level up (1–10).
- **Beginner area painting** (Ctrl/Cmd+Shift+B) — a toggleable overlay that
  paints each player's influence as a soft gradient and settled territory in
  solid color, so you learn to see what stones are aiming at.
- **One-command local KataGo** — `node scripts/frank/setup-katago.mjs` downloads
  the engine + a CPU-friendly network and registers beginner/full-strength
  opponents; then `Practice > Play vs KataGo`.
- **A local game database** — 13 annotated landmark games bundled (Ear-Reddening
  1846 → AlphaGo–Ke Jie 2017); 90,000+ pro games via
  `node scripts/frank/fetch-games.mjs`.

Start here: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/UPSTREAM-REBASE.md](docs/UPSTREAM-REBASE.md) ·
[data/SOURCES.md](data/SOURCES.md) · [docs/research/](docs/research/README.md)

Run it:
`npm install && node scripts/frank/build-tsumego-index.mjs && npm run bundle && npm start`

---

# ![Sabaki: An elegant Go/Baduk/Weiqi board and SGF editor for a more civilized age.](./banner.png)

[![Download the latest release](https://img.shields.io/github/downloads/SabakiHQ/Sabaki/latest/total?label=download)](https://github.com/SabakiHQ/Sabaki/releases)
[![CI](https://github.com/SabakiHQ/Sabaki/workflows/CI/badge.svg?branch=master&event=push)](https://github.com/SabakiHQ/Sabaki/actions)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://www.paypal.me/yishn/5)

## Features

- Fuzzy stone placement
- Read and save SGF games and collections, open wBaduk NGF and Tygem GIB files
- Display formatted SGF comments using a
  [subset of Markdown](https://github.com/SabakiHQ/Sabaki/blob/master/docs/guides/markdown.md)
  and annotate board positions & moves
- Personalize board appearance with
  [textures & themes](https://github.com/SabakiHQ/Sabaki/blob/master/docs/guides/theme-directory.md)
- SGF editing tools, including lines & arrows board markup
- Copy & paste variations
- Powerful undo/redo
- Fast game tree
- Score estimator & scoring tool
- Find move by move position and comment text
- [GTP engines](https://github.com/SabakiHQ/Sabaki/blob/master/docs/guides/engines.md)
  support with
  [board analysis for supported engines](https://github.com/SabakiHQ/Sabaki/blob/master/docs/guides/engine-analysis-integration.md)
- Guess mode
- Autoplay games

![Screenshot](screenshot.png)

## Documentation

For more information visit the
[documentation](https://github.com/SabakiHQ/Sabaki/blob/master/docs/README.md).
You're welcome to
[contribute](https://github.com/SabakiHQ/Sabaki/blob/master/CONTRIBUTING.md) to
this project.

## Building & Tests

See
[Building & Tests](https://github.com/SabakiHQ/Sabaki/blob/master/docs/guides/building-tests.md)
in the documentation.

## License

This project is licensed under the
[MIT license](https://github.com/SabakiHQ/Sabaki/blob/master/LICENSE.md).

## Donators

A big thank you to these lovely people:

- Eric Wainwright
- Michael Noll
- John Hager
- Azim Palmer
- Nicolas Puyaubreau
- Hans Christian Poerschke
- David Göbel
- Dominik Olszewski
- Brian Weaver
- Philippe Fanaro
- James Tudor
- Frank Orben
- Dekun Song
- Dimitri Rusin
- Andrew Thieman
- Adrian Petrescu
- Karlheinz Agsteiner
- Petr Růžička
- Sergio Villegas
- Jake Pivnik

## Related

- [Shudan](https://github.com/SabakiHQ/Shudan) - A highly customizable,
  low-level Preact Goban component.
- [boardmatcher](https://github.com/SabakiHQ/boardmatcher) - Finds patterns &
  shapes in Go board arrangements and names moves.
- [deadstones](https://github.com/SabakiHQ/deadstones) - Simple Monte Carlo
  functions to determine dead stones.
- [go-board](https://github.com/SabakiHQ/go-board) - A Go board data type.
- [gtp](https://github.com/SabakiHQ/gtp) - A Node.js module for handling GTP
  engines.
- [immutable-gametree](https://github.com/SabakiHQ/immutable-gametree) - An
  immutable game tree data type.
- [influence](https://github.com/SabakiHQ/influence) - Simple heuristics for
  estimating influence maps on Go positions.
- [sgf](https://github.com/SabakiHQ/sgf) - A library for parsing and creating
  SGF files.

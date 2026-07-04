# frank_go

**Learn and enjoy Go (Baduk/Weiqi) — a friendly, offline trainer for
beginners.**

![Tsumego practice in frank_go](docs/images/tsumego-practice.jpg)

Go is a beautiful game, but the first steps are hard: you can't tell who is
winning, you don't know what to study, and strong software is built for strong
players. frank_go is built for the rest of us.

## What you can do

- 🧩 **Practice tsumego (life & death puzzles)** — 4,341 problems from the
  classic collections (Cho Chikun's Encyclopedia, Gokyo Shumyo, Xuanxuan Qijing,
  and more), served at _your_ level. Solve 5 in a row to level up, from level 1
  (beginner) to 10 (expert).
- 🤖 **The puzzles fight back** — if KataGo is installed, it answers your moves
  inside the puzzle. When it gives up the area, frank_go judges the result and
  marks the puzzle **solved automatically**.
- 🎨 **Area painting** — a toggleable overlay that paints each player's
  influence as a soft gradient and settled territory in solid color, so you can
  _see_ what the stones are doing.
- ⚫ **Play against KataGo** — a one-command setup gives you a beginner-friendly
  opponent (and a full-strength one). Score estimate, undo, pass and restart are
  one click away in the sidebar.
- 📖 **Study famous games** — from the Ear-Reddening Game (1846) to AlphaGo vs
  Lee Sedol, with the story behind each game (the AlphaGo games include
  move-by-move commentary).
- 🎌 **Hikaru no Go mode** — nearly every game in the manga is a _real_
  professional game, and 15 of them are bundled with their chapter references
  and trivia: read a chapter, then replay the actual kifu here (Sai's internet
  game against Toya Meijin was a real half-point thriller). Character portraits
  are user-supplied (pending — see
  [data/games/hikaru/portraits/FILENAMES.txt](data/games/hikaru/portraits/FILENAMES.txt)
  for the drop-in instructions; the app shows go-stone medallions until you add
  images).
- 🛜 **Fully offline** — no account, no server, your progress stays on your
  machine.

Everything lives in the **practice panel** on the right side: pick an activity,
play, and the controls follow along. Menus are trimmed down to the essentials
(View → _Show Advanced Menus_ brings the full power-user menus back).

## Install

### Arch Linux (AUR)

```sh
yay -S frank-go
```

(Optional, for the AI opponent: `pacman -S katago` or let `npm run frank:katago`
set it up.)

### From source (any platform)

```sh
git clone https://github.com/akitaonrails/frank_go.git
cd frank_go
npm install
npm run bundle
npm start
```

Optional but recommended — set up the local KataGo opponent (downloads the
engine and a small CPU-friendly network, no GPU needed):

```sh
npm run frank:katago            # add --human for a human-like ~5k opponent
```

More game records for studying (90,000+ professional games):

```sh
npm run frank:games
```

## Keyboard shortcuts

| Shortcut           | Action                 |
| ------------------ | ---------------------- |
| `Ctrl/Cmd+Shift+K` | Start tsumego practice |
| `Ctrl/Cmd+Shift+B` | Toggle area painting   |
| `Ctrl/Cmd+P`       | Pass                   |
| `←` / `→`          | Step through moves     |

## Built on Sabaki

frank*go is a fork of [Sabaki](https://sabaki.yichuanshen.de/), the excellent
open source Go board and SGF editor by Yichuan Shen — all of Sabaki's editing,
analysis and engine features are still here (enable \_Show Advanced Menus* to
reach them). The original Sabaki README is preserved in
[docs/SABAKI.md](docs/SABAKI.md).

## For developers & the curious

- [Architecture](docs/ARCHITECTURE.md) — how the trainer is built on top of
  Sabaki, module by module.
- [Staying rebaseable on upstream](docs/UPSTREAM-REBASE.md) — the fork strategy
  and the upgrade procedure.
- [Data sources & licensing](data/SOURCES.md) — where every bundled problem and
  game record comes from.
- [Go ecosystem research](docs/research/README.md) — the survey of clients, AI
  engines and SGF resources that shaped this project.
- [AUR packaging](packaging/aur/) — PKGBUILD template published by the release
  workflow.

Tests: `npm test` · Bundle: `npm run bundle` · Data rebuild:
`npm run frank:data`

## License

MIT, same as Sabaki. Bundled problem collections and game records have their own
provenance — see [data/SOURCES.md](data/SOURCES.md).

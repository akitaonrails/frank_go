# Data Sources & Licensing

All bundled go data, where it came from, and what we may do with it. Compiled
2026-07-03; see also `docs/research/03-sgf-resources.md`.

## Tsumego collections (`data/tsumego/collections/`)

Positions (no solutions) transcribed by Vít Brunner (tasuki) for
[tsumego.tasuki.org](https://tsumego.tasuki.org/), converted to per-problem SGF
collections by the [Seon82/tasuki2sgf](https://github.com/Seon82/tasuki2sgf)
project, from which these files were downloaded (July 2026). Brunner has
distributed these freely since 2004; the files intentionally contain **no
solutions**, partly for copyright reasons.

| File               | Book                                                   | Problems | Status                                   |
| ------------------ | ------------------------------------------------------ | -------- | ---------------------------------------- |
| `gokyoshumyo.sgf`  | Gokyo Shumyo (Hayashi Genbi, 1812)                     | 520      | public domain (classical)                |
| `xxqj.sgf`         | Xuanxuan Qijing (Yan Defu & Yan Tianzhang, ~1347)      | 347      | public domain (classical)                |
| `hatsuyoron.sgf`   | Igo Hatsuyō-ron (Inoue Dōsetsu Inseki, ~1713)          | 183      | public domain (classical)                |
| `cho-1.sgf`        | Cho Chikun's Encyclopedia of Life & Death — Elementary | 900      | positions only; modern work — see caveat |
| `cho-2.sgf`        | …— Intermediate                                        | 861      | idem                                     |
| `cho-3.sgf`        | …— Advanced                                            | 792      | idem                                     |
| `lee-chang-ho.sgf` | Lee Chang-ho's Selected Life and Death Go Problems     | 738      | positions only; modern work — see caveat |

**Caveat on the modern books:** bare problem positions have circulated freely
with the authors' apparent tolerance for two decades, and we ship _positions
only, without solutions_. If this app is ever distributed commercially, obtain
permission for the Cho Chikun and Lee Chang-ho sets or drop them (the three
classical books alone provide 1,050 public-domain problems).

`data/tsumego/index.json` is generated from these files by
`scripts/frank/build-tsumego-index.mjs` (difficulty levels 1–10 are our own
heuristic metadata).

## Game records (`data/games/`)

- `famous/` — 13 landmark games curated from **Andries Brouwer's database of go
  games** at CWI (<https://homepages.cwi.nl/~aeb/go/games/>), downloaded
  July 2026. The database carries no explicit license; it is a long-running
  curated research collection. Game move sequences as such are generally not
  subject to copyright, and we redistribute only a tiny curated selection with
  attribution. `index.json` descriptions are our own.
- `bulk/` — **not in git.** `node scripts/frank/fetch-games.mjs` downloads the
  full 90,000+ game archive from the same source for local study features.

## Explicitly NOT bundled

- **GoGoD / Go4Go** — commercial, per-user licenses.
- **goproblems.com / 101weiqi / BadukPop problems** — no redistribution rights.
- **OGS puzzles** — accessible via the official OGS API (online); a candidate
  for a future online integration, not for offline bundling.

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

### GoGameGuru weekly problems (`data/tsumego/ggg/`)

420 commented problems **with full solution trees** (140 easy / 140 intermediate
/ 140 hard) from
[gogameguru/go-problems](https://github.com/gogameguru/go-problems), by **An
Younggil (8p) and David Ormerod**, Go Game Guru. License: **CC BY-NC-SA 4.0**
(LICENSE bundled alongside). frank_go is free and non-commercial; credit is
shown in-app in the practice panel. Downloaded 2026-07-04. The solution trees
power the exact move-checking in practice.

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
- `hikaru/` — 15 real professional games that appear in the **Hikaru no Go**
  manga/anime, curated from the same CWI database. The chapter-to-game mapping
  was compiled by the go community on
  [Sensei's Library — HikaruNoGo/Games](https://senseis.xmp.net/?HikaruNoGoGames)
  (the manga's go content was supervised by pro player Yukari Umezawa). We
  redistribute only the historical game records plus our own trivia text — no
  manga imagery or text.
- The five AlphaGo–Lee Sedol records in `famous/` are the **commented** versions
  from the CWI database (move-by-move English commentary embedded as SGF `C[]`
  comments; commentary author as distributed by the database).
- `bulk/` — **not in git.** `node scripts/frank/fetch-games.mjs` downloads the
  full 90,000+ game archive from the same source for local study features.

## Joseki (`data/joseki/`)

- `kogos-joseki-dictionary.sgf` — **Kogo's Joseki Dictionary** (1.3 MB SGF tree
  with English commentary), copyright 1998–2014 Gary Odom, curated by Alexandre
  Dinerchtein, with contributions by Andre Ay and Stefan Verstraeten. Downloaded
  2026-07-04 from <https://waterfire.us/joseki.htm>. The file's own notice
  forbids _commercial_ distribution without permission and asks for a link to
  the KJD page — frank_go is free/non-commercial, links the page here and in the
  app, and preserves the copyright header inside the SGF untouched.

## Explicitly NOT bundled

- **GoGoD / Go4Go** — commercial, per-user licenses.
- **goproblems.com / 101weiqi / BadukPop problems** — no redistribution rights.
- **OGS puzzles** — accessible via the official OGS API (online); a candidate
  for a future online integration, not for offline bundling.

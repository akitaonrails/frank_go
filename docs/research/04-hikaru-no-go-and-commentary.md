# Hikaru no Go Games & Commented Game Records

Research from 2026-07-03 answering two questions: (a) do the games in Hikaru no
Go exist as real records we can study, and (b) where can we get games with
beginner-readable commentary?

## A. Hikaru no Go — the manga games are real

Nearly every position shown in Hikaru no Go is a **real professional game** —
the manga's go content was supervised by Yukari Umezawa (5p), and identifying
the source games ("game hunting") became a community sport.

### Sources for the mapping

| Source                                                                          | Status                 | Notes                                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| [Sensei's Library — HikaruNoGo/Games](https://senseis.xmp.net/?HikaruNoGoGames) | **alive, used**        | Chapter-by-chapter mapping, volumes 1–23, maintained since ~2003 (last edit 2025). The canonical list. |
| Jan van Rongen's site (rongen17.home.xs4all.nl)                                 | dead (xs4all shutdown) | Was the best copy: mapping + SGFs. Referenced by Life in 19x19                                         |
| hikarunogoworld.com                                                             | dead links             | per [Life in 19x19 thread](https://lifein19x19.com/viewtopic.php?f=10&t=8804)                          |
| [GoMagic SGF pack](https://gomagic.org/download/hikaru-no-go-sgf-pack/)         | registration-gated     | ~84 KB pack, "all games from the series"; not redistributable                                          |
| [Hikaru no Go Wiki (fandom)](https://hikago.fandom.com/wiki/Games)              | blocked to bots        | secondary mapping                                                                                      |

### What we did

Since the identified games are historical/professional records, we located each
one **in the CWI database we already use** and bundled 15 landmark manga moments
as `data/games/hikaru/` with chapter references and trivia (highlights: the
first Hikaru–Akira game = Shusaku vs Shuwa 1851; the Sai vs Toya Meijin internet
game = Rin Kaiho vs Yoda Norimoto 1997, W+0.5; Sai's farewell board = the 1998
NEC Cup final; the Hokuto Cup finale = a young Lee Sedol winning the Fujitsu Cup
by half a point). Everything matched by player names + dates in the archive; no
manga content is redistributed, only game records + our own trivia text.

More games remain identifiable from the SL list (30+ further chapters) if we
ever want to grow the pack.

## B. Commented game records for beginners

SGF supports per-move comments (`C[...]`), and Sabaki displays them in its
comment box — so the UI support was already there; frank_go now auto-opens the
comment box when a loaded study game contains move commentary.

Sources of commented games:

| Source                                      | Free?                   | Notes                                                                                                                  |
| ------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **CWI database commented games**            | yes                     | e.g. AlphaGo–Lee Sedol games exist in commented versions (~90 comments/game, English). Now bundled in our famous pack. |
| **Go Teaching Ladder (GTL)** — gtl.xmp.net  | yes (volunteer reviews) | Thousands of reviewed amateur games with rich commentary; great beginner material; per-review author credit required   |
| GoGoD                                       | commercial              | some commented classics                                                                                                |
| "Appreciating Famous Games" & similar books | commercial              | the manga itself references game 8 of this book                                                                        |
| OGS AI reviews / malkovich games            | via OGS API             | online only                                                                                                            |

**Future candidates:** a curated GTL starter set (with author credits) and
auto-generated commentary via KataGo analysis (score swings → "this move lost 5
points" annotations).

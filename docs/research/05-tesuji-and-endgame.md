# Tesuji Study Materials & End-of-Game Intelligence

Research from 2026-07-04, answering: (a) are there tesuji problem sources we can
use like the tsumego packs, and (b) what are sound rules for telling a player
"this game is decided / over"?

## A. Tesuji materials

What we already bundle contains real tesuji content: Gokyo Shumyo's section 7
("technique", 46 problems, tagged `technique` in our index) and much of Xuanxuan
Qijing (tagged `classic`) are tesuji by nature. Dedicated sources:

| Source                                                                                                                                                  | Size                                               | Solutions?                                                                                           | License                          | Verdict                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [gogameguru/go-problems](https://github.com/gogameguru/go-problems)                                                                                     | **841** (280 easy / 280 intermediate / 281 hard)   | **Yes — full variation trees with "Correct" markers and pro commentary** (curated by An Younggil 8p) | **CC BY-NC-SA 4.0**              | ⭐ Best candidate. Legally bundleable with attribution; mixed themes (tesuji, L&D, endgame); the solution trees would enable exact move-checking in the trainer — no engine or heuristics needed |
| [bucko909/gobooks-sgf](https://github.com/bucko909/gobooks-sgf)                                                                                         | "501 Tesuji Problems" digitized (8 files) + others | Yes                                                                                                  | none (digitized commercial book) | Import-only; can't redistribute                                                                                                                                                                  |
| [MadLab 997 problems](http://t-t.dk/madlab/problems/)                                                                                                   | 997 tesuji/L&D                                     | Yes (solver-verified)                                                                                | academic, unclear                | Candidate; ask author                                                                                                                                                                            |
| [Tesuji Made Easy → SGF converter](https://tesujitosgf.sourceforge.net/)                                                                                | —                                                  | —                                                                                                    | —                                | Defunct ecosystem                                                                                                                                                                                |
| Guanzipu (官子谱, classical endgame/tesuji, ~1690s)                                                                                                     | ~1,400                                             | classical                                                                                            | public domain content            | No clean SGF digitization found on GitHub; circulates inside closed sites (101weiqi). Future digitization candidate                                                                              |
| [Go Game Space links](https://gogamespace.com/links/) / [old rec.games.go threads](https://rec.games.go.narkive.com/pF8owj4w/go-problems-in-sgf-format) | various                                            | varies                                                                                               | varies                           | index pages for further digging                                                                                                                                                                  |

**Recommendation:** integrate the GoGameGuru pack as a new problem source
(`data/problems/ggg/`), tagged by its own difficulty tiers and by theme where
the comments allow. Because these problems carry solution trees, the tsumego
trainer can grade them _exactly_ (walk the variation tree, `C[Correct]`
convention) — no self-grading, no engine needed. That also finally gives the
"technique/tesuji" category real depth: today we have 46+347 classical problems;
this adds 841 modern, commented ones.

## B. End-of-game intelligence (implemented)

Question: when should the app tell a beginner "resigning is normal here" or "the
game is over, stop filling in stones"? Established practice:

- **KataGo's own resignation rule** (gtp config): resign when the winrate has
  been below `resignThreshold` (e.g. 1–5%) for `resignConsecTurns` consecutive
  turns, with a minimum game length (`resignMinMovesPerBoardArea`). Sustained
  hopelessness, not a single bad estimate.
- **Game end by rule**: two consecutive passes → counting (Sabaki already
  auto-enters scoring on a double pass).
- **"Nothing left worth playing"**: the score estimate stops moving — every
  border is settled, only dame/neutral points remain. Filling them changes
  nothing under Japanese rules (and ±0 under area rules once both play them).
- **Komi**: any score talk must include it — a 6-point territory lead is a
  _loss_ for Black at 6.5 komi.

frank_go's implementation (`src/frank/endgameAdvisor.js` + the live score in the
game panel): after every move, the dead-stone estimator produces a score lead
**with komi included**, shown live as e.g. `B+3.5`. Over the history of those
estimates:

- behind by ≥ 35 points for 3 consecutive estimates after move 40 → **resign
  hint** (with a Resign button; playing on remains fine),
- estimate stable within 1.5 points for 4 consecutive estimates after move 80 →
  **"borders are settled — pass twice to count"**.

Score-lead thresholds were chosen over winrate on purpose: "you're ~40 points
behind" is meaningful to a beginner, works offline with the Monte-Carlo
estimator, and mirrors what a human teacher would say. A future upgrade is to
use KataGo's analysis (`kata-analyze` winrate/scoreLead, or the Analysis
Engine's ownership) for sharper verdicts — same advisor rules, better inputs.

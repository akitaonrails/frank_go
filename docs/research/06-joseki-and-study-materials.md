# Joseki Materials & the Broader Study-Session Catalog

Research from 2026-07-04: (a) joseki study sources, (b) what other kinds of
study material could become sessions in frank_go.

## A. Joseki sources

| Source                                                                                 | What it is                                                                                                                                                 | License / access                                                                                               | Verdict                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Kogo's Joseki Dictionary](https://waterfire.us/joseki.htm)                            | THE classic SGF joseki encyclopedia (Gary Odom, curated by Alexander Dinerchtein; last update 2014) — one big SGF tree with English commentary, 312 KB zip | Free download; license terms not stated on the page (historically "free, don't sell"); mirrors exist on GitHub | Best offline candidate. Fetch-on-demand (like the bulk games) rather than bundling; loads straight into our study mode as a browsable tree with the comment box |
| [Ishida joseki dictionary SGF](https://github.com/billyellow/Kogo-s-Joseki-Dictionary) | Mislabeled repo — actually 石田芳夫定式大辞典 (Ishida Yoshio's dictionary), Chinese commentary                                                             | unlicensed digitization                                                                                        | Reference only                                                                                                                                                  |
| [OGS Joseki Explorer](https://online-go.com/joseki)                                    | Modern, community-curated, AI-aware joseki graph ("godojo" service)                                                                                        | Online; JSON API exists but is app-internal/semi-documented                                                    | Candidate for a later online integration                                                                                                                        |
| [Josekipedia](http://josekipedia.com)                                                  | Community joseki wiki                                                                                                                                      | Closed data                                                                                                    | Inspiration only                                                                                                                                                |
| [Waltheri pattern search](https://ps.waltheri.net/)                                    | Joseki as they actually appear in 70k pro games                                                                                                            | Online                                                                                                         | Great to link, not to bundle                                                                                                                                    |
| AI-era opening books (e.g. katagobooks.org)                                            | KataGo-computed opening/joseki evaluations                                                                                                                 | varies                                                                                                         | Post-AlphaGo joseki changed a lot; any joseki feature should note "AI-era" vs classical lines                                                                   |
| Our own 90k CWI games + KataGo                                                         | Extract common corner sequences ourselves                                                                                                                  | already have                                                                                                   | A home-grown "frequency joseki explorer" is feasible offline                                                                                                    |

**Caveat for beginners:** joseki memorization is widely considered low-value
below ~10k ("learn joseki, lose two stones"). A beginner-first joseki feature
should teach _why_ moves work (Kogo's commentary helps) or just let the player
replay lines — not drill memorization.

## B. What else could become a study session?

Ranked by (impact for beginners × feasibility with what we already have):

| Material                                               | What it trains                           | Source / feasibility                                                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guess-the-pro-move** (fuseki & whole-board judgment) | direction of play, opening feel          | ⭐ Sabaki's guess mode already exists; run it over our famous/Hikaru/bulk packs. Mostly wiring, no new data                                                                                       |
| **Commented-problem pack (GGG)**                       | tesuji, L&D, endgame — with explanations | ⭐ [gogameguru/go-problems](https://github.com/gogameguru/go-problems), 841 problems, CC BY-NC-SA, solution trees → exact grading (see research 05)                                               |
| **Score-guessing drills**                              | counting, positional judgment            | ⭐ Original feature, zero new data: show a mid-game position from the bulk archive, player guesses who leads, estimator (or KataGo) reveals the answer. Nothing else on the market does this well |
| **Ladder-reading drills**                              | pure reading                             | Ladders are algorithmic — we can _generate_ unlimited problems (does this ladder work?) and verify exactly. Original, offline, no licensing at all                                                |
| **Semeai / ko / connection drills**                    | fighting fundamentals                    | Already bundled: Gokyo Shumyo sections are tagged `capturing-race` (96), `ko` (90), `connecting` (74), `oiotoshi` (40), `living`/`killing` — just needs a category selector in the practice UI    |
| **Yose/endgame**                                       | endgame technique & values               | GGG pack includes endgame; Guanzipu (classical, PD) lacks a clean digitization; could also generate "biggest endgame move" quizzes with KataGo                                                    |
| **Shape (haengma)**                                    | good/bad shape instinct                  | "Shape Up!" by Charles Matthews & Kim Seong-june circulates as a free PDF (license unclear for bundling); shape quizzes could be linked rather than bundled                                       |
| **Rank test**                                          | placement & motivation                   | A timed, mixed set drawn from our existing 4,341 problems at ascending levels → estimate the player's kyu. Pure feature work                                                                      |
| **GTL reviewed games**                                 | seeing your own mistakes in others       | [Go Teaching Ladder](https://gtl.xmp.net) reviews are free with per-author credit; a curated starter set is possible                                                                              |

## C. Recommendation for the tesuji question

Keep **one practice section** and add a **focus selector** (All · Life & Death ·
Tesuji/Technique · Ko · Capturing races) driven by the categories already
present in the problem index — the progression ladder, grading, and UI stay
shared, and beginners keep a single entry point. A _separate_ tesuji section
only earns its place once the GGG pack lands with its own difficulty tiers and
exact tree-graded solutions; revisit then.

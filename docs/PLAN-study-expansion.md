# Plan: Study Material Expansion — ✅ implemented 2026-07-04 (all three phases)

Approved direction (2026-07-04): frank_go is MIT, free, no charges — freely
distributed materials get **bundled**, always with provenance in
`data/SOURCES.md` **and visible credit in the UI** where the material appears.
Research behind this plan: `docs/research/05` and `06`.

## Phase 1 — Commented problems & focus (the big learning upgrade)

**Data: bundle the GoGameGuru pack** (841 problems, CC BY-NC-SA 4.0, by David
Ormerod & An Younggil 8p — credit both in SOURCES and in the pack's in-app about
line).

1. Generalize the index builder (`build-problem-index.mjs`): unified problem
   index with `source` (`tasuki` | `ggg`), `hasSolutions`, and the full SGF
   (with variation tree) for solution-bearing problems.
   - GGG difficulty mapping onto our 1–10 ladder: easy → 2–4, intermediate →
     4–7, hard → 7–9 (ramped within each tier, like the books).
   - Coarse theme tags from the solution comments (tesuji / endgame / ko /
     capture keywords), fallback `mixed`.
2. **Exact grading** (`solutionChecker.js`): when a problem has a solution tree,
   the trainer walks it — player's move in the tree → auto-reply with the tree's
   answer; off-tree move → wrong (Retry/Next dialog, showing the refutation
   comment when the tree has one); reaching a `Correct` node → solved +
   auto-advance. Grading priority per problem: solution tree > KataGo
   sparring/tenuki heuristic > self-grade.
3. **Show the teaching content**: auto-open the comment box for commented
   problems; node comments and board labels (LB) render natively via Sabaki —
   the "indications" come free with the data.
4. **Focus selector** in the practice panel: All · Life & Death ·
   Tesuji/Technique · Ko · Capturing races · Endgame — a filter over the
   existing categories (persisted as `frank.tsumego_focus`), same shared level
   ladder. Problem picker prefers solution-bearing problems at equal level
   (exact feedback beats heuristics for learning).
5. New-user progression is unchanged at the start (level 1 = elementary life &
   death); GGG deepens levels 2–9 and makes feedback exact there.

## Phase 2 — Joseki & guess-the-pro-move

1. **Bundle Kogo's Joseki Dictionary** (312 KB SGF, Gary Odom / Alexander
   Dinerchtein — credit in UI). Home panel gains "📚 Joseki dictionary" under
   study: opens it as a browsable tree in study mode, comment box open, existing
   keys (Space/arrows) navigate. Beginner note in the panel: joseki are for
   browsing and understanding, not memorizing.
2. **Guess the moves**: a toggle in the study view that switches the loaded
   famous/Hikaru game into Sabaki's existing guess mode — click where the pro
   played; wrong guesses are blocked and shown. Trains whole-board judgment with
   zero new data.

## Phase 3 — Original drills (no licensing at all)

1. **Score-guessing drill**: random mid-game position from the bulk archive →
   player guesses who leads (B/W/close) → estimator (or KataGo) reveals;
   streak-based like tsumego. Directly attacks the "can't tell who's winning"
   beginner pain.
2. **Ladder-reading drill**: generated ladder problems ("does this ladder
   work?") verified algorithmically — unlimited, exact.
3. **Rank test**: timed mixed exam over the existing ladder → estimated kyu.

## Credits policy (applies to every phase)

- `data/SOURCES.md` entry with origin, authors, license, download date.
- In-app: each pack's about/intro line names the authors and license; the
  study/practice panel shows the source line for the loaded material.

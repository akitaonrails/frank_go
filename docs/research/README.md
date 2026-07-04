# Go (Baduk/Weiqi) Ecosystem Research

Research compiled 2026-07-03 to inform what we build in this project. The
working idea: **an app/game for amateur players to do exercises (tsumego, life &
death)**, possibly with server play and AI assistance.

## Documents

1. [Open Source Go Apps & Clients](01-open-source-go-apps.md) — the best
   maintained open source clients/editors, which servers they talk to, SGF
   support, and the reusable libraries (board rendering, SGF parsing) we could
   build on.
2. [Go AI Engines](02-go-ai-engines.md) — the post-AlphaGo engine landscape
   (KataGo is the clear winner), how to run models locally, the JSON Analysis
   API, the human-like "HumanSL" model, and hosted/cloud analysis options.
3. [SGF Resources & Training Data](03-sgf-resources.md) — where to get tsumego /
   life-and-death problem sets in SGF, professional game record databases (90k+
   free games), and the licensing caveats.

## TL;DR — key takeaways for our decision

- **KataGo is the only AI engine that matters today.** Leela Zero is dead
  (training server shut down 2021), ELF OpenGo is abandoned. KataGo is actively
  developed, has a machine-readable JSON analysis API, community-trained
  networks free to download, and — critically for an _amateur trainer_ — a
  **human-like model (HumanSL)** that can imitate players from 20-kyu to pro, or
  historical pros by year. This is ideal for "AI coach" features that don't
  crush beginners.
- **OGS (online-go.com) is the only server with a genuinely open, documented
  API** (REST + socket.io realtime, OAuth2), an open source web client, an open
  source `goban` TypeScript library, and a supported bot pathway (`gtp2ogs`). If
  we integrate with a server, OGS is the one.
- **Tsumego data exists but is fragmented.** Cho Chikun's Encyclopedia (~2,500
  problems), Gokyo Shumyo, Xuanxuan Qijing etc. circulate as SGF collections
  (tsumego.tasuki.org, various GitHub repos), but most classic collections have
  murky licensing — fine for personal study, needs care for redistribution in an
  app. goproblems.com and OGS puzzles are community sources; OGS puzzles are
  reachable via its API.
- **Pro game records are abundant and free**: 90,000+ Japanese pro games in SGF
  from Andries Brouwer's database (CWI), daily pro games from GoKifu, pattern
  search over 70k games at Waltheri. GoGoD (~137k games) is the gold standard
  but commercial.
- **Reference apps to study**: Sabaki (2.7k★, the SGF editor), KaTrain (2.3k★,
  the KataGo trainer — closest in spirit to what we want to build), and Kaya
  (new, active, "play/study/analyze" with AI analysis).

## Suggested next step

Decide the product wedge. Strongest candidate given the research: a tsumego
trainer that (a) imports/ships SGF problem sets, (b) uses KataGo's analysis API
to grade attempts and generate hints, and (c) optionally uses the HumanSL model
to create rank-appropriate opponents — a combination none of the existing open
source apps fully covers (KaTrain is game-analysis-first, not exercise-first).

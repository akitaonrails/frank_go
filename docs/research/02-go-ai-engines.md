# Go AI Engines (post-AlphaGo)

The landscape after AlphaGo (2016) / AlphaGo Zero (2017): several open source
reimplementations appeared; by 2026 exactly one is alive and dominant.

## The short version

**Use KataGo.** It is stronger than everything else that is open, actively
developed, has free community-trained networks, a documented JSON analysis API,
and (since 2024) a human-imitation model that is uniquely valuable for an
amateur training app.

## Engine-by-engine

### KataGo — the standard

- **Repo:** https://github.com/lightvector/KataGo (David Wu / lightvector).
  Paper: "Accelerating Self-Play Learning in Go"
  (https://arxiv.org/pdf/1902.10565).
- AlphaZero-style self-play training with many improvements. Unlike Leela Zero
  it predicts **score and territory**, not just win rate — much better for
  teaching ("this mistake cost 4 points" vs "win rate dropped 3%").
- **Training is community-run and ongoing** ("kata1" distributed run since Nov
  2020, https://katagotraining.org/). 2025-era `b28c512nbt` networks keep
  gaining strength; top networks exceed 14,000 Elo on their internal scale. All
  networks are free to download.
- Supports 9x9/13x13/19x19 and arbitrary sizes, handicap play, many rulesets
  (Japanese, Chinese, AGA...), score estimation — all relevant to a trainer app.
- **Backends:** CUDA, TensorRT, OpenCL, Metal, and **Eigen (pure CPU)** — it
  runs on machines without a GPU (weaker but fine for tsumego-scale positions),
  and there is a **WebAssembly ecosystem** around smaller nets for in-browser
  use (e.g., KataGo compiled to WASM in projects like BadukAI; browser strength
  is limited but usable for hints).
- **Known quirk:** research showed superhuman Go AIs (including KataGo) have
  adversarial blind spots (cyclic-group attacks) — irrelevant for amateur
  training, but documented
  (https://www.alignmentforum.org/posts/DCL3MmMiPsuMxP45a/).

### KataGo's two programmatic interfaces

1. **GTP** (Go Text Protocol) — classic line protocol, what GUIs and gtp2ogs
   use.
2. **Analysis Engine** — a JSON-over-stdin/stdout batch API purpose-built for
   apps: send positions, get back move candidates, win rate, score lead,
   ownership maps, policy priors. Docs:
   https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md
   This is the natural backend for grading tsumego attempts and generating
   hints.

### HumanSL — the human-like model (big deal for us)

- Since **v1.15.0 (July 2024)**: a human supervised-learning model
  (`b18c384nbt-humanv0`) trained on human games of all ranks. Release notes:
  https://github.com/lightvector/KataGo/releases/tag/v1.15.0
- You can set `humanSLProfile` to **imitate a specific rank** (e.g., a 5-kyu via
  `gtp_human5k_example.cfg`) or **imitate pro play by historical year back to
  1800**. The Analysis Engine exposes extra "human" fields when the model is
  loaded.
- Extra networks page: https://katagotraining.org/extra_networks/
- Follow-up academic work exists on making HumanSL even more human-like at
  amateur level (Springer, 2025:
  https://link.springer.com/chapter/10.1007/978-3-032-23657-9_13).
- **Why it matters:** rank-appropriate opponents and "what would a player of
  your level play here?" feedback — exactly the gap most trainers have.

### Leela Zero — dead

- https://github.com/leela-zero/leela-zero — faithful AlphaGo Zero
  reimplementation; engine unchanged since 2019, **distributed training shut
  down 2021-02-15**; the project page itself redirects people to KataGo and SAI.
  (https://en.wikipedia.org/wiki/Leela_Zero)

### ELF OpenGo — dead

- Facebook AI's AlphaZero reimplementation (2018-2019). Historically important
  (beat top pros 20-0), model weights still floatable into some GUIs, no
  development since ~2019.

### Others

- **SAI** — Leela Zero fork adding score awareness; the successor LZ points to;
  low activity compared to KataGo.
- **Sayuri** — https://github.com/CGLemon/Sayuri (~128★, active June 2026) —
  clean, smaller AlphaZero-style engine; interesting for learning the internals,
  not for strength.
- **MiniGo** (Google, TensorFlow) — educational reimplementation, archived.
- **GNU Go / Fuego / Pachi** — pre-deep-learning engines. GNU Go (~5-8 kyu)
  still handy as a featherweight CPU opponent for absolute beginners.

## Running locally — practical notes

- **Hardware:** full-strength KataGo wants a GPU (TensorRT/CUDA fastest), but
  the Eigen CPU backend + a small network (b6/b10/b15) is plenty for tsumego
  verification and beginner opponents. Networks download free from
  katagotraining.org.
- **Easiest packaged experiences:** KaTrain (bundles everything), Ogatak,
  LizGoban, Sabaki+engine. Install guides:
  https://gomagic.org/katago-leela-zero-go-ai/
- **Bot on a server:** `gtp2ogs` (https://github.com/online-go/gtp2ogs) puts any
  GTP engine on OGS with an API key; people even run KataGo bots from Colab
  (https://github.com/JBX2010/KataGo_Colab). Note: HumanSL-on-OGS had teething
  issues (KataGo issue #979) — check current status when we get there.

## Hosted AI / APIs (no local GPU)

There is **no official public "KataGo-as-a-service" REST API**; the options are:

| Service                               | What it is                                                                                                                                                        | API?                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **OGS AI review**                     | KataGo-powered game reviews built into online-go.com                                                                                                              | Accessible around the OGS API/realtime protocol for games hosted there; not a general-purpose analysis endpoint |
| **AI Sensei** (https://ai-sensei.com) | Commercial KataGo game-review SaaS; imports from Pandanet/Tygem(.gib)/WBaduk(.ngf)/OGS; has flashcard-style training mode (a competitor/inspiration for our idea) | No public API                                                                                                   |
| **ZBaduk** (https://zbaduk.com)       | Cheap (~€4/mo) cloud KataGo/LZ analysis                                                                                                                           | No public API                                                                                                   |
| Self-hosted                           | Run KataGo Analysis Engine behind our own HTTP wrapper (community projects like `katago-server` / analysis-server wrappers exist)                                 | Our own                                                                                                         |

**Implication:** if the app needs cloud analysis, we self-host the KataGo
Analysis Engine (it's designed for exactly this: one process, JSON in/out,
batching). For pure tsumego, per-position CPU analysis may even run client-side.

## Sources

- https://github.com/lightvector/KataGo ·
  https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md
- https://github.com/lightvector/KataGo/releases/tag/v1.15.0 ·
  https://katagotraining.org/ · https://katagotraining.org/extra_networks/
- https://arxiv.org/pdf/1902.10565 ·
  https://link.springer.com/chapter/10.1007/978-3-032-23657-9_13
- https://github.com/leela-zero/leela-zero ·
  https://en.wikipedia.org/wiki/Leela_Zero
- https://forums.online-go.com/t/katago-v1-15-x-new-human-like-play-and-analysis/52489
- https://ai-sensei.com/faq · https://zbaduk.com/
- https://github.com/online-go/gtp2ogs · https://github.com/JBX2010/KataGo_Colab
- https://gomagic.org/katago-leela-zero-go-ai/
- https://www.alignmentforum.org/posts/DCL3MmMiPsuMxP45a/even-superhuman-go-ais-have-surprising-failure-modes

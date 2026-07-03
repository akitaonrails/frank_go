# Open Source Go Apps & Clients

Survey of the best-maintained open source Go (Baduk/Weiqi) applications, with focus
on: code quality/maintenance, server support (play + matchmaking), and SGF loading.
Star counts and activity as of July 2026.

## Desktop clients & SGF editors

### Sabaki — the reference SGF editor
- **Repo:** https://github.com/SabakiHQ/Sabaki — ~2.7k★, JavaScript/Electron,
  updated July 2026. Site: https://sabaki.yichuanshen.de/
- Cross-platform Go board and SGF editor ("for a more civilized age"). Full SGF-4
  support, board markup tools, variation trees.
- Acts as a **GTP host**: you can plug in any GTP engine (KataGo, Leela Zero,
  GNU Go) and play/analyze locally. Leela integration exists via `leela-sabaki`.
- **No server play** — it is an editor/analysis tool, not an online client.
- The Sabaki organization also maintains reusable libraries (see below):
  `@sabaki/sgf` (parser), `@sabaki/shudan` (goban component), `@sabaki/go-board`.

### KaTrain — the KataGo trainer (closest to our idea)
- **Repo:** https://github.com/sanderland/katrain — ~2.3k★, Python/Kivy, updated
  June 2026.
- "Improve your Baduk skills by training with KataGo." All-in-one: bundles KataGo,
  auto-downloads networks; no separate engine setup needed.
- Features directly relevant to us: **modified-strength AI opponents for weaker
  players** (pre-dating HumanSL, now supports it), per-move mistake feedback,
  teaching modes, SGF import/analysis.
- No online server play/matchmaking; it's a local trainer.
- Best codebase to study for "how to drive KataGo for teaching purposes."

### Kaya — new all-in-one app
- **Repo:** github (topic: baduk) — ~96★, TypeScript, very actively updated
  (July 2026). "Play, study, and analyze Go — free & open-source app with AI
  analysis and board recognition."
- Young but moving fast; worth watching as a modern-stack reference.

### Analysis GUIs (KataGo/Leela front-ends)
- **LizGoban** — https://github.com/kaorahi/lizgoban — ~205★, Electron, updated
  Jan 2026. Lizzie-style realtime analysis UI, supports KataGo incl. HumanSL
  features, tsumego/exercise mode exists (see issue #107 re: SGF size options).
- **Ogatak** — https://github.com/rooklift/ogatak — ~138★, updated July 2026.
  KataGo-specific GUI + SGF editor, emphasis on snappy basics.
- **Lizzie** — historically popular realtime analysis GUI, now **stale** (bundles
  outdated KataGo, long-standing UI bugs). Study only.
- **Go Review Partner** — abandoned (2019).

## Server clients (play + matchmaking)

### OGS web client — the only fully open server stack
- **Repo:** https://github.com/online-go/online-go.com — ~1.5k★, TypeScript,
  updated June 2026. The actual production web UI of online-go.com.
- **APIs:** documented REST API (https://apidocs.online-go.com/,
  https://ogs.docs.apiary.io/) + realtime socket.io API
  (https://docs.online-go.com/, https://ogs.readme.io/docs/real-time-api).
  OAuth2 with PKCE for third-party apps. Covers games, chat, challenges,
  tournaments, ladders, AI review, **and puzzles/tsumego**.
- **goban library:** https://github.com/online-go/goban — the TypeScript board
  library powering OGS, published on npm (`goban`, Apache-2.0, actively
  released). Includes board rendering, rules, and the realtime protocol types
  (https://docs.online-go.com/goban/modules/protocol.html).
- **Bots:** `gtp2ogs` (https://github.com/online-go/gtp2ogs) wraps any GTP engine
  as an OGS bot with an API key. This is the official, supported path.
- **Android client:** open source OnlineGo app (~244★, Kotlin, updated Mar 2026).

### Other servers — closed or semi-open
| Server | Status (2026) | Client/API situation |
|---|---|---|
| **OGS** | Active, growing | Fully open: REST + realtime API, open source web/Android clients |
| **KGS** | Active (owned by American Go Foundation since 2017) | Official CGoban 3 Java client (closed); binary protocol + an official JSON/HTTP translation webapp (https://www.gokgs.com/help/protocol.html). Third-party clients exist but ecosystem is aging |
| **IGS/Pandanet** | Active since 1992 | Publishes protocol specs; third-party clients possible |
| **Fox (野狐)** | Very popular (largest player base) | Proprietary client, no public API. SGF export via unofficial tools only |
| **Tygem** | Popular in Korea | Proprietary; `.gib` format (convertible to SGF) |
| **WeiqiHub** (~82★, Dart, updated June 2026) | — | Open source *unified client for multiple Go servers*; useful reference for multi-server protocol handling |

**Implication:** if the app needs online play/matchmaking, OGS is the only server
where we can integrate legitimately and deeply. KGS is possible via its JSON
bridge; Fox/Tygem are effectively closed.

## Engines with client-ish roles (classical)
- **GNU Go** — classic engine (~pre-AlphaGo strength, weak by modern standards),
  still useful as a lightweight, CPU-only baseline opponent. GTP.
- **Fuego, Pachi** — MCTS-era engines, mostly dormant; Pachi occasionally updated.
- **Sayuri** (~128★, C++, updated June 2026) — active AlphaZero-style engine,
  smaller than KataGo.

## Reusable libraries (for building our own app)

### Board rendering / interaction
- **@sabaki/shudan** — ~105★, updated Apr 2026. "Highly customizable, low-level
  Preact Goban component." Used by Sabaki itself.
- **goban** (online-go) — full-featured TypeScript board + rules + OGS protocol.
- **BesoGo** — https://github.com/yewang/besogo (~134★, updated 2025). Embeddable
  zero-dependency SGF editor/viewer; famously forgiving SGF importer. Live demo:
  https://yewang.github.io/besogo/
- **WGo.js** — customizable SGF player (older but widely deployed).
- **Tenuki** — https://github.com/aaron-p/tenuki (~131★) web goban + rules,
  dormant since 2022.
- **jGoBoard** — photo-realistic board renderer (older).
- **Glift** — responsive SGF viewer, built for problem/lesson display (used by
  gogameguru historically); older but purpose-matched to tsumego display.

### SGF parsing
- **@sabaki/sgf** — https://github.com/SabakiHQ/sgf — solid JS SGF parser.
- **sgfmill** — https://github.com/mattheww/sgfmill — the standard Python SGF
  read/write library.
- Curated catalog of everything: **waltheri/go-libraries**
  https://github.com/waltheri/go-libraries (libraries in JS, Python, Go, etc.)

## Maintenance snapshot (July 2026)

| Project | Stars | Last activity | Verdict |
|---|---|---|---|
| Sabaki | 2.7k | Jul 2026 | Healthy, canonical editor |
| KaTrain | 2.3k | Jun 2026 | Healthy, best trainer reference |
| online-go.com | 1.5k | Jun 2026 | Healthy, production server code |
| OnlineGo (Android) | 244 | Mar 2026 | Healthy |
| LizGoban | 205 | Jan 2026 | Healthy |
| Ogatak | 138 | Jul 2026 | Healthy |
| BesoGo | 134 | Jun 2025 | Stable/slow |
| Kaya | 96 | Jul 2026 | Young, very active |
| WeiqiHub | 82 | Jun 2026 | Active |
| Lizzie | — | stale | Avoid |
| Go Review Partner | 288 | 2019 | Dead |

## Sources
- https://github.com/SabakiHQ/Sabaki · https://sabaki.yichuanshen.de/
- https://github.com/sanderland/katrain
- https://github.com/online-go/online-go.com · https://github.com/online-go/goban · https://github.com/online-go/gtp2ogs
- https://docs.online-go.com/ · https://apidocs.online-go.com/ · https://ogs.readme.io/docs/real-time-api · https://ogs.docs.apiary.io/
- https://github.com/kaorahi/lizgoban · https://github.com/rooklift/ogatak
- https://github.com/yewang/besogo · https://github.com/mattheww/sgfmill · https://github.com/SabakiHQ/sgf
- https://github.com/waltheri/go-libraries
- https://github.com/topics/baduk · https://github.com/topics/sgf
- https://www.gokgs.com/help/protocol.html · https://en.wikipedia.org/wiki/KGS_Go_Server
- https://en.wikipedia.org/wiki/Internet_Go_server · https://gomagic.org/online-go-servers/

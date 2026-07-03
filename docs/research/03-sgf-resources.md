# SGF Resources: Tsumego Collections & Game Records

Where to get (a) life-and-death / tsumego problems and (b) historical & pro game
records, in SGF, for an amateur exercise app. Includes licensing caveats — this
is the part that needs the most care if we redistribute content.

## A. Tsumego / life & death collections

### The classic collections (public-domain-ish content, varied packagings)
The canonical progression sets, all pre-20th-century or by Cho Chikun:

| Collection | Problems | Level | Notes |
|---|---|---|---|
| **Cho Chikun's Encyclopedia of Life & Death** | ~2,553 (900 elementary / 861 intermediate / 792 advanced) | beginner → mid-dan | The single best progression for amateurs; modern work (copyright caution) |
| **Gokyo Shumyo** (1812) | ~520 | intermediate | Patterns from real games; classical, public domain |
| **Xuanxuan Qijing** (1349) | hundreds | intermediate-advanced | "Vital point" classics; public domain |
| **Igo Hatsuyōron** (1713) | ~180 | very hard | Classical, public domain |

### Sources in SGF / convertible form
- **tsumego.tasuki.org** — https://tsumego.tasuki.org/ — the well-known free
  packaging of the above (PDF booklets; the "how" page documents their SGF
  sources: https://tsumego.tasuki.org/how/). Community tools convert these to
  SGF, e.g. **aaronslin/tsumego_clipper**
  (https://github.com/aaronslin/tsumego_clipper) which extracts Cho Chikun
  problems into SGFs, and **travisgk/tsumego-pdf**
  (https://github.com/travisgk/tsumego-pdf) which works from the same collections
  (Elementary 900 / Intermediate 861 / Advanced 792) and confirms the SGF
  sources circulate publicly.
- **OGS forum thread** confirming Cho Chikun SGF availability & provenance:
  https://forums.online-go.com/t/cho-chikuns-encyclopedia-of-life-death-in-sgf-format/12458
- **benjaminmantle/Go-Baduk-Study-Materials**
  (https://github.com/benjaminmantle/Go-Baduk-Study-Materials) — grab-bag repo of
  books, problems and pro games (unmaintained; licensing dubious, use as index).
- Academic ML work uses ~10,000-problem life-and-death SGF datasets
  (https://doi.org/10.3390/ai7050170, https://arxiv.org/pdf/2112.02563) — worth
  checking their released data for a cleanly usable corpus.

### Interactive problem communities
- **goproblems.com** — https://www.goproblems.com/ — long-running community
  problem database (user-submitted, solve/comment/rate). Problems are
  user-contributed; historically an SGF-centric site. Licensing is per-site, not
  blanket-free — would need permission to bulk use.
- **OGS Puzzles** — https://online-go.com/puzzles — community puzzle collections,
  and puzzles are **exposed through the documented OGS API** (see
  https://docs.online-go.com/ — "loading tsumego (puzzles)"). Most practical
  "fetch problems over an API" option that exists today.
- **101weiqi.com** — the biggest problem site (Chinese; huge graded collection,
  "skill tests"). No official API/export; scraping is against ToS. Treat as
  inspiration/benchmark only.
- **Tsumego Hero** — https://tsumegohero.com/ — web trainer with the classic sets
  (e.g., Life & Death Advanced set); good UX reference.
- **BadukPop** — https://badukpop.com/ — commercial app, 4,000+ pro-curated
  problems + ranked AI opponents (20k–7d+). The main commercial comparable for
  our idea, alongside AI Sensei's flashcard "Training Mode".
- **ghost-go** (https://github.com/ghost-go) — open source interactive
  Go-resources website (legacy repo 36★); newer **frank99-owl/go-daily** (132★,
  TypeScript, updated July 2026): "daily Go puzzle with an AI coach that guides
  you to the answer with progressive hints" — *very* close to our concept, study
  it before building.

### Tsumego generation/solving (if we want infinite problems)
- **cameron-martin/tsumego-solver**
  (https://github.com/cameron-martin/tsumego-solver) — solves *and generates*
  tsumego (Rust, based on lambda df-pn search literature).
- KataGo itself can verify solutions/refutations for bounded positions via the
  Analysis Engine — good enough to auto-grade user attempts even without a
  formal solver.

## B. Historical & professional game records

### Free bulk downloads
- **Andries Brouwer's database (CWI)** —
  https://homepages.cwi.nl/~aeb/go/games/ — **90,000+ Japanese pro games in SGF**,
  one-click bulk archives (.tar.gz 46 MB / .7z 28 MB), organized by player
  (Go Seigen, Cho Chikun, AlphaGo, ...) and tournament (1927-2026). No explicit
  license; curated research collection — fine to fetch for personal study
  features, ask before bundling.
- **GoKifu** — http://gokifu.com/ — daily new pro game SGFs, free downloads;
  simple predictable URLs (see https://github.com/ejmr/random-gokifu-sgf for a
  fetcher). Good "game of the day" feed source.
- **u-go.net game records** — https://u-go.net/links/gamerecords.html — links
  hub, including the classic **KGS high-dan amateur game archives** (huge corpora
  historically used to train NN policy nets).
- **OGS** — every OGS game is downloadable as SGF via the REST API; effectively
  unlimited amateur games at every rank (useful for rank-calibrated content).
- Community index threads: 
  https://forums.online-go.com/t/best-sites-to-get-thousands-of-go-games-sgf-as-archive/16757 ·
  https://forums.online-go.com/t/pro-games-sgf-collection/49003

### Commercial / gated
- **GoGoD** — https://gogodonline.co.uk/ — the gold-standard curated pro
  collection: **136,000+ SGFs** (Winter 2026 edition), from ancient games to
  current tournaments, updated ~twice a year. Paid, one-time purchase; also
  bundled in SmartGo One (https://smartgo.com/). License does not allow
  redistribution — per-user purchase only.
- **Go4Go** — https://www.go4go.net/go/games — best source for *current* pro
  games (updated daily), subscription for bulk access.

### Search/reference services (not bulk data, but great study UX references)
- **Waltheri's pattern search** — https://ps.waltheri.net/ — position/pattern
  search over **70,000+ pro games** (database page: https://ps.waltheri.net/database/;
  code: https://github.com/waltheri/go-pattern-search). The benchmark for
  "find this joseki/fuseki in pro play" features.

## C. Licensing summary (the practical view)

| Source | Bulk SGF? | Can we redistribute in an app? |
|---|---|---|
| Classical collections (Gokyo Shumyo, Xuanxuan Qijing, Hatsuyōron) | yes, via community SGFs | **Yes** — problems are public domain (verify the specific SGF transcription's terms) |
| Cho Chikun Encyclopedia | circulating SGFs | **Gray** — modern authored work; tasuki distributes freely but formal rights unclear. Ship as "user-importable pack" rather than bundling, or seek permission |
| goproblems.com / 101weiqi / BadukPop | no official export | **No** without permission |
| OGS puzzles & games | via official API | **Yes for API-mediated access** (respect API terms); attribution expected |
| CWI 90k pro games | yes | Gray — no license stated; fetch-on-demand safer than bundling |
| GoKifu | yes (per game) | Fetch-on-demand feed; don't mirror wholesale |
| GoGoD / Go4Go | paid | **No** — per-user license |
| Game *positions/moves* generally | — | Move sequences themselves are generally not copyrightable in most jurisdictions (commentary/compilations are) — but this is jurisdiction-dependent; don't rely on it for Cho's books or curated DBs |

**Practical strategy for the app:** bundle public-domain classical sets converted
to SGF ourselves + generated problems (solver/KataGo-verified) + OGS puzzle API
integration + "import your own SGF" — and avoid redistributing gray-area corpora.

## Sources
- https://tsumego.tasuki.org/ · https://tsumego.tasuki.org/how/
- https://github.com/travisgk/tsumego-pdf · https://github.com/aaronslin/tsumego_clipper · https://github.com/cameron-martin/tsumego-solver
- https://github.com/topics/tsumego (incl. frank99-owl/go-daily)
- https://forums.online-go.com/t/cho-chikuns-encyclopedia-of-life-death-in-sgf-format/12458
- https://www.goproblems.com/ · https://online-go.com/puzzles · https://docs.online-go.com/ · https://tsumegohero.com/ · https://badukpop.com/
- https://homepages.cwi.nl/~aeb/go/games/ · http://gokifu.com/ · https://github.com/ejmr/random-gokifu-sgf · https://u-go.net/links/gamerecords.html
- https://gogodonline.co.uk/ · https://smartgo.com/ · https://www.go4go.net/go/games
- https://ps.waltheri.net/ · https://ps.waltheri.net/database/
- https://forums.online-go.com/t/best-sites-to-get-thousands-of-go-games-sgf-as-archive/16757 · https://forums.online-go.com/t/pro-games-sgf-collection/49003
- https://doi.org/10.3390/ai7050170 · https://arxiv.org/pdf/2112.02563
- https://gomagic.org/go-problems/ · https://gomagic.org/go-resources/

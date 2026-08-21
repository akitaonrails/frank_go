# Changelog

All notable changes to frank_go are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/); versions use
[semantic versioning](https://semver.org/).

frank_go is a beginner-focused Go/Baduk trainer forked from
[Sabaki](https://github.com/SabakiHQ/Sabaki) — Sabaki's own history lives in
[docs/SABAKI-CHANGELOG.md](docs/SABAKI-CHANGELOG.md).

## [0.3.13] - 2026-08-21

### Added

- **Hikaru no Go study mode**: character medallions are no longer uniform
  initial badges — each of the 12 characters now has its own accent color and a
  small original motif (Sai's eboshi hat, Hikaru's star, Akira's bob, Ogata's
  glasses, Kuwabara's fan, Kaga's shogi piece, Toya Koyo's crown, Waya's
  headband, Ko Yongha's taegeuk, Ochi's sprout, Kadowaki's bolt, the Rival
  Tutor's "?"). User-supplied portraits still override them
  ([#6](https://github.com/akitaonrails/frank_go/issues/6)).

### Changed

- Routine dependency updates, consolidated from Dependabot PRs: uuid 14.0.2,
  concurrently 10.0.5 ([#38](https://github.com/akitaonrails/frank_go/pull/38),
  [#39](https://github.com/akitaonrails/frank_go/pull/39)).

## [0.3.12] - 2026-08-14

### Changed

- Routine dependency updates, consolidated from Dependabot PRs: electron 43.4.0,
  tsx 4.23.12, @sabaki/gtp 3.2.0, @primer/octicons 19.33.0
  ([#34](https://github.com/akitaonrails/frank_go/pull/34),
  [#35](https://github.com/akitaonrails/frank_go/pull/35),
  [#36](https://github.com/akitaonrails/frank_go/pull/36),
  [#37](https://github.com/akitaonrails/frank_go/pull/37)).

## [0.3.11] - 2026-08-07

### Changed

- Routine dependency updates, consolidated from Dependabot PRs: electron 43.3.0,
  mocha 11.8.0, tsx 4.23.11, preact 10.29.8
  ([#30](https://github.com/akitaonrails/frank_go/pull/30),
  [#31](https://github.com/akitaonrails/frank_go/pull/31),
  [#32](https://github.com/akitaonrails/frank_go/pull/32),
  [#33](https://github.com/akitaonrails/frank_go/pull/33)).

## [0.3.10] - 2026-07-25

### Changed

- Routine dependency updates, consolidated from Dependabot PRs: @playwright/test
  1.62.1, @primer/octicons 19.32.0, webpack 5.109.2, webpack-cli 7.2.2, and
  concurrently 10.0.4 (dev-only tooling)
  ([#25](https://github.com/akitaonrails/frank_go/pull/25),
  [#26](https://github.com/akitaonrails/frank_go/pull/26),
  [#27](https://github.com/akitaonrails/frank_go/pull/27),
  [#28](https://github.com/akitaonrails/frank_go/pull/28),
  [#29](https://github.com/akitaonrails/frank_go/pull/29)).

## [0.3.9] - 2026-07-25

### Changed

- Routine dependency updates, consolidated from Dependabot PRs: electron 43.2.0,
  @playwright/test 1.61.1, webpack-cli 7.2.1, tsx 4.23.1, rimraf 6.1.3,
  @sabaki/gtp 3.1.1, @sabaki/shudan 1.8.0, preact 10.29.7, prettier 3.9.6,
  octicons, sgf, iconv-lite, deadstones
  ([#20](https://github.com/akitaonrails/frank_go/pull/20),
  [#21](https://github.com/akitaonrails/frank_go/pull/21),
  [#22](https://github.com/akitaonrails/frank_go/pull/22),
  [#23](https://github.com/akitaonrails/frank_go/pull/23),
  [#24](https://github.com/akitaonrails/frank_go/pull/24)).

## [0.3.8] - 2026-07-08

### Added

- **Tsumego — solved & commented**: a separate study mode that walks all 420
  GoGameGuru problems in order (easy → hard), graded exactly against their
  human-curated solution trees — no level or streak, skipping problems you've
  already solved, resuming at the first unsolved one, with a progress count and
  a small celebration when the whole set is done. Thanks to Marcelo Mogami
  ([#9](https://github.com/akitaonrails/frank_go/pull/9)).

### Fixed

- The tsumego success banner no longer credits KataGo when a solution tree
  graded the answer — tree-verified wins now show a plain "Solved!". Thanks to
  Marcelo Mogami ([#8](https://github.com/akitaonrails/frank_go/pull/8)).
- A miss in the new study mode no longer resets the streak or lowers the level
  of the regular practice mode.

## [0.3.7] - 2026-07-06

### Fixed

- KataGo setup no longer loops forever on systems with AppImageLauncher (common
  on Arch/CachyOS): the official KataGo Linux binaries are type-2 AppImages,
  which AppImageLauncher intercepts and _moves away_ on first run. The engine is
  now unpacked once into a plain binary during setup — which also removes the
  FUSE requirement at play time. Thanks to Marcelo Mogami for the diagnosis and
  fix ([#7](https://github.com/akitaonrails/frank_go/pull/7)).
- A stale unpacked engine can no longer shadow a freshly downloaded one when
  reinstalling.

## [0.3.6] - 2026-07-06

### Changed

- Release notes are now generated from this changelog, and the Homebrew cask
  updates automatically in the tap on each release.
- Install docs cover Windows, macOS (Homebrew + signed/notarized `.dmg`) and
  Linux.

## [0.3.5] - 2026-07-06

### Added

- **Desktop releases** — signed & notarized macOS `.dmg` (Apple Silicon +
  Intel), Windows `.exe` (installer + portable) and Linux AppImage, built on
  each `v*` tag and attached to the GitHub Release.
- **Homebrew** — `brew install --cask akitaonrails/tap/frank-go`; the cask is
  updated automatically in the tap on release.
- frank_go application icon across all packaged builds.

### Changed

- KataGo delivery: download-on-first-use for Windows/Linux; macOS uses Homebrew
  (`brew install katago`) since KataGo ships no official mac binary.

## [0.3.0] - 2026-07-05

### Added

- **Commented tsumego** — 420 Go Game Guru problems with exact solution-tree
  grading and the pro's explanation, on top of the 4,341 classic problems.
- **Focus picker** — narrow tsumego practice to life & death, tesuji, ko or
  capturing races.
- **Rank test** — ten graded problems estimate your level and drop you into
  practice there.
- **Kogo's Joseki Dictionary** as a browsable commented tree.
- **Guess the moves** in study games, with an optional KataGo review of a wrong
  guess; study replay is read-only, with free retrying.
- **Drills** — "Who is winning?" and a generated, verified ladder trainer.
- **Play vs KataGo** — live score with resign/settled advice, and move names
  ("Hane", "One-Point Jump") on hover.
- Area painting now dims likely-dead stones.

### Changed

- The practice sidebar is always on.
- KataGo setup verifies an engine actually boots and falls back to a working CPU
  build; a crashing engine is handled gracefully in play and review.
- AUR: recommend `katago-cpu`; GPU builds marked advanced.

[0.3.13]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.13
[0.3.12]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.12
[0.3.11]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.11
[0.3.10]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.10
[0.3.9]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.9
[0.3.8]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.8
[0.3.7]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.7
[0.3.6]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.6
[0.3.5]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.5
[0.3.0]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.0

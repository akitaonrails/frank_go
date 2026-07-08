# Changelog

All notable changes to frank_go are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/); versions use
[semantic versioning](https://semver.org/).

frank_go is a beginner-focused Go/Baduk trainer forked from
[Sabaki](https://github.com/SabakiHQ/Sabaki) — Sabaki's own history lives in
[docs/SABAKI-CHANGELOG.md](docs/SABAKI-CHANGELOG.md).

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

[0.3.8]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.8
[0.3.7]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.7
[0.3.6]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.6
[0.3.5]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.5
[0.3.0]: https://github.com/akitaonrails/frank_go/releases/tag/v0.3.0

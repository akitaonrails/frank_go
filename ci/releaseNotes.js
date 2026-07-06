const {readFileSync} = require('fs')
const {join} = require('path')
const {version} = require('../package.json')

// Print the CHANGELOG.md section for the current package.json version, for
// use as the GitHub release body.

// frank_go: we don't maintain a Sabaki-style CHANGELOG.md — changes live in
// git history. Fall back to a generic body rather than failing the release
// when there's no matching section (or no CHANGELOG at all).
function fallback() {
  process.stdout.write(
    [
      `**Frank GO v${version}** — a friendly, offline Go trainer for beginners.`,
      '',
      'Downloads below: Windows `.exe`, macOS `.dmg` (Apple Silicon + Intel),',
      'Linux AppImage. macOS is also on Homebrew:',
      '`brew install --cask akitaonrails/tap/frank-go`.',
      '',
      `Full changes: https://github.com/akitaonrails/frank_go/commits/v${version}`,
      '',
    ].join('\n'),
  )
  process.exit(0)
}

let changelog
try {
  changelog = readFileSync(join(__dirname, '..', 'CHANGELOG.md'), 'utf8')
} catch (err) {
  fallback()
}
const lines = changelog.split('\n')

// frank_go CHANGELOG.md uses Keep a Changelog headings: `## [0.3.5] - date`
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`))
if (start < 0) fallback()

let end = lines.findIndex((line, i) => i > start && line.startsWith('## '))
if (end < 0) end = lines.length

const body = lines
  .slice(start + 1, end)
  // Drop reference-style link definitions, e.g. `[v0.60.0]: https://...`
  .filter((line) => !/^\[[^\]]+\]:\s+\S+$/.test(line))

// GitHub's release renderer treats single newlines as hard breaks, so unwrap
// the ~80-column paragraphs: a line continues the previous one unless it is
// blank or starts a new block (heading, list item, quote, fence, table row).
const unwrapped = []
for (let line of body) {
  let trimmed = line.trim()
  let startsBlock = /^(#{1,6} |[-*+] |\d+\. |>|```|\|)/.test(trimmed)

  if (
    trimmed !== '' &&
    !startsBlock &&
    unwrapped.length > 0 &&
    unwrapped[unwrapped.length - 1].trim() !== ''
  ) {
    unwrapped[unwrapped.length - 1] += ' ' + trimmed
  } else {
    unwrapped.push(line)
  }
}

process.stdout.write(unwrapped.join('\n').trim() + '\n')

// frank_go: optional 90,000-game archive management (renderer only).
//
// The bulk archive from Andries Brouwer's database (see data/SOURCES.md)
// feeds the score-guessing drill with endless variety. Source installs
// keep it under data/games/bulk/ (gitignored); packaged/AUR installs
// can't write next to the app, so Electron's userData directory is used
// instead. Both locations are checked when reading.

import {accessSync, constants, existsSync, mkdirSync} from 'fs'
import {spawnSync} from 'child_process'
import {dirname, join} from 'path'
import {locateData} from './paths.js'
import {download} from './katagoSetup.js'

const ARCHIVE_URL = 'https://homepages.cwi.nl/~aeb/go/games/games.tgz'

function userDataBulkDir() {
  return join(window.sabaki.setting.userDataDirectory, 'frank-games', 'bulk')
}

function repoBulkDir() {
  let indexPath = locateData(join('games', 'index.json'))
  return indexPath == null ? null : join(dirname(indexPath), 'bulk')
}

// Where the extracted games live, if anywhere.
export function bulkGamesRoot() {
  for (let base of [repoBulkDir(), userDataBulkDir()]) {
    if (base != null && existsSync(join(base, 'games'))) {
      return join(base, 'games')
    }
  }

  return null
}

function writableBulkDir() {
  let repo = repoBulkDir()

  if (repo != null) {
    try {
      accessSync(dirname(repo), constants.W_OK)
      return repo
    } catch (err) {
      // packaged install — fall through to userData
    }
  }

  return userDataBulkDir()
}

// Downloads and extracts the archive with progress callbacks.
export async function fetchBulkGames(onProgress = () => {}) {
  if (bulkGamesRoot() != null) return true

  let dir = writableBulkDir()
  mkdirSync(dir, {recursive: true})

  let archivePath = join(dir, 'games.tgz')
  onProgress({step: 'downloading 90,000 games', fraction: 0})
  await download(ARCHIVE_URL, archivePath, (fraction) =>
    onProgress({step: 'downloading 90,000 games', fraction}),
  )

  onProgress({step: 'unpacking', fraction: 1})
  let result = spawnSync('tar', ['xzf', archivePath, '-C', dir], {
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    throw new Error('Could not extract the archive (tar failed)')
  }

  return bulkGamesRoot() != null
}

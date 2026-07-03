#!/usr/bin/env node

// Downloads the full bulk game-record archive (90,000+ professional games in
// SGF) from Andries Brouwer's database at CWI into data/games/bulk/, which is
// gitignored — we only redistribute the small curated pack in
// data/games/famous/. See data/SOURCES.md.
//
// Usage: node scripts/frank/fetch-games.mjs

import {createWriteStream, existsSync, mkdirSync} from 'fs'
import {get} from 'https'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import {spawnSync} from 'child_process'

const ARCHIVE_URL = 'https://homepages.cwi.nl/~aeb/go/games/games.tgz'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const bulkDir = join(rootDir, 'data', 'games', 'bulk')
const archivePath = join(bulkDir, 'games.tgz')

function download(url, destination) {
  return new Promise((resolve, reject) => {
    let file = createWriteStream(destination)

    get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }

      let total = +response.headers['content-length'] || 0
      let received = 0

      response.on('data', (chunk) => {
        received += chunk.length
        if (total > 0 && received % (5 * 1024 * 1024) < chunk.length) {
          console.log(`  ${Math.round((received / total) * 100)}%`)
        }
      })

      response.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
  })
}

mkdirSync(bulkDir, {recursive: true})

if (existsSync(join(bulkDir, 'games'))) {
  console.log('data/games/bulk/games already exists — nothing to do.')
  process.exit(0)
}

console.log(`Downloading ${ARCHIVE_URL} (~46 MB)…`)
await download(ARCHIVE_URL, archivePath)

console.log('Extracting…')
let result = spawnSync('tar', ['xzf', archivePath, '-C', bulkDir], {
  stdio: 'inherit',
})

if (result.status !== 0) {
  console.error('tar failed — archive kept at', archivePath)
  process.exit(1)
}

console.log(`Done. Games are in ${join(bulkDir, 'games')}`)

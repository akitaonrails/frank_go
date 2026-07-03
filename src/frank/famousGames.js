// frank_go: loads the bundled famous-games starter pack (renderer only).
//
// data/games/famous/ holds 13 landmark games with an annotated index
// (see data/SOURCES.md). "Study a famous game" loads one onto the board
// and returns its story so the UI can display it.

import {existsSync, readFileSync} from 'fs'
import {dirname, join} from 'path'
import sabaki from '../modules/sabaki.js'
import {createRng} from './data/problemStore.js'

let cachedIndex = null
let rng = createRng()
let lastFile = null

function gamesDir() {
  let dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd()

  for (let i = 0; i < 5; i++) {
    let candidate = join(dir, 'data', 'games')
    if (existsSync(join(candidate, 'index.json'))) return candidate
    dir = dirname(dir)
  }

  return null
}

export function loadIndex() {
  if (cachedIndex == null) {
    let dir = gamesDir()
    if (dir == null) return null

    cachedIndex = {
      dir,
      ...JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')),
    }
  }

  return cachedIndex
}

// Loads a random famous game (avoiding an immediate repeat) and returns
// its index entry, or null when the pack is missing.
export async function studyRandomGame() {
  let index = loadIndex()
  if (index == null || index.games.length === 0) return null

  let pool = index.games.filter((game) => game.file !== lastFile)
  if (pool.length === 0) pool = index.games

  let game = pool[Math.floor(rng() * pool.length)]
  lastFile = game.file

  let sgf = readFileSync(join(index.dir, game.file), 'utf8')
  await sabaki.loadContent(sgf, 'sgf', {suppressAskForSave: true})

  return game
}

// frank_go: loads the bundled study-game packs (renderer only).
//
// Two packs ship with the app (see data/SOURCES.md):
// - famous: 13 landmark games (data/games/index.json)
// - hikaru: real professional games behind Hikaru no Go manga scenes,
//   with chapter references and trivia (data/games/hikaru/index.json)
//
// Games with embedded commentary automatically open Sabaki's comment box
// so beginners see the move-by-move explanations.

import {existsSync, readFileSync} from 'fs'
import {dirname, join} from 'path'
import sabaki from '../modules/sabaki.js'
import {createRng} from './data/problemStore.js'

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

let rng = createRng()
let cachedIndexes = {}
let lastFile = {}

function gamesDir() {
  let dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd()

  for (let i = 0; i < 5; i++) {
    let candidate = join(dir, 'data', 'games')
    if (existsSync(join(candidate, 'index.json'))) return candidate
    dir = dirname(dir)
  }

  return null
}

export function loadIndex(pack = 'famous') {
  if (cachedIndexes[pack] === undefined) {
    let base = gamesDir()
    let dir = base == null || pack === 'famous' ? base : join(base, pack)
    let indexPath = dir == null ? null : join(dir, 'index.json')

    cachedIndexes[pack] =
      indexPath != null && existsSync(indexPath)
        ? {dir, ...JSON.parse(readFileSync(indexPath, 'utf8'))}
        : null
  }

  return cachedIndexes[pack]
}

export function packAbout(pack) {
  let index = loadIndex(pack)
  return index == null ? null : index.about || null
}

// True when the SGF has comments beyond the root node — worth showing the
// comment box for.
function hasMoveCommentary(sgfText) {
  let firstMove = sgfText.search(/;[BW]\[/)
  return firstMove >= 0 && sgfText.slice(firstMove).includes('C[')
}

// Loads a random game from the pack (avoiding an immediate repeat) and
// returns its index entry, or null when the pack is missing.
export async function studyRandomGame(pack = 'famous') {
  let index = loadIndex(pack)
  if (index == null || index.games.length === 0) return null

  let pool = index.games.filter((game) => game.file !== lastFile[pack])
  if (pool.length === 0) pool = index.games

  let game = pool[Math.floor(rng() * pool.length)]
  lastFile[pack] = game.file

  let sgfText = readFileSync(join(index.dir, game.file), 'utf8')
  await sabaki.loadContent(sgfText, 'sgf', {suppressAskForSave: true})

  if (hasMoveCommentary(sgfText)) {
    // Commented games: show the commentary alongside the board (setting
    // and UI state are separate in Sabaki — set both).
    setting.set('view.show_comments', true)
    sabaki.setState({showCommentBox: true})
  }

  sabaki.setState({
    frankStudy: {
      pack,
      chapter: pack === 'hikaru' ? game.manga : null,
      title: game.title,
      meta: `${game.date} · ${game.result}`,
      text: pack === 'hikaru' ? game.trivia : game.why,
      cast: resolveCast(index.dir, game.cast),
    },
  })

  return game
}

// Characters of the manga scene. If the user has dropped a portrait image
// into data/games/hikaru/portraits/ (named after the character, e.g.
// sai.png, hikaru-shindo.jpg), it is used; otherwise the UI draws a
// uniform go-stone medallion with the character's initials.
function resolveCast(dir, cast) {
  if (cast == null || cast.length === 0) return []

  return cast.map((member) => {
    let slug = member.name
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Try the full name, then the given name alone, so one hikaru.png
    // covers both 'Hikaru Shindo' and 'Hikaru (Sai)'.
    let firstName = slug.split('-')[0]
    let portrait = ['png', 'jpg', 'jpeg', 'webp']
      .flatMap((ext) => [
        join(dir, 'portraits', `${slug}.${ext}`),
        join(dir, 'portraits', `${firstName}.${ext}`),
      ])
      .find(existsSync)

    let initials = member.name
      .replace(/\(.*?\)/g, '')
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return {...member, portrait: portrait || null, initials}
  })
}

// Leaves study mode: clears the board and puts the comment box away.
export async function stopStudy() {
  setting.set('view.show_comments', false)
  sabaki.setState({frankStudy: null, showCommentBox: false})
  await sabaki.newFile({suppressAskForSave: true})
}

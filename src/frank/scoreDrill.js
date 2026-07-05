// frank_go: score-guessing drill (renderer only).
//
// Trains the beginner skill nothing else teaches: looking at a real
// mid-game position and telling who is ahead. A random position from the
// bundled game packs (plus the optional bulk archive when present) is put
// on the board; the player answers Black / White / too close to call; the
// dead-stone estimator (komi included) reveals the verdict.
//
// "Close" answers are treated kindly: within ±CLOSE_MARGIN points either
// color answer counts as correct, and "too close" is correct too.

import {existsSync, readFileSync, readdirSync, statSync} from 'fs'
import {join} from 'path'
import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'
import {createRng} from './data/problemStore.js'
import {locateData} from './paths.js'
import {loadIndex} from './famousGames.js'
import {estimateScore} from './positionJudge.js'
import {formatLead} from './endgameAdvisor.js'

export const CLOSE_MARGIN = 3

let rng = createRng()
let drill = null // {title, moveNumber}
let stats = {correct: 0, wrong: 0, streak: 0}

function bundledGames() {
  let games = []

  for (let pack of ['famous', 'hikaru']) {
    let index = loadIndex(pack)
    if (index == null) continue

    for (let game of index.games) {
      games.push({path: join(index.dir, game.file), title: game.title})
    }
  }

  return games
}

// Random SGF from the optional 90k bulk archive: a few random descents
// into the directory tree.
function randomBulkGame() {
  let bulkRoot = locateData(join('games', 'bulk', 'games'))
  if (bulkRoot == null) return null

  for (let attempt = 0; attempt < 10; attempt++) {
    let dir = bulkRoot

    for (let depth = 0; depth < 6; depth++) {
      let entries
      try {
        entries = readdirSync(dir)
      } catch (err) {
        break
      }
      if (entries.length === 0) break

      let pick = join(dir, entries[Math.floor(rng() * entries.length)])
      let info
      try {
        info = statSync(pick)
      } catch (err) {
        break
      }

      if (info.isFile()) {
        if (pick.endsWith('.sgf')) {
          return {path: pick, title: 'A professional game'}
        }
        break
      }

      dir = pick
    }
  }

  return null
}

function publish(extra = {}) {
  sabaki.setState({
    frankScoreDrill:
      drill == null
        ? null
        : {
            title: drill.title,
            moveNumber: drill.moveNumber,
            komi: drill.komi,
            phase: drill.phase,
            reveal: drill.reveal || null,
            stats: {...stats},
            ...extra,
          },
  })
}

async function loadRandomPosition() {
  let candidates = bundledGames()
  let bulk = randomBulkGame()
  if (bulk != null) candidates.push(bulk, bulk, bulk) // bulk adds variety

  let game = candidates[Math.floor(rng() * candidates.length)]
  let text = readFileSync(game.path, 'utf8')

  await sabaki.loadContent(text, 'sgf', {suppressAskForSave: true})

  let {gameTrees, gameIndex} = sabaki.state
  let tree = gameTrees[gameIndex]
  let height = tree.getHeight()

  if (height < 60) return loadRandomPosition() // too short to judge

  let min = 50
  let max = Math.min(height - 10, 220)
  let moveNumber = min + Math.floor(rng() * Math.max(1, max - min))

  sabaki.goToMoveNumber(moveNumber)

  drill = {
    title: game.title,
    moveNumber,
    komi: +gametree.getRootProperty(tree, 'KM', 6.5),
    phase: 'guess',
    reveal: null,
  }
}

export function isActive() {
  return drill != null
}

export async function startDrill() {
  stats = {correct: 0, wrong: 0, streak: 0}
  await loadRandomPosition()
  publish()
}

export async function nextPosition() {
  if (drill == null) return

  await loadRandomPosition()
  publish()
}

// answer: 'B' | 'W' | 'close'
export async function answer(choice) {
  if (drill == null || drill.phase !== 'guess') return

  let {gameTrees, gameIndex, treePosition} = sabaki.state
  let board = gametree.getBoard(gameTrees[gameIndex], treePosition)
  let {territoryScore} = await estimateScore(board, {komi: drill.komi})
  if (drill == null) return

  let isClose = Math.abs(territoryScore) <= CLOSE_MARGIN
  let correct =
    choice === 'close'
      ? isClose
      : isClose || (choice === 'B' ? territoryScore > 0 : territoryScore < 0)

  stats[correct ? 'correct' : 'wrong']++
  stats.streak = correct ? stats.streak + 1 : 0

  drill.phase = 'reveal'
  drill.reveal = {
    correct,
    scoreText: formatLead(territoryScore),
    isClose,
  }

  publish()
}

export function stopDrill() {
  drill = null
  sabaki.setState({frankScoreDrill: null})
  sabaki.newFile({suppressAskForSave: true})
}

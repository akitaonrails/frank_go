// frank_go: heuristic position judgment for beginner feedback.
//
// Uses @sabaki/deadstones (the same Monte-Carlo heuristic behind Sabaki's
// score estimator) to guess which stones are dead, then derives:
//
// - a rough score estimate for whole-board games ("B+3.5"), and
// - a life & death verdict per color inside a problem region, so the
//   tsumego trainer can tell the player how the fight seems to stand.
//
// These are heuristics, not proofs — the UI labels them as estimates.

import deadstones from '@sabaki/deadstones'
import influence from '@sabaki/influence'
import {getScore} from '../modules/utils.js'

async function withDeadStonesRemoved(board) {
  let deadVertices = await deadstones.guess(board.signMap, {
    finished: false,
    iterations: 300,
  })

  let cleared = board.clone()

  for (let vertex of deadVertices) {
    let sign = cleared.get(vertex)
    if (sign === 0) continue

    cleared.setCaptures(-sign, (x) => x + 1)
    cleared.set(vertex, 0)
  }

  return {deadVertices, cleared}
}

// Set of "x,y" keys for stones that look dead on the given board.
export async function guessDeadSet(board) {
  let {deadVertices} = await withDeadStonesRemoved(board)
  return new Set(deadVertices.map(([x, y]) => `${x},${y}`))
}

// Rough Japanese-style score estimate of the current board.
export async function estimateScore(board, {komi = 6.5, handicap = 0} = {}) {
  let {deadVertices, cleared} = await withDeadStonesRemoved(board)
  let areaMap = influence.map(cleared.signMap, {discrete: true})
  let score = getScore(cleared, areaMap, {komi, handicap})
  let value = score.territoryScore

  return {
    scoreText:
      value === 0
        ? 'Even'
        : `${value > 0 ? 'B' : 'W'}+${Math.abs(Math.round(value * 2) / 2)}`,
    territoryScore: value,
    deadVertices,
  }
}

// Life & death verdict for the stones inside (or near) a problem region.
// Returns {black: 'alive'|'dead'|'none', white: …}.
export async function judgeRegion(board, region) {
  let [x1, y1, x2, y2] = region
  let margin = 2
  let {deadVertices} = await withDeadStonesRemoved(board)
  let deadSet = new Set(deadVertices.map(([x, y]) => `${x},${y}`))

  // Majority verdict per color: a single dead throw-in stone shouldn't
  // flip the verdict for a color whose main group is alive.
  let counts = {1: {dead: 0, alive: 0}, '-1': {dead: 0, alive: 0}}

  let yMin = Math.max(0, y1 - margin)
  let yMax = Math.min(board.height - 1, y2 + margin)
  let xMin = Math.max(0, x1 - margin)
  let xMax = Math.min(board.width - 1, x2 + margin)

  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      let sign = board.get([x, y])
      if (sign === 0) continue

      counts[sign][deadSet.has(`${x},${y}`) ? 'dead' : 'alive']++
    }
  }

  let verdict = (c) =>
    c.dead + c.alive === 0 ? 'none' : c.dead > c.alive ? 'dead' : 'alive'

  return {black: verdict(counts[1]), white: verdict(counts['-1'])}
}

// One friendly sentence out of a verdict.
export function describeVerdict({black, white}) {
  let parts = []

  if (black !== 'none') {
    parts.push(
      black === 'dead' ? 'Black stones look dead' : 'Black looks alive',
    )
  }

  if (white !== 'none') {
    parts.push(
      white === 'dead' ? 'White stones look dead' : 'White looks alive',
    )
  }

  if (parts.length === 0) return 'No stones to judge yet.'

  return parts.join(' · ')
}

// frank_go: ladder-reading drill — generated, verified, unlimited.
//
// A classic reading exercise: can Black capture the marked white stone in
// a ladder? Positions are generated randomly (sometimes with a ladder
// breaker waiting on the escape path) and the answer is computed by
// searching the ladder on a real board — black tries both atari sides,
// white always extends its last liberty — so the drill is exactly right
// and the full running sequence can be replayed.
//
// Geometry note (verified empirically): a lone stone behind a bare
// two-stone wall canNOT be laddered — after the first extension the head
// has three liberties. The classic working shape needs a third black
// support stone diagonally ahead on the wall side; from there every
// extension lands next to a black stone placed two plies earlier and the
// chain stays in atari. The generator builds exactly that shape.
//
// Pure logic (no Sabaki imports): unit-testable from node.

import Board from '@sabaki/go-board'
import {createRng} from './data/problemStore.js'

const SIZE = 19
const MAX_DEPTH = 60

// Search: black to move against the white chain containing `runner`.
// Black wins if some liberty play leaves white with 0 liberties, or
// leaves white in atari such that white's forced extension still loses.
// Returns {works, moves} with the winning line (or the longest losing
// line, for replaying the escape).
export function simulateLadder(board, runner, blackSign = 1, depth = 0) {
  let whiteSign = -blackSign
  let liberties = board.getLiberties(runner)

  if (liberties.length === 0) return {works: true, moves: []}
  if (liberties.length >= 3 || depth > MAX_DEPTH) {
    return {works: false, moves: []}
  }

  let bestFail = {works: false, moves: []}

  for (let candidate of liberties) {
    let afterBlack
    try {
      afterBlack = board.makeMove(blackSign, candidate, {
        preventOverwrite: true,
        preventSuicide: true,
      })
    } catch (err) {
      continue
    }

    let blackMove = {sign: blackSign, vertex: candidate}
    let whiteLibs = afterBlack.getLiberties(runner)

    if (whiteLibs.length === 0) {
      return {works: true, moves: [blackMove]}
    }

    // A black ladder move must be atari, and the atari stone itself must
    // not be capturable on the spot
    if (whiteLibs.length !== 1) continue
    if (afterBlack.getLiberties(candidate).length < 2) continue

    // White is forced to extend its single liberty
    let escape = whiteLibs[0]
    let afterWhite
    try {
      afterWhite = afterBlack.makeMove(whiteSign, escape, {
        preventOverwrite: true,
        preventSuicide: true,
      })
    } catch (err) {
      return {works: true, moves: [blackMove]} // cannot even extend
    }

    let whiteMove = {sign: whiteSign, vertex: escape}
    let rest = simulateLadder(afterWhite, runner, blackSign, depth + 2)
    let line = [blackMove, whiteMove, ...rest.moves]

    if (rest.works) return {works: true, moves: line}
    if (line.length > bestFail.moves.length) {
      bestFail = {works: false, moves: line}
    }
  }

  return bestFail
}

// Builds a random ladder position in the verified working shape:
// runner W at (x0,y0); black wall at (x0-dx,y0) and (x0,y0-dy); black
// support at (x0+dx,y0-dy). Without interference the ladder always works;
// a breaker dropped on the escape path flips the answer.
export function generateLadder(rng = createRng()) {
  let quadrant = Math.floor(rng() * 4)
  let dx = quadrant % 2 === 0 ? 1 : -1
  let dy = quadrant < 2 ? 1 : -1

  let x0 = dx > 0 ? 3 + Math.floor(rng() * 3) : 15 - Math.floor(rng() * 3)
  let y0 = dy > 0 ? 3 + Math.floor(rng() * 3) : 15 - Math.floor(rng() * 3)

  let runner = [x0, y0]
  let blackStones = [
    [x0 - dx, y0],
    [x0, y0 - dy],
    [x0 + dx, y0 - dy],
  ]

  let base = Board.fromDimensions(SIZE)
  base = base.makeMove(-1, runner)
  for (let vertex of blackStones) base = base.makeMove(1, vertex)

  // Dry-run to learn the escape path
  let dryRun = simulateLadder(base, runner)
  let whitePath = dryRun.moves
    .filter((move) => move.sign === -1)
    .map((move) => move.vertex)

  // Half the time, drop a breaker on a future escape square
  let breaker = null

  if (rng() < 0.5 && whitePath.length > 6) {
    let k = 3 + Math.floor(rng() * (Math.min(whitePath.length, 14) - 4))
    breaker = whitePath[k]
  }

  let board = base
  if (breaker != null) board = board.makeMove(-1, breaker)

  let result = simulateLadder(board, runner)

  let AB = blackStones.map(sgfVertex)
  let AW = [runner, ...(breaker != null ? [breaker] : [])].map(sgfVertex)

  return {
    setup: {AB, AW},
    runner,
    works: result.works,
    moves: result.moves,
    breaker,
  }
}

export function sgfVertex([x, y]) {
  return String.fromCharCode(97 + x) + String.fromCharCode(97 + y)
}

// Renders the drill as a standalone SGF; with the sequence when included.
export function ladderToSgf(ladder, {withSequence = false} = {}) {
  let list = (values) => values.map((coord) => `[${coord}]`).join('')
  let runnerCoord = sgfVertex(ladder.runner)
  let statement = withSequence
    ? 'Watch the ladder run.'
    : 'Black to play: can the marked white stone be captured in a ladder?'

  let parts = [
    `;GM[1]FF[4]CA[UTF-8]AP[frank_go]SZ[${SIZE}]PL[B]`,
    `AB${list(ladder.setup.AB)}`,
    `AW${list(ladder.setup.AW)}`,
    `TR[${runnerCoord}]`,
    `C[${statement}]`,
  ]

  let sgf = parts.join('')

  if (withSequence) {
    for (let move of ladder.moves) {
      sgf += `;${move.sign === 1 ? 'B' : 'W'}[${sgfVertex(move.vertex)}]`
    }
  }

  return `(${sgf})`
}

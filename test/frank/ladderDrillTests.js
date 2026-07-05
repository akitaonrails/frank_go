import assert from 'assert'
import Board from '@sabaki/go-board'
import {createRng} from '../../src/frank/data/problemStore.js'
import {
  generateLadder,
  ladderToSgf,
  simulateLadder,
} from '../../src/frank/ladderDrill.js'

function classicSetup() {
  // White runner at (4,4) with the verified working shape: wall left and
  // above plus the diagonal support stone — runs toward bottom-right
  let board = Board.fromDimensions(19)
  board = board.makeMove(-1, [4, 4])
  board = board.makeMove(1, [3, 4])
  board = board.makeMove(1, [4, 3])
  board = board.makeMove(1, [5, 3])
  return board
}

describe('simulateLadder', () => {
  it('captures the runner on an empty board', () => {
    let {works, moves} = simulateLadder(classicSetup(), [4, 4])

    assert.equal(works, true)
    assert.ok(moves.length > 10, `expected a long run, got ${moves.length}`)
    // Alternating colors, Black first
    assert.equal(moves[0].sign, 1)
    assert.ok(moves.every((move, i) => move.sign === (i % 2 === 0 ? 1 : -1)))
  })

  it('lets the runner escape when a breaker waits on the path', () => {
    let clean = simulateLadder(classicSetup(), [4, 4])
    let whitePath = clean.moves
      .filter((move) => move.sign === -1)
      .map((move) => move.vertex)

    let board = classicSetup().makeMove(-1, whitePath[5])
    let {works} = simulateLadder(board, [4, 4])

    assert.equal(works, false)
  })

  it('produces only legal moves', () => {
    let {moves} = simulateLadder(classicSetup(), [4, 4])
    let board = classicSetup()

    for (let move of moves) {
      board = board.makeMove(move.sign, move.vertex, {
        preventOverwrite: true,
        preventSuicide: true,
      })
    }
  })
})

describe('generateLadder', () => {
  it('generates a mix of working and broken ladders, all verified', () => {
    let works = 0
    let fails = 0

    for (let seed = 1; seed <= 60; seed++) {
      let ladder = generateLadder(createRng(seed))

      // Re-verify from scratch: rebuild the board from the setup and
      // simulate — the stored answer must match
      let board = Board.fromDimensions(19)
      for (let coord of ladder.setup.AB) {
        board = board.makeMove(1, [
          coord.charCodeAt(0) - 97,
          coord.charCodeAt(1) - 97,
        ])
      }
      for (let coord of ladder.setup.AW) {
        board = board.makeMove(-1, [
          coord.charCodeAt(0) - 97,
          coord.charCodeAt(1) - 97,
        ])
      }

      let check = simulateLadder(board, ladder.runner)
      assert.equal(check.works, ladder.works, `seed ${seed} disagrees`)

      if (ladder.works) works++
      else fails++
    }

    assert.ok(works >= 10, `too few working ladders: ${works}`)
    assert.ok(fails >= 10, `too few broken ladders: ${fails}`)
  })

  it('breaker presence implies escape', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let ladder = generateLadder(createRng(seed))

      if (ladder.breaker != null) {
        assert.equal(
          ladder.works,
          false,
          `seed ${seed}: breaker should break the ladder`,
        )
      }
    }
  })
})

describe('ladderToSgf', () => {
  it('renders setup and sequence variants', () => {
    let ladder = generateLadder(createRng(7))
    let setup = ladderToSgf(ladder)
    let sequence = ladderToSgf(ladder, {withSequence: true})

    assert.ok(setup.includes('captured in a ladder'))
    assert.ok(!setup.includes(';B['))
    assert.ok(sequence.split(';B[').length > 2)
  })
})

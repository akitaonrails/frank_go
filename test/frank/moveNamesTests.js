import assert from 'assert'
import Board from '@sabaki/go-board'
import {nameForMove} from '../../src/frank/moveNames.js'

describe('nameForMove', () => {
  let board = Board.fromDimensions(19)
  board = board.makeMove(1, [3, 3])

  it('names contact and shape moves', () => {
    assert.equal(nameForMove(board, -1, [3, 4]), 'Attachment')

    let afterAttach = board.makeMove(-1, [3, 4])
    assert.equal(nameForMove(afterAttach, 1, [2, 4]), 'Hane')
  })

  it('names opening points, including tengen', () => {
    let empty = Board.fromDimensions(19)
    assert.equal(nameForMove(empty, 1, [2, 3]), '3-4 Point')
    assert.equal(nameForMove(empty, 1, [9, 9]), 'Tengen')
  })

  it('returns null for occupied points and unnamed middle moves', () => {
    assert.equal(nameForMove(board, -1, [3, 3]), null)
    assert.equal(nameForMove(Board.fromDimensions(19), 1, [7, 9]), null)
  })
})

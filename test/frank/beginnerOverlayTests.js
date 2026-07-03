import assert from 'assert'
import {computeBeginnerPaintMap} from '../../src/frank/beginnerOverlay.js'

function emptyBoard(size) {
  return Array.from({length: size}, () => Array(size).fill(0))
}

describe('computeBeginnerPaintMap', () => {
  it('returns all zeros for an empty board', () => {
    let paint = computeBeginnerPaintMap(emptyBoard(9))

    assert.ok(paint.every((row) => row.every((value) => value === 0)))
  })

  it('radiates a soft gradient around a lone center stone', () => {
    let signMap = emptyBoard(9)
    signMap[4][4] = 1

    let paint = computeBeginnerPaintMap(signMap)

    // Positive (black) influence near the stone…
    assert.ok(paint[4][3] > 0)
    assert.ok(paint[3][4] > 0)
    // …softer than decisive territory…
    assert.ok(Math.abs(paint[4][3]) < 1)
    // …fading with distance…
    assert.ok(paint[4][3] > paint[0][0])
    assert.ok(paint[0][0] >= 0)
    // …and no white influence anywhere.
    assert.ok(paint.every((row) => row.every((value) => value >= 0)))
  })

  it('paints a fully enclosed corner at full strength', () => {
    let signMap = emptyBoard(9)
    // White wall cutting off the top-right corner point, black stone far
    // away in the opposite corner so the rest of the board is contested
    signMap[0][7] = -1
    signMap[1][7] = -1
    signMap[1][8] = -1
    signMap[8][0] = 1

    let paint = computeBeginnerPaintMap(signMap)

    // The corner point behind the wall is decisively white.
    assert.equal(paint[0][8], -1)
    // Points on the open side are gradient only.
    assert.ok(paint[0][4] < 0 && paint[0][4] > -1)
  })

  it('keeps black and white influence on their own sides', () => {
    let signMap = emptyBoard(9)
    signMap[2][2] = 1
    signMap[6][6] = -1

    let paint = computeBeginnerPaintMap(signMap)

    assert.ok(paint[2][1] > 0)
    assert.ok(paint[6][7] < 0)
  })
})

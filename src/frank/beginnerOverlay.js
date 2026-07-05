// frank_go: beginner "area painting" overlay.
//
// Paints the board with each player's sphere of influence so beginners can
// see what stones are aiming at:
//
// - A stone radiates a soft gradient that fades with distance (a stone on
//   tengen glows over the center, a corner enclosure glows into the corner).
// - When both players have stones, the direction of each point's gradient is
//   decided by relative influence (@sabaki/influence, the library behind
//   Sabaki's score estimator), and decisively enclosed areas — an empty
//   region bordered by a single color, e.g. after captures — are painted at
//   full strength.
//
// Values feed Shudan's `paintMap`, which renders |value| * 0.5 as opacity in
// the owning player's color, so ±1 is "settled" and fractions are gradient.

import influence from '@sabaki/influence'
import deadstones from '@sabaki/deadstones'

const GRADIENT_SCALE = 0.55
const DECAY_RANGE = 2.5

// Caches are keyed on a signature of the position's stones, NOT the board
// object: gametree.getBoard() returns a FRESH board object every call for
// the current position, so a WeakMap keyed on it would miss on every
// render and re-run the async dead-stone guess forever (spinning cursor +
// re-render storm). The signature makes identical positions share a
// result and lets us skip work when nothing changed.
let paintByKey = new Map()
let deadByKey = new Map()
let inFlight = new Set()

function signature(signMap) {
  let s = ''
  for (let row of signMap) {
    for (let value of row) s += value < 0 ? 'w' : value > 0 ? 'b' : '.'
  }
  return s
}

// Keep the caches from growing without bound over a long session
function trim(map) {
  if (map.size > 400) map.clear()
}

// Chebyshev-style BFS distance (8 neighbors) to the nearest stone of `sign`.
// Returns Infinity everywhere when that color has no stones.
function distanceMap(signMap, sign) {
  let height = signMap.length
  let width = signMap[0].length
  let dist = signMap.map((row) => row.map(() => Infinity))
  let queue = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (signMap[y][x] === sign) {
        dist[y][x] = 0
        queue.push([x, y])
      }
    }
  }

  for (let i = 0; i < queue.length; i++) {
    let [x, y] = queue[i]

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let nx = x + dx
        let ny = y + dy

        if (
          (dx !== 0 || dy !== 0) &&
          nx >= 0 &&
          ny >= 0 &&
          nx < width &&
          ny < height &&
          dist[ny][nx] === Infinity
        ) {
          dist[ny][nx] = dist[y][x] + 1
          queue.push([nx, ny])
        }
      }
    }
  }

  return dist
}

// 1 on and next to a stone, fading towards 0 with distance.
function decay(distance) {
  if (distance === Infinity) return 0
  return Math.exp(-Math.max(0, distance - 1) / DECAY_RANGE)
}

export function computeBeginnerPaintMap(signMap) {
  let distBlack = distanceMap(signMap, 1)
  let distWhite = distanceMap(signMap, -1)
  let hasBlack = distBlack.some((row) => row.some((d) => d === 0))
  let hasWhite = distWhite.some((row) => row.some((d) => d === 0))

  if (!hasBlack && !hasWhite) {
    return signMap.map((row) => row.map(() => 0))
  }

  if (!hasBlack || !hasWhite) {
    // Only one player has stones: pure radiance, no territory is settled yet.
    let sign = hasBlack ? 1 : -1
    let dist = hasBlack ? distBlack : distWhite

    return dist.map((row) => row.map((d) => sign * decay(d) * GRADIENT_SCALE))
  }

  let fuzzy = influence.map(signMap)
  let area = influence.areaMap(signMap)

  return signMap.map((row, y) =>
    row.map((_, x) => {
      if (area[y][x] !== 0) return area[y][x]

      let value = fuzzy[y][x]
      if (value === 0) return 0

      let dist = value > 0 ? distBlack[y][x] : distWhite[y][x]
      return value * decay(dist) * GRADIENT_SCALE
    }),
  )
}

// Same computation, but with likely-dead stones treated as captured:
// their cells clear before the influence pass, so the surrounding
// opponent territory swallows them decisively — beginners see that the
// area is settled and playing inside it is pointless.
export function computeBeginnerPaintMapWithDead(signMap, deadVertices) {
  if (deadVertices.length === 0) return computeBeginnerPaintMap(signMap)

  let cleared = signMap.map((row) => row.slice())
  for (let [x, y] of deadVertices) cleared[y][x] = 0

  return computeBeginnerPaintMap(cleared)
}

// Memoized on the position signature (see note above).
export function getBeginnerPaintMap(board) {
  let key = signature(board.signMap)

  if (!paintByKey.has(key)) {
    trim(paintByKey)
    paintByKey.set(key, computeBeginnerPaintMap(board.signMap))
  }

  return paintByKey.get(key)
}

// Cheap check: is a dead-stone guess even worth it? An empty or nearly
// empty board has nothing to judge, so we skip the wasm call entirely
// (this alone stops the idle welcome-screen board from churning).
function worthGuessing(signMap) {
  let stones = 0
  for (let row of signMap) {
    for (let value of row) {
      if (value !== 0 && ++stones >= 8) return true
    }
  }
  return false
}

// Full overlay: instant gradient paint plus, once the Monte-Carlo guess
// finishes (a few ms, async wasm), likely-dead stones — dimmed on the
// board with their area repainted as the opponent's. `notify` is called
// ONCE when the refined result for a new position is ready. Keyed on the
// position signature so repeated renders of the same board reuse the
// result and never re-run the guess.
export function getBeginnerOverlay(board, notify = () => {}) {
  let key = signature(board.signMap)

  if (deadByKey.has(key)) {
    return deadByKey.get(key)
  }

  let base = {paintMap: getBeginnerPaintMap(board), deadStones: []}

  if (worthGuessing(board.signMap) && !inFlight.has(key)) {
    inFlight.add(key)

    deadstones
      .guess(board.signMap, {finished: false, iterations: 300})
      .then((dead) => {
        trim(deadByKey)
        deadByKey.set(key, {
          paintMap: computeBeginnerPaintMapWithDead(board.signMap, dead),
          deadStones: dead,
        })
        inFlight.delete(key)
        if (dead.length > 0) notify()
      })
      .catch(() => {
        inFlight.delete(key)
      })
  }

  return base
}

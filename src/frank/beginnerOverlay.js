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

const GRADIENT_SCALE = 0.55
const DECAY_RANGE = 2.5

let cache = new WeakMap()

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

// Memoized per board object — Sabaki caches boards per tree position, so
// navigating back and forth doesn't recompute.
export function getBeginnerPaintMap(board) {
  if (!cache.has(board)) {
    cache.set(board, computeBeginnerPaintMap(board.signMap))
  }

  return cache.get(board)
}

// frank_go: names go moves ("Hane", "Attachment", "One-Point Jump"…)
// using Sabaki's bundled @sabaki/boardmatcher — the same pattern engine
// behind the comment box's move interpretation. Pure: takes the board
// BEFORE the move.

import boardmatcher from '@sabaki/boardmatcher'

export function nameForMove(prevBoard, sign, vertex) {
  if (prevBoard.get(vertex) !== 0) return null

  let match = boardmatcher.findPatternInMove(prevBoard.signMap, sign, vertex)
  if (match != null) return match.pattern.name

  // Early corner moves: fall back to the point name (3-4 point, …)
  let diff = vertex
    .map((z, i) => Math.min(z + 1, [prevBoard.width, prevBoard.height][i] - z))
    .sort((a, b) => a - b)

  if (diff[0] > 6) return null
  return `${diff[0]}-${diff[1]} point`
}

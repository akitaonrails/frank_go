// frank_go: pure parsing of KataGo `kata-analyze` output. No Sabaki/window
// imports, so it is unit-testable.
//
// kata-analyze streams lines each holding one or more records of the form
//   info move <coord> visits <n> winrate <w> scoreLead <s> pv <...>
// (repeated, all on one line). We want, per candidate move, its scoreLead
// from the perspective of the player to move.

// Parses one or more streamed lines; returns a Map of GTP coord →
// scoreLead taken from the richest (most candidates) line seen.
export function parseScoreLeads(lines) {
  let best = new Map()

  for (let line of lines) {
    if (typeof line !== 'string' || !line.includes('info move')) continue

    let map = new Map()
    for (let record of line.split('info move').slice(1)) {
      let move = record.trim().split(/\s+/)[0]
      let scoreMatch = record.match(/scoreLead\s+(-?\d+(?:\.\d+)?)/)
      if (move && scoreMatch) map.set(move, parseFloat(scoreMatch[1]))
    }

    if (map.size >= best.size) best = map
  }

  return best
}

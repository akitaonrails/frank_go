// frank_go: end-of-game intelligence for KataGo play sessions — pure
// logic over a history of score estimates (positive = Black leads, komi
// already included by the estimator).
//
// Two pieces of advice, in the spirit of KataGo's own resignation rules
// (its GTP config resigns on a sustained hopeless winrate, e.g.
// resignThreshold + resignConsecTurns). We use the score lead instead of
// winrate because it is meaningful to beginners ("~40 points behind")
// and works with the offline dead-stone estimator:
//
// - 'resign-hint': the player has been behind by at least RESIGN_LEAD
//   points for RESIGN_CONSEC consecutive estimates, past the opening.
//   Placing more stones will not change the outcome.
// - 'settled': the estimate has been stable (within SETTLED_DELTA) for
//   SETTLED_CONSEC estimates late in the game — the borders are decided,
//   time to pass and count rather than fill in useless moves.

export const RESIGN_LEAD = 35
export const RESIGN_CONSEC = 3
export const SETTLED_DELTA = 1.5
export const SETTLED_CONSEC = 4

// Don't advise anything before the game has taken shape.
export const MIN_MOVES_RESIGN = 40
export const MIN_MOVES_SETTLED = 80

// history: array of {lead, moveNumber}, oldest first, one entry per
// position seen. playerSign: 1 when the human plays Black.
export function advise(history, {playerSign}) {
  if (history.length === 0) return {type: null}

  let latest = history[history.length - 1]
  let playerLead = latest.lead * playerSign

  if (
    latest.moveNumber >= MIN_MOVES_RESIGN &&
    history.length >= RESIGN_CONSEC &&
    history
      .slice(-RESIGN_CONSEC)
      .every((entry) => entry.lead * playerSign <= -RESIGN_LEAD)
  ) {
    return {type: 'resign-hint', playerLead}
  }

  if (
    latest.moveNumber >= MIN_MOVES_SETTLED &&
    history.length >= SETTLED_CONSEC
  ) {
    let window = history.slice(-SETTLED_CONSEC)
    let leads = window.map((entry) => entry.lead)
    let stable = Math.max(...leads) - Math.min(...leads) <= SETTLED_DELTA

    if (stable) return {type: 'settled', playerLead}
  }

  return {type: null, playerLead}
}

// 'B+3.5', 'W+12', 'Even'
export function formatLead(lead) {
  let rounded = Math.round(lead * 2) / 2
  if (rounded === 0) return 'Even'

  return `${rounded > 0 ? 'B' : 'W'}+${Math.abs(rounded)}`
}

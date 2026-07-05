// frank_go: on-demand KataGo review of a wrong guess in study mode.
//
// Robustness is the priority: NOTHING here may block the user's ability to
// keep guessing, reveal the move, or resume auto-play. Every path is
// guarded and time-bounded; on any failure it returns a graceful message
// and the caller carries on. An analysis engine is attached lazily and
// reused across reviews, then detached when study ends (releaseEngine).

import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'
import sgf from '@sabaki/sgf'
import {findKataGoEngine} from './katagoPlay.js'

// Fixed budget so numbers are consistent and the wait is bounded.
const ANALYSIS_MS = 2500
const KATA_ANALYZE = 'kata-analyze'

let analysisSyncerId = null

function attachedSyncer() {
  if (analysisSyncerId == null) return null
  return sabaki.state.attachedEngineSyncers.find(
    (syncer) => syncer.id === analysisSyncerId,
  )
}

// KataGo can take many seconds to come up the first time (loading the
// network, initializing the backend). We treat a successful `sync` — the
// thing we actually need — as the readiness signal, retrying it over a
// generous budget rather than pinging a separate command.
const SYNC_RETRY_MS = 2000
const SYNC_BUDGET_MS = 40000

// Lazily attaches a KataGo engine and syncs it to the position, retrying
// while it boots. Returns {syncer, status}: 'ready' (synced), 'starting'
// (attached but not responsive within the budget), 'none' (no engine).
async function ensureSynced(tree, treePosition) {
  let syncer = attachedSyncer()

  if (syncer == null) {
    let engine = findKataGoEngine()
    if (engine == null) return {syncer: null, status: 'none'}

    try {
      ;[syncer] = sabaki.attachEngines([engine])
    } catch (err) {
      return {syncer: null, status: 'none'}
    }

    if (syncer == null) return {syncer: null, status: 'none'}
    analysisSyncerId = syncer.id
  }

  let deadline = Date.now() + SYNC_BUDGET_MS

  while (Date.now() < deadline) {
    let ok = await syncer.sync(tree, treePosition).then(
      () => true,
      () => false,
    )
    if (ok) return {syncer, status: 'ready'}

    // The engine process died (e.g. a GPU-backend KataGo with no working
    // driver) — fail fast and clearly instead of waiting out the budget.
    if (syncer.suspended) return {syncer, status: 'failed'}

    await new Promise((resolve) => setTimeout(resolve, SYNC_RETRY_MS))
  }

  return {syncer, status: 'starting'}
}

export function hasEngine() {
  return findKataGoEngine() != null
}

// True once the analysis engine has been attached (so a review will be
// quick); false on the very first review, when KataGo still has to boot.
export function isEngineWarm() {
  return attachedSyncer() != null
}

// Detach the analysis engine — called when leaving study mode.
export function releaseEngine() {
  if (analysisSyncerId != null) {
    try {
      sabaki.detachEngines([analysisSyncerId])
    } catch (err) {}
    analysisSyncerId = null
  }
}

// Parse `kata-analyze` output: a stream of lines each containing one or
// more "info move <coord> ... scoreLead <n> ..." records. Returns a map
// of GTP coord → scoreLead (player-to-move perspective) from the richest
// (last) line seen.
function parseScoreLeads(lines) {
  let best = new Map()

  for (let line of lines) {
    if (!line.includes('info move')) continue

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

// Runs a time-bounded analysis of the current engine position. Resolves to
// a coord→scoreLead map (possibly empty), never rejects.
async function analyzeCurrent(syncer, color) {
  let lines = []

  let collect = ({line}) => {
    if (typeof line === 'string') lines.push(line)
  }

  let done = syncer
    .queueCommand({name: KATA_ANALYZE, args: [color, '50']}, collect)
    .catch(() => {})

  await new Promise((resolve) => setTimeout(resolve, ANALYSIS_MS))

  try {
    await syncer.sendAbort()
  } catch (err) {}

  await Promise.race([done, new Promise((r) => setTimeout(r, 500))])

  return parseScoreLeads(lines)
}

// The pro's actual next move, as a GTP coord + label, or null.
function proNextMove() {
  let {gameTrees, gameIndex, gameCurrents, treePosition} = sabaki.state
  let tree = gameTrees[gameIndex]
  let next = tree.navigate(treePosition, 1, gameCurrents[gameIndex])
  if (next == null) return null

  let color = next.data.B != null ? 'B' : next.data.W != null ? 'W' : null
  if (color == null || next.data[color][0] === '') return null

  let board = gametree.getBoard(tree, treePosition)
  let vertex = sgf.parseVertex(next.data[color][0])

  return {
    coord: board.stringifyVertex(vertex),
    sign: color === 'B' ? 1 : -1,
  }
}

// Main entry: review the player's wrong `guessVertex` ([x,y]) against the
// pro's move. Returns a friendly string. Never throws.
export async function reviewGuess(guessVertex) {
  try {
    let {gameTrees, gameIndex, treePosition} = sabaki.state
    let tree = gameTrees[gameIndex]
    let board = gametree.getBoard(tree, treePosition)
    let sign = sabaki.getPlayer(treePosition)
    let color = sign > 0 ? 'B' : 'W'

    let pro = proNextMove()
    if (pro == null) return 'The game has no next move to compare against.'

    let guessCoord = board.stringifyVertex(guessVertex)

    let {syncer, status} = await ensureSynced(tree, treePosition)
    if (status === 'none') {
      return `KataGo isn’t set up yet, so I can’t analyze — but the pro played ${pro.coord}.`
    }
    if (status === 'failed') {
      return `Your KataGo failed to start — a GPU build (katago-opencl / katago-cuda) with no working driver? Install katago-cpu, or re-run the in-app KataGo setup for a CPU engine. The pro played ${pro.coord}.`
    }
    if (status === 'starting') {
      return `KataGo is taking a while to start on this machine — the pro played ${pro.coord}. Try again in a moment.`
    }

    let scores = await analyzeCurrent(syncer, color)

    let proScore = scores.get(pro.coord)
    let guessScore = scores.get(guessCoord)

    let leadStr = (n) =>
      n === 0
        ? 'even'
        : `${n > 0 ? 'B' : 'W'}+${Math.abs(Math.round(n * 10) / 10)}`

    if (proScore != null && guessScore != null) {
      let delta = Math.abs(Math.round((proScore - guessScore) * 10) / 10)
      let signFromPlayer = color === 'B' ? 1 : -1
      let proFromPlayer = proScore * signFromPlayer
      let guessFromPlayer = guessScore * signFromPlayer

      if (delta < 1) {
        return `Your ${guessCoord} is actually fine here (about ${leadStr(guessScore)}). The pro chose ${pro.coord} (${leadStr(proScore)}) — nearly the same.`
      }

      let worseBetter =
        guessFromPlayer < proFromPlayer
          ? 'about ' + delta + ' points worse'
          : 'close'

      return `KataGo: your ${guessCoord} ≈ ${leadStr(guessScore)}, the pro’s ${pro.coord} ≈ ${leadStr(proScore)} — ${worseBetter} for you.`
    }

    if (proScore != null) {
      return `Your ${guessCoord} wasn’t among KataGo’s top moves, so it’s likely a fair bit worse. The pro played ${pro.coord} (≈ ${leadStr(proScore)}).`
    }

    return `KataGo couldn’t settle on a clear read in time. The pro played ${pro.coord}.`
  } catch (err) {
    return 'Analysis hiccuped — no harm done. Reveal the move and carry on.'
  }
}

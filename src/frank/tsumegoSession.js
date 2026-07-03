// frank_go: tsumego practice session (renderer only).
//
// Orchestrates the practice loop: pick a problem near the player's level,
// load it into Sabaki's board, let the player play it out, then grade.
//
// If a KataGo engine is configured (npm run frank:katago), it is attached
// as a sparring partner: it answers the player's moves inside the problem,
// so the position fights back. When the engine plays far away from the
// problem region (tenuki) or passes, the local fight is settled — we drop
// that stray move, judge the region against the problem's inferred goal
// (kill the opponent / make our group live) and, on success, auto-grade
// Solved. The verdict is a heuristic (positionJudge.js), so the manual
// Solved/Missed buttons always remain available; bundled problems ship
// without solution trees (see data/SOURCES.md).

import sabaki from '../modules/sabaki.js'
import sgf from '@sabaki/sgf'
import * as gametree from '../modules/gametree.js'
import {getSharedStore, problemToSgf, createRng} from './data/problemStore.js'
import {
  STREAK_TO_LEVEL_UP,
  applyResult,
  initialProgress,
  pickProblem,
} from './tsumegoProgress.js'
import {findKataGoEngine} from './katagoPlay.js'
import {judgeRegion} from './positionJudge.js'

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

const MAX_SOLVED_REMEMBERED = 20000

// An engine move farther than this (Chebyshev) outside the problem's
// bounding box counts as tenuki — the engine has left the local fight.
const TENUKI_MARGIN = 3

const AUTO_ADVANCE_DELAY = 2600

let rng = createRng()
let currentProblem = null
let sessionStats = {solved: 0, missed: 0}
let sparringSyncerId = null

// Per-problem auto-grading state
let goal = null // 'kill' | 'live'
let settled = false
let judging = false
let autoVerdict = null // {result: 'solved'|'failed', text}
let autoAdvanceTimer = null
let moveListener = null

function loadSolvedIds() {
  try {
    return new Set(JSON.parse(setting.get('frank.tsumego_solved') || '{}').ids)
  } catch (err) {
    return new Set()
  }
}

function saveSolvedIds(solvedIds) {
  let ids = [...solvedIds].slice(-MAX_SOLVED_REMEMBERED)
  setting.set('frank.tsumego_solved', JSON.stringify({ids}))
}

function publishState(progress, lastEvent = null) {
  sabaki.setState({
    frankTsumego:
      currentProblem == null
        ? null
        : {
            problem: {
              id: currentProblem.id,
              title: currentProblem.title,
              collection: currentProblem.collection,
              level: currentProblem.level,
              category: currentProblem.category,
              toPlay: currentProblem.toPlay,
              region: currentProblem.region,
            },
            progress,
            streakTarget: STREAK_TO_LEVEL_UP,
            sessionStats: {...sessionStats},
            sparring: sparringSyncerId != null,
            autoVerdict,
            lastEvent,
          },
  })
}

function loadProgress() {
  return {
    ...initialProgress(setting.get('frank.tsumego_level') || 1),
    streak: setting.get('frank.tsumego_streak') || 0,
  }
}

function saveProgress(progress) {
  setting.set('frank.tsumego_level', progress.level)
  setting.set('frank.tsumego_streak', progress.streak)
}

function currentBoard() {
  let {gameTrees, gameIndex, treePosition} = sabaki.state
  return gametree.getBoard(gameTrees[gameIndex], treePosition)
}

function cancelAutoAdvance() {
  if (autoAdvanceTimer != null) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
}

// The engine plays the problem's opposing color and auto-answers through
// Sabaki's regular engine flow (generateMove after each human move).
function assignSparringColors() {
  if (sparringSyncerId == null || currentProblem == null) return

  let engineIsWhite = currentProblem.toPlay === 'B'

  sabaki.setState({
    blackEngineSyncerId: engineIsWhite ? null : sparringSyncerId,
    whiteEngineSyncerId: engineIsWhite ? sparringSyncerId : null,
  })
}

function unassignSparringColors() {
  sabaki.setState({blackEngineSyncerId: null, whiteEngineSyncerId: null})
}

function ensureSparringPartner() {
  if (setting.get('frank.tsumego_sparring') === false) return

  if (
    sparringSyncerId != null &&
    sabaki.state.attachedEngineSyncers.some((s) => s.id === sparringSyncerId)
  ) {
    return
  }

  let engine = findKataGoEngine()
  if (engine == null) return

  let [syncer] = sabaki.attachEngines([engine])
  sparringSyncerId = syncer != null ? syncer.id : null
}

// The problems don't say whether the goal is to kill or to live, so infer
// it from the starting position: if our own stones look dead, the task is
// to live; otherwise the task is to kill the opponent.
async function inferGoal() {
  if (currentProblem == null) return

  try {
    let verdict = await judgeRegion(currentBoard(), currentProblem.region)
    let mine = currentProblem.toPlay === 'B' ? verdict.black : verdict.white

    goal = mine === 'dead' ? 'live' : 'kill'
  } catch (err) {
    goal = 'kill'
  }
}

function isInsideRegion(vertex, region, margin = TENUKI_MARGIN) {
  let [x1, y1, x2, y2] = region

  return (
    vertex[0] >= x1 - margin &&
    vertex[0] <= x2 + margin &&
    vertex[1] >= y1 - margin &&
    vertex[1] <= y2 + margin
  )
}

// Called after every move; reacts when the sparring engine leaves the
// problem area (or passes), which means the local fight is settled.
async function handleMoveMake() {
  if (
    currentProblem == null ||
    settled ||
    judging ||
    sparringSyncerId == null
  ) {
    return
  }

  let {gameTrees, gameIndex, treePosition} = sabaki.state
  let node = gameTrees[gameIndex].get(treePosition)
  let engineColor = currentProblem.toPlay === 'B' ? 'W' : 'B'

  if (node.data[engineColor] == null) return

  let raw = node.data[engineColor][0]
  let vertex = raw === '' ? null : sgf.parseVertex(raw)

  if (vertex != null && isInsideRegion(vertex, currentProblem.region)) {
    return // local answer — the fight goes on
  }

  // Tenuki or pass: judge the region without the stray move.
  settled = true
  judging = true

  let problem = currentProblem
  unassignSparringColors()
  await sabaki.removeNode(treePosition, {suppressConfirmation: true})

  let verdict
  try {
    verdict = await judgeRegion(currentBoard(), problem.region)
  } finally {
    judging = false
  }

  if (currentProblem !== problem) return // player moved on meanwhile

  let mine = problem.toPlay === 'B' ? verdict.black : verdict.white
  let theirs = problem.toPlay === 'B' ? verdict.white : verdict.black
  let opponentName = problem.toPlay === 'B' ? 'White' : 'Black'
  let success = goal === 'live' ? mine === 'alive' : theirs === 'dead'

  autoVerdict = success
    ? {
        result: 'solved',
        text:
          goal === 'live'
            ? 'KataGo gave up the attack — your group looks alive. Solved!'
            : `KataGo left the fight — ${opponentName.toLowerCase()} looks dead. Solved!`,
      }
    : {
        result: 'failed',
        text:
          goal === 'live'
            ? 'The fight is over, but your group still looks dead. Reset to retry, or mark Missed.'
            : `The fight is over, but ${opponentName.toLowerCase()} still looks alive. Reset to retry, or mark Missed.`,
      }

  publishState(loadProgress())

  if (success) {
    cancelAutoAdvance()
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null
      answer(true)
    }, AUTO_ADVANCE_DELAY)
  }
}

function attachMoveListener() {
  if (moveListener != null) return

  moveListener = () => {
    handleMoveMake().catch(() => {})
  }

  // Engine moves don't go through makeMove (generateMove appends the node
  // and only navigates), so 'moveMake' never fires for them — listen to
  // 'navigate' as well. handleMoveMake is idempotent and only reacts when
  // the current node is an engine-colored move.
  sabaki.events.on('moveMake', moveListener)
  sabaki.events.on('navigate', moveListener)
}

function detachMoveListener() {
  if (moveListener != null) {
    sabaki.events.removeListener('moveMake', moveListener)
    sabaki.events.removeListener('navigate', moveListener)
    moveListener = null
  }
}

async function loadProblemIntoBoard(problem, {firstLoad = false} = {}) {
  cancelAutoAdvance()
  settled = false
  autoVerdict = null

  await sabaki.loadContent(problemToSgf(problem), 'sgf', {
    suppressAskForSave: !firstLoad,
  })

  assignSparringColors()
  await inferGoal()
}

export function isActive() {
  return currentProblem != null
}

export async function startPractice() {
  let progress = loadProgress()
  let problem = pickProblem(getSharedStore(), {
    level: progress.level,
    solvedIds: loadSolvedIds(),
    rng,
  })

  if (problem == null) return

  sessionStats = {solved: 0, missed: 0}
  ensureSparringPartner()
  attachMoveListener()

  // Beginners don't need the raw GTP console (setting and UI state are
  // separate in Sabaki — set both).
  setting.set('view.show_leftsidebar', false)
  sabaki.setState({showLeftSidebar: false})

  currentProblem = problem
  await loadProblemIntoBoard(problem, {firstLoad: true})
  publishState(progress)
}

export async function answer(correct) {
  if (currentProblem == null) return

  cancelAutoAdvance()

  let progress = loadProgress()
  let next = applyResult(progress, correct)
  saveProgress(next)
  sessionStats[correct ? 'solved' : 'missed']++

  if (correct) {
    let solvedIds = loadSolvedIds()
    solvedIds.add(currentProblem.id)
    saveSolvedIds(solvedIds)
  }

  let problem = pickProblem(getSharedStore(), {
    level: next.level,
    solvedIds: loadSolvedIds(),
    rng,
  })

  currentProblem = problem
  if (problem != null) await loadProblemIntoBoard(problem)
  publishState(next, next.event)
}

export async function skipProblem() {
  if (currentProblem == null) return

  cancelAutoAdvance()

  let progress = loadProgress()
  let problem = pickProblem(getSharedStore(), {
    level: progress.level,
    solvedIds: new Set([...loadSolvedIds(), currentProblem.id]),
    rng,
  })

  if (problem != null) {
    currentProblem = problem
    await loadProblemIntoBoard(problem)
  }

  publishState(progress)
}

export async function retryProblem() {
  if (currentProblem == null) return

  await loadProblemIntoBoard(currentProblem)
  publishState(loadProgress())
}

export function setSparring(enabled) {
  setting.set('frank.tsumego_sparring', enabled)

  if (enabled) {
    ensureSparringPartner()
    assignSparringColors()
  } else {
    sparringSyncerId = null
    unassignSparringColors()
  }

  publishState(loadProgress())
}

export function stopPractice() {
  cancelAutoAdvance()
  detachMoveListener()
  currentProblem = null

  if (sparringSyncerId != null) {
    sabaki.detachEngines([sparringSyncerId])
    sparringSyncerId = null
  }

  sabaki.setState({
    frankTsumego: null,
    blackEngineSyncerId: null,
    whiteEngineSyncerId: null,
  })
}

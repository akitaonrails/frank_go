// frank_go: tsumego practice session (renderer only).
//
// Orchestrates the practice loop: pick a problem near the player's level,
// load it into Sabaki's board, let the player play it out, then grade with
// Solved/Missed. Progress (level, streak, solved ids) is persisted in
// settings so it survives restarts.
//
// If a KataGo engine is configured (npm run frank:katago), it is attached
// as a sparring partner: it answers the player's moves inside the problem,
// so the position fights back. "Check position" gives a heuristic life &
// death verdict (positionJudge.js). Bundled problems ship without solution
// trees (see data/SOURCES.md), so the final grade is the player's call.

import sabaki from '../modules/sabaki.js'
import {getSharedStore, problemToSgf, createRng} from './data/problemStore.js'
import {
  STREAK_TO_LEVEL_UP,
  applyResult,
  initialProgress,
  pickProblem,
} from './tsumegoProgress.js'
import {findKataGoEngine} from './katagoPlay.js'

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

const MAX_SOLVED_REMEMBERED = 20000

let rng = createRng()
let currentProblem = null
let sessionStats = {solved: 0, missed: 0}
let sparringSyncerId = null

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

async function loadProblemIntoBoard(problem, {firstLoad = false} = {}) {
  await sabaki.loadContent(problemToSgf(problem), 'sgf', {
    suppressAskForSave: !firstLoad,
  })

  assignSparringColors()
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
    sabaki.setState({blackEngineSyncerId: null, whiteEngineSyncerId: null})
  }

  publishState(loadProgress())
}

export function stopPractice() {
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

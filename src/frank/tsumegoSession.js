// frank_go: tsumego practice session (renderer only).
//
// Orchestrates the practice loop: pick a problem near the player's level,
// load it into Sabaki's board, let the player read/play it out, then
// self-grade with Solved/Missed. Progress (level, streak, solved ids) is
// persisted in settings so it survives restarts.
//
// Problems ship without solution trees (see data/SOURCES.md), so grading is
// honest self-assessment — like reading problems from a book, with the
// board available to play out lines.

import sabaki from '../modules/sabaki.js'
import {getSharedStore, problemToSgf, createRng} from './data/problemStore.js'
import {
  STREAK_TO_LEVEL_UP,
  applyResult,
  initialProgress,
  pickProblem,
} from './tsumegoProgress.js'

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

const MAX_SOLVED_REMEMBERED = 20000

let rng = createRng()
let currentProblem = null

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
            },
            progress,
            streakTarget: STREAK_TO_LEVEL_UP,
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

async function loadProblemIntoBoard(problem, {firstLoad = false} = {}) {
  await sabaki.loadContent(problemToSgf(problem), 'sgf', {
    suppressAskForSave: !firstLoad,
  })
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

  currentProblem = problem
  await loadProblemIntoBoard(problem, {firstLoad: true})
  publishState(progress)
}

export async function answer(correct) {
  if (currentProblem == null) return

  let progress = loadProgress()
  let next = applyResult(progress, correct)
  saveProgress(next)

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

export function stopPractice() {
  currentProblem = null
  sabaki.setState({frankTsumego: null})
}

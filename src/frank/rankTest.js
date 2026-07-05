// frank_go: rank test (renderer only).
//
// Ten problems of ascending difficulty, all from the tree-graded pack so
// grading is exact: solve it and move on, miss it and move on — no hints,
// no retries, no sparring. The number solved maps to an estimated rank on
// the same scale the practice ladder uses.

import sabaki from '../modules/sabaki.js'
import {getSharedStore, problemToSgf, createRng} from './data/problemStore.js'
import {createChecker} from './solutionChecker.js'
import {LEVEL_RANKS} from './tsumegoSession.js'
import {setting} from './env.js'
import sgf from '@sabaki/sgf'

export const TEST_PLAN = [2, 2, 3, 3, 4, 5, 6, 7, 8, 9]

let rng = createRng()
let test = null // {problems, index, correct, checker, phase, lastOutcome}
let listener = null

function pickTestProblems() {
  let store = getSharedStore()
  let chosen = []
  let used = new Set()

  for (let level of TEST_PLAN) {
    let pool = store
      .query({level})
      .filter((problem) => problem.hasSolutions && !used.has(problem.id))

    if (pool.length === 0) {
      pool = store
        .query({minLevel: level - 1, maxLevel: level + 1})
        .filter((problem) => problem.hasSolutions && !used.has(problem.id))
    }

    if (pool.length === 0) continue

    let problem = pool[Math.floor(rng() * pool.length)]
    used.add(problem.id)
    chosen.push(problem)
  }

  return chosen
}

function publish() {
  sabaki.setState({
    frankRankTest:
      test == null
        ? null
        : {
            index: test.index,
            total: test.problems.length,
            level:
              test.problems[Math.min(test.index, test.problems.length - 1)]
                .level,
            toPlay:
              test.problems[Math.min(test.index, test.problems.length - 1)]
                .toPlay,
            correct: test.correct,
            phase: test.phase,
            lastOutcome: test.lastOutcome,
            result: test.result || null,
          },
  })
}

async function loadCurrent() {
  let problem = test.problems[test.index]
  test.checker = createChecker(problem.sgf, problem.toPlay)

  await sabaki.loadContent(problemToSgf(problem), 'sgf', {
    suppressAskForSave: true,
  })

  // An exam shows no hints
  setting.set('view.show_comments', false)
  sabaki.setState({showCommentBox: false})
}

export function estimatedRank(correct) {
  let level = Math.min(10, Math.max(1, 1 + correct))
  return {level, rank: LEVEL_RANKS[level]}
}

async function finish() {
  test.phase = 'done'
  test.result = {
    correct: test.correct,
    total: test.problems.length,
    ...estimatedRank(test.correct),
  }

  setting.set(
    'frank.last_rank_test',
    JSON.stringify({date: new Date().toISOString(), ...test.result}),
  )

  publish()
}

async function advance(correct) {
  test.correct += correct ? 1 : 0
  test.lastOutcome = correct ? 'correct' : 'wrong'
  test.index++

  if (test.index >= test.problems.length) {
    await finish()
    return
  }

  await loadCurrent()
  publish()
}

async function handleMove() {
  if (test == null || test.phase !== 'question' || test.busy) return

  let {gameTrees, gameIndex, treePosition} = sabaki.state
  let node = gameTrees[gameIndex].get(treePosition)
  let problem = test.problems[test.index]
  let color = problem.toPlay

  if (node.data[color] == null || node.data[color][0] === '') return

  test.busy = true
  try {
    let outcome = test.checker.tryMove(node.data[color][0])

    if (outcome.result === 'correct') {
      await advance(true)
    } else if (outcome.result === 'wrong') {
      await advance(false)
    } else if (outcome.result === 'refuted') {
      await advance(false)
    } else if (outcome.reply != null) {
      let oppSign = color === 'B' ? -1 : 1
      sabaki.makeMove(sgf.parseVertex(outcome.reply), {player: oppSign})
    }
  } finally {
    test.busy = false
  }
}

// Give up on the current problem — counts as missed and moves on. The
// exam has no retries, but the player must always be able to continue.
export async function skipCurrent() {
  if (test == null || test.phase !== 'question' || test.busy) return

  test.busy = true
  try {
    await advance(false)
  } finally {
    test.busy = false
  }
}

export function isActive() {
  return test != null
}

export async function startTest() {
  let problems = pickTestProblems()
  if (problems.length < 5) return

  test = {
    problems,
    index: 0,
    correct: 0,
    phase: 'question',
    lastOutcome: null,
    result: null,
    busy: false,
  }

  if (listener == null) {
    listener = () => {
      handleMove().catch(() => {})
    }
    sabaki.events.on('moveMake', listener)
    sabaki.events.on('navigate', listener)
  }

  await loadCurrent()
  publish()
}

// After the result: jump straight into practice at the estimated level.
export async function practiceAtResult() {
  if (test == null || test.result == null) return

  setting.set('frank.tsumego_level', test.result.level)
  setting.set('frank.tsumego_streak', 0)
  stopTest()

  let {startPractice} = await import('./tsumegoSession.js')
  await startPractice()
}

export function stopTest() {
  test = null

  if (listener != null) {
    sabaki.events.removeListener('moveMake', listener)
    sabaki.events.removeListener('navigate', listener)
    listener = null
  }

  sabaki.setState({frankRankTest: null})
}

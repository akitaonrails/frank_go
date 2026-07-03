import assert from 'assert'
import {
  LEVEL_MAX,
  LEVEL_MIN,
  MISSES_TO_LEVEL_DOWN,
  STREAK_TO_LEVEL_UP,
  applyResult,
  initialProgress,
  pickProblem,
} from '../../src/frank/tsumegoProgress.js'
import {ProblemStore, createRng} from '../../src/frank/data/problemStore.js'

describe('initialProgress', () => {
  it('clamps the level into range', () => {
    assert.equal(initialProgress(0).level, LEVEL_MIN)
    assert.equal(initialProgress(99).level, LEVEL_MAX)
    assert.deepEqual(initialProgress(3), {level: 3, streak: 0, misses: 0})
  })
})

describe('applyResult', () => {
  it('increments the streak on success', () => {
    let next = applyResult({level: 2, streak: 1, misses: 1}, true)

    assert.deepEqual(next, {level: 2, streak: 2, misses: 0, event: null})
  })

  it('levels up after enough consecutive solves', () => {
    let progress = initialProgress(2)

    for (let i = 0; i < STREAK_TO_LEVEL_UP - 1; i++) {
      progress = applyResult(progress, true)
      assert.equal(progress.event, null)
    }

    progress = applyResult(progress, true)
    assert.equal(progress.event, 'level-up')
    assert.equal(progress.level, 3)
    assert.equal(progress.streak, 0)
  })

  it('does not level past the maximum', () => {
    let progress = initialProgress(LEVEL_MAX)

    for (let i = 0; i < STREAK_TO_LEVEL_UP * 2; i++) {
      progress = applyResult(progress, true)
      assert.equal(progress.level, LEVEL_MAX)
      assert.equal(progress.event, null)
    }
  })

  it('resets the streak and levels down after consecutive misses', () => {
    let progress = {level: 4, streak: 3, misses: 0}

    progress = applyResult(progress, false)
    assert.deepEqual(progress, {level: 4, streak: 0, misses: 1, event: null})

    for (let i = 1; i < MISSES_TO_LEVEL_DOWN; i++) {
      progress = applyResult(progress, false)
    }

    assert.equal(progress.event, 'level-down')
    assert.equal(progress.level, 3)
  })

  it('does not level below the minimum', () => {
    let progress = initialProgress(LEVEL_MIN)

    for (let i = 0; i < MISSES_TO_LEVEL_DOWN * 2; i++) {
      progress = applyResult(progress, false)
      assert.equal(progress.level, LEVEL_MIN)
    }
  })
})

describe('pickProblem', () => {
  let store = new ProblemStore({
    version: 1,
    collections: {},
    problems: [
      {id: 'a/1', collection: 'a', level: 1, category: 'x', toPlay: 'B'},
      {id: 'a/2', collection: 'a', level: 1, category: 'x', toPlay: 'B'},
      {id: 'a/3', collection: 'a', level: 2, category: 'x', toPlay: 'B'},
    ].map((p) => ({...p, n: 1, title: p.id, size: 19, AB: [], AW: []})),
  })

  it('prefers unsolved problems at the exact level', () => {
    let problem = pickProblem(store, {
      level: 1,
      solvedIds: new Set(['a/1']),
      rng: createRng(1),
    })

    assert.equal(problem.id, 'a/2')
  })

  it('widens to neighboring levels when the level is exhausted', () => {
    let problem = pickProblem(store, {
      level: 1,
      solvedIds: new Set(['a/1', 'a/2']),
      rng: createRng(1),
    })

    assert.equal(problem.id, 'a/3')
  })

  it('falls back to solved problems when everything is solved', () => {
    let problem = pickProblem(store, {
      level: 1,
      solvedIds: new Set(['a/1', 'a/2', 'a/3']),
      rng: createRng(1),
    })

    assert.ok(['a/1', 'a/2'].includes(problem.id))
  })

  it('returns null on an empty store', () => {
    let empty = new ProblemStore({version: 1, collections: {}, problems: []})

    assert.equal(
      pickProblem(empty, {level: 5, solvedIds: new Set(), rng: createRng(1)}),
      null,
    )
  })
})

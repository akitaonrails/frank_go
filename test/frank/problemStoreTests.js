import assert from 'assert'
import {
  ProblemStore,
  createRng,
  problemToSgf,
} from '../../src/frank/data/problemStore.js'

function makeIndex() {
  return {
    version: 1,
    collections: {
      easy: {id: 'easy', title: 'Easy Book', count: 2, levelRange: [1, 2]},
      hard: {id: 'hard', title: 'Hard Book', count: 2, levelRange: [8, 9]},
    },
    problems: [
      {
        id: 'easy/1',
        collection: 'easy',
        n: 1,
        title: 'problem 1',
        level: 1,
        category: 'life-and-death',
        toPlay: 'B',
        size: 19,
        AB: ['aa', 'ba'],
        AW: ['ab', 'bb'],
        region: [0, 0, 1, 1],
      },
      {
        id: 'easy/2',
        collection: 'easy',
        n: 2,
        title: 'problem 2',
        level: 2,
        category: 'living',
        toPlay: 'W',
        size: 19,
        AB: ['cc'],
        AW: ['dd'],
        region: [2, 2, 3, 3],
      },
      {
        id: 'hard/1',
        collection: 'hard',
        n: 1,
        title: 'problem 1',
        level: 8,
        category: 'killing',
        toPlay: 'B',
        size: 19,
        AB: ['qa'],
        AW: ['ra'],
        region: [16, 0, 17, 0],
      },
      {
        id: 'hard/2',
        collection: 'hard',
        n: 2,
        title: 'problem 2',
        level: 9,
        category: 'life-and-death',
        toPlay: 'B',
        size: 19,
        AB: [],
        AW: ['sa'],
        region: [18, 0, 18, 0],
      },
    ],
  }
}

describe('ProblemStore', () => {
  it('rejects invalid indexes', () => {
    assert.throws(() => new ProblemStore(null))
    assert.throws(() => new ProblemStore({}))
  })

  it('loads the real bundled index', () => {
    let store = ProblemStore.fromFile()

    assert.ok(store.size > 4000)
    assert.ok(store.collections['cho-elementary'])
    assert.ok(store.getById('cho-elementary/1'))
  })

  it('queries by exact level and by range', () => {
    let store = new ProblemStore(makeIndex())

    assert.deepEqual(
      store.query({level: 1}).map((p) => p.id),
      ['easy/1'],
    )
    assert.deepEqual(
      store.query({minLevel: 2, maxLevel: 8}).map((p) => p.id),
      ['easy/2', 'hard/1'],
    )
  })

  it('queries by collection, category and color to play', () => {
    let store = new ProblemStore(makeIndex())

    assert.equal(store.query({collection: 'hard'}).length, 2)
    assert.deepEqual(
      store.query({category: 'life-and-death'}).map((p) => p.id),
      ['easy/1', 'hard/2'],
    )
    assert.deepEqual(
      store.query({toPlay: 'W'}).map((p) => p.id),
      ['easy/2'],
    )
  })

  it('applies limit and deterministic shuffle', () => {
    let store = new ProblemStore(makeIndex())

    assert.equal(store.query({limit: 2}).length, 2)

    let first = store.query({shuffleSeed: 42}).map((p) => p.id)
    let second = store.query({shuffleSeed: 42}).map((p) => p.id)
    assert.deepEqual(first, second)
    assert.equal(first.length, 4)
  })

  it('picks random problems honoring the filter', () => {
    let store = new ProblemStore(makeIndex())
    let rng = createRng(7)

    for (let i = 0; i < 10; i++) {
      let problem = store.randomProblem({collection: 'easy'}, rng)
      assert.equal(problem.collection, 'easy')
    }

    assert.equal(store.randomProblem({level: 5}), null)
  })

  it('reports categories and stats', () => {
    let store = new ProblemStore(makeIndex())

    assert.deepEqual(store.categories().sort(), [
      'killing',
      'life-and-death',
      'living',
    ])
    assert.deepEqual(store.stats(), {
      total: 4,
      byLevel: {1: 1, 2: 1, 8: 1, 9: 1},
    })
  })
})

describe('problemToSgf', () => {
  it('renders a standalone SGF with setup stones', () => {
    let store = new ProblemStore(makeIndex())
    let sgf = problemToSgf(store.getById('easy/1'))

    assert.ok(sgf.startsWith('(;GM[1]FF[4]'))
    assert.ok(sgf.includes('SZ[19]'))
    assert.ok(sgf.includes('PL[B]'))
    assert.ok(sgf.includes('AB[aa][ba]'))
    assert.ok(sgf.includes('AW[ab][bb]'))
    assert.ok(sgf.includes('Black to play'))
  })

  it('omits empty setup lists', () => {
    let store = new ProblemStore(makeIndex())
    let sgf = problemToSgf(store.getById('hard/2'))

    assert.ok(!sgf.includes('AB['))
    assert.ok(sgf.includes('AW[sa]'))
  })
})

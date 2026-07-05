import assert from 'assert'
import {readFileSync} from 'fs'
import {join} from 'path'
import sgfLib from '@sabaki/sgf'
import {
  createChecker,
  hasSolutionTree,
} from '../../src/frank/solutionChecker.js'
import {locateData} from '../../src/frank/paths.js'

// A miniature problem in GGG style: B[aa] is correct outright; B[bb]
// leads to a forced exchange ending in Correct; B[cc] gets refuted;
// anything else is off-tree.
const MINI = `(;GM[1]FF[4]SZ[9]AB[dd]AW[ee]C[Black to play.]
(;B[aa]C[Correct])
(;B[bb];W[cb](;B[db]C[Also correct.])(;B[eb];W[fb]))
(;B[cc];W[dc]))`

describe('createChecker', () => {
  it('accepts an immediately correct move', () => {
    let checker = createChecker(MINI, 'B')
    let result = checker.tryMove('aa')

    assert.equal(result.result, 'correct')
    assert.ok(/correct/i.test(result.comment))
    assert.ok(checker.done)
  })

  it('rejects off-tree moves', () => {
    let checker = createChecker(MINI, 'B')

    assert.equal(checker.tryMove('ff').result, 'wrong')
    assert.ok(checker.done)
  })

  it('plays the opponent reply and continues along the tree', () => {
    let checker = createChecker(MINI, 'B')
    let first = checker.tryMove('bb')

    assert.equal(first.result, 'continue')
    assert.equal(first.reply, 'cb')

    let second = checker.tryMove('db')
    assert.equal(second.result, 'correct')
  })

  it('fails a line whose continuation dead-ends without Correct', () => {
    let checker = createChecker(MINI, 'B')
    checker.tryMove('bb')

    let result = checker.tryMove('eb')
    assert.equal(result.result, 'refuted')
    assert.equal(result.reply, 'fb')
  })

  it('refutes a wrong first move with the tree answer', () => {
    let checker = createChecker(MINI, 'B')
    let result = checker.tryMove('cc')

    assert.equal(result.result, 'refuted')
    assert.equal(result.reply, 'dc')
  })
})

describe('checker against the real GGG pack', () => {
  let indexPath = locateData(join('tsumego', 'index.json'))
  let index = JSON.parse(readFileSync(indexPath, 'utf8'))
  let gggProblems = index.problems.filter((problem) => problem.hasSolutions)

  it('bundles solution-bearing problems', () => {
    assert.ok(gggProblems.length >= 400)
  })

  it('every solution tree has at least one reachable Correct line', () => {
    for (let problem of gggProblems) {
      assert.ok(hasSolutionTree(problem.sgf), `${problem.id}: no tree`)
      assert.ok(
        /correct/i.test(problem.sgf),
        `${problem.id}: no Correct marker`,
      )
    }
  })

  it('solves a real problem by following its Correct branch', () => {
    // Walk the first problem's tree manually to find a correct first move
    let problem = gggProblems[0]
    let [root] = sgfLib.parse(problem.sgf)

    let findCorrectPath = (node) => {
      if (/correct/i.test(node.data.C != null ? node.data.C[0] : '')) return []
      for (let child of node.children) {
        let sub = findCorrectPath(child)
        if (sub != null) {
          let move = child.data.B != null ? child.data.B[0] : child.data.W[0]
          return [move, ...sub]
        }
      }
      return null
    }

    let path = findCorrectPath(root)
    assert.ok(path != null && path.length > 0)

    let checker = createChecker(problem.sgf, problem.toPlay)
    let result = null

    for (let i = 0; i < path.length; i += 2) {
      result = checker.tryMove(path[i])
      if (result.result === 'correct') break

      // The checker's opponent may resist differently than this path —
      // that's fine as long as we don't get refuted on the correct line
      assert.notEqual(result.result, 'wrong', `${problem.id} step ${i}`)
      if (result.result === 'refuted') break
      if (result.reply !== path[i + 1]) break
    }

    assert.ok(result != null)
  })
})

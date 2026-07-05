// frank_go: exact grading against an SGF solution tree (pure, testable).
//
// Problems from the GoGameGuru pack carry full variation trees where the
// solution lines are marked with comments containing "Correct" and wrong
// lines end in refutations. The checker walks that tree as the player
// moves:
//
//   tryMove(vertex) →
//     {result: 'correct', comment}                  the move solves it
//     {result: 'continue', reply, replyComment}     in-tree; opponent answers
//     {result: 'refuted', reply, replyComment}      opponent's answer ends the line — failed
//     {result: 'wrong', comment}                    off-tree or dead-end move
//
// The opponent always picks its most resistant reply: one whose subtree
// contains no "Correct" if available (i.e. the refutation), otherwise the
// first branch.

import sgf from '@sabaki/sgf'

const CORRECT_PATTERN = /correct/i

function nodeComment(node) {
  return node.data.C != null ? node.data.C[0] : null
}

function isCorrectNode(node) {
  let comment = nodeComment(node)
  return comment != null && CORRECT_PATTERN.test(comment)
}

function subtreeHasCorrect(node) {
  if (isCorrectNode(node)) return true
  return node.children.some(subtreeHasCorrect)
}

function moveOf(node, color) {
  return node.data[color] != null ? node.data[color][0] : null
}

export function createChecker(sgfText, toPlay = 'B') {
  let [root] = sgf.parse(sgfText)
  if (root == null) return null

  let playerColor = toPlay
  let opponentColor = playerColor === 'B' ? 'W' : 'B'
  let current = root

  return {
    get playerColor() {
      return playerColor
    },

    get done() {
      return current == null
    },

    // vertex: SGF coordinate string like 'pq'
    tryMove(coord) {
      if (current == null) return {result: 'wrong', comment: null}

      let child = current.children.find(
        (node) => moveOf(node, playerColor) === coord,
      )

      if (child == null) {
        current = null
        return {result: 'wrong', comment: null}
      }

      if (isCorrectNode(child)) {
        current = null
        return {result: 'correct', comment: nodeComment(child)}
      }

      if (child.children.length === 0) {
        // In-tree but a dead end without "Correct" — a wrong line
        current = null
        return {result: 'wrong', comment: nodeComment(child)}
      }

      // Opponent resists: prefer the reply whose subtree has no Correct
      let replies = child.children.filter(
        (node) => moveOf(node, opponentColor) != null,
      )

      if (replies.length === 0) {
        // Tree continues with another player move (rare); treat the line
        // as still alive and wait for the next player move
        current = child
        return {result: 'continue', reply: null, replyComment: null}
      }

      let reply = replies.find((node) => !subtreeHasCorrect(node)) || replies[0]
      let replyComment = nodeComment(reply)

      if (reply.children.length === 0 && !isCorrectNode(reply)) {
        // The opponent's answer ends the line — the player's move failed
        current = null
        return {
          result: 'refuted',
          reply: moveOf(reply, opponentColor),
          replyComment,
        }
      }

      current = reply
      return {
        result: 'continue',
        reply: moveOf(reply, opponentColor),
        replyComment,
      }
    },
  }
}

// True when an SGF has a variation tree worth checking against.
export function hasSolutionTree(sgfText) {
  try {
    let [root] = sgf.parse(sgfText)
    return root != null && root.children.length > 0
  } catch (err) {
    return false
  }
}

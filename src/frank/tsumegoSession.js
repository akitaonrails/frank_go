// frank_go: tsumego practice session (renderer only).
//
// Orchestrates the practice loop: pick a problem near the player's level,
// load it into Sabaki's board, let the player play it out — and grade
// automatically whenever a sparring engine is available.
//
// With KataGo attached (npm run frank:katago) the flow is fully automatic:
// the engine answers inside the problem; when it leaves the area or passes
// the region is judged against the problem's inferred goal — success shows
// a banner and advances, failure records a miss and offers Retry/Next in a
// dialog. For kill problems the session also notices early when all the
// stones the player threw in have died. Without an engine, the player
// self-grades with Solved/Missed buttons (the panel adapts).
//
// The verdicts come from a Monte-Carlo heuristic (positionJudge.js);
// bundled problems ship without solution trees (see data/SOURCES.md).

import sabaki from '../modules/sabaki.js'
import sgf from '@sabaki/sgf'
import * as gametree from '../modules/gametree.js'
import * as dialog from '../modules/dialog.js'
import i18n from '../i18n.js'
import {
  getSharedStore,
  problemToSgf,
  createRng,
  buildGGGSequence,
  nextUnsolvedIndex,
  firstUnsolvedIndex,
} from './data/problemStore.js'
import {
  STREAK_TO_LEVEL_UP,
  applyResult,
  initialProgress,
  pickProblem,
} from './tsumegoProgress.js'
import {FOCUS_CATEGORIES} from './tsumegoProgress.js'
import {findKataGoEngine} from './katagoPlay.js'
import {judgeRegion, guessDeadSet} from './positionJudge.js'
import {createChecker} from './solutionChecker.js'
import {
  setting,
  currentBoard as envCurrentBoard,
  hideGtpConsole,
} from './env.js'

const t = i18n.context('frank.tsumego')

const MAX_SOLVED_REMEMBERED = 20000

// An engine move farther than this (Chebyshev) outside the problem's
// bounding box counts as tenuki — the engine has left the local fight.
const TENUKI_MARGIN = 3

const AUTO_ADVANCE_DELAY = 2600

let rng = createRng()
let currentProblem = null
let sessionStats = {solved: 0, missed: 0}
let sparringSyncerId = null

// 'level': the usual level/streak practice, random draw. 'sequential':
// study mode — walks every GoGameGuru problem in order, no level/streak,
// because those come with a real, comment-backed solution tree.
let mode = 'level'
let cachedGGGSequence = null

// Per-problem auto-grading state
let goal = null // 'kill' | 'live'
let settled = false
let judging = false
let autoVerdict = null // {result: 'solved'|'failed', text}
let autoAdvanceTimer = null
let moveListener = null
let attemptMoves = [] // vertices the player has placed this attempt
let checker = null // solution-tree checker when the problem has one

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

// Static bundled data — build the 420-problem walk order once.
function gggSequence() {
  if (cachedGGGSequence == null) {
    cachedGGGSequence = buildGGGSequence(getSharedStore())
  }
  return cachedGGGSequence
}

// How many of the 420 GGG problems have ever been solved (persisted
// alongside the level-mode's own solved set — the cursor only tracks
// *position*, this is the actual progress count).
function countGGGSolved() {
  let solvedIds = loadSolvedIds()
  return gggSequence().filter((problem) => solvedIds.has(problem.id)).length
}

// Always returns a valid index into the sequence, even if the stored
// cursor is stale (e.g. the bundled GGG count changed between versions)
// or missing — so the position display and problem lookup never disagree.
function loadGGGCursor() {
  let raw = Math.max(0, setting.get('frank.tsumego_ggg_cursor') || 0)
  let length = gggSequence().length
  return length === 0 ? 0 : raw % length
}

function saveGGGCursor(cursor) {
  setting.set('frank.tsumego_ggg_cursor', cursor)
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
            focus: currentFocus(),
            grading:
              checker != null
                ? 'exact'
                : sparringSyncerId != null
                  ? 'engine'
                  : 'manual',
            credit:
              getSharedStore().collections[currentProblem.collection] != null
                ? getSharedStore().collections[currentProblem.collection].credit
                : null,
            autoVerdict,
            lastEvent,
            mode,
            sequencePosition:
              mode === 'sequential'
                ? {
                    current: loadGGGCursor() + 1,
                    total: gggSequence().length,
                    solved: countGGGSolved(),
                  }
                : null,
          },
  })
}

function currentFocus() {
  let focus = setting.get('frank.tsumego_focus')
  return FOCUS_CATEGORIES[focus] !== undefined ? focus : 'all'
}

// Switches the study focus and moves to a matching problem (no grading).
export async function setFocus(focus) {
  setting.set('frank.tsumego_focus', focus)
  if (currentProblem == null) return

  cancelAutoAdvance()
  await advanceToNextProblem()
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
  return envCurrentBoard(sabaki)
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

function opponentName() {
  return currentProblem.toPlay === 'B' ? t('White') : t('Black')
}

function successText() {
  // A solution-tree win isn't the engine giving up on anything — it's a
  // verified correct line (its own comment already explains the "why").
  // The KataGo-flavored phrasing below only fits the sparring path.
  if (checker != null) return t('Solved!')

  return goal === 'live'
    ? t('KataGo gave up the attack — your group lives. Solved!')
    : t('KataGo left the fight — {{opponent}} is dead. Solved!').replace(
        '{{opponent}}',
        opponentName().toLowerCase(),
      )
}

function failureText(early = false) {
  if (early) return t('Your stones died — that line does not work.')

  return goal === 'live'
    ? t('The fight is over, but your group is still dead.')
    : t('The fight is over, but {{opponent}} still lives.').replace(
        '{{opponent}}',
        opponentName().toLowerCase(),
      )
}

function scheduleAutoSolve() {
  autoVerdict = {result: 'solved', text: successText()}
  publishState(loadProgress())

  cancelAutoAdvance()

  // Sequential study mode is about reading the comment (often what makes
  // the move correct in the first place) — auto-advancing after a couple
  // seconds cuts that off. Wait for an explicit "Next problem" instead.
  if (mode === 'sequential') return

  autoAdvanceTimer = setTimeout(() => {
    autoAdvanceTimer = null
    answer(true)
  }, AUTO_ADVANCE_DELAY)
}

// Records the miss once, shows the verdict, and lets the player choose
// between retrying the same problem (no double penalty) or moving on.
async function failAndPrompt(text) {
  let progress = loadProgress()
  let next = applyResult(progress, false)
  saveProgress(next)
  flashLevelEvent(next)
  sessionStats.missed++

  autoVerdict = {result: 'failed', text}
  publishState(next, next.event)

  let choice = await dialog.showMessageBox(
    `${text}\n\n${t('Do you want to try this problem again?')}`,
    'info',
    [t('Retry'), t('Next problem')],
    0,
  )

  if (currentProblem == null) return

  if (choice === 0) {
    await retryProblem()
  } else if (mode === 'sequential') {
    await advanceSequential()
  } else {
    await advanceToNextProblem()
  }
}

// Advances without grading (the miss/solve has already been recorded).
// Sequential mode's equivalent of advanceToNextProblem: moves forward in
// the 420-long GGG walk order (still strict numeric order, still wraps),
// skipping anything already solved — so repeat sessions naturally land
// only on what's left, without a separate "review" mode.
async function advanceSequential() {
  let sequence = gggSequence()
  if (sequence.length === 0) return

  let cursor = nextUnsolvedIndex(sequence, loadGGGCursor(), loadSolvedIds())
  saveGGGCursor(cursor)

  currentProblem = sequence[cursor]
  await loadProblemIntoBoard(currentProblem)
  publishState(loadProgress())
}

async function advanceToNextProblem() {
  let progress = loadProgress()
  let problem = pickProblem(getSharedStore(), {
    level: progress.level,
    focus: currentFocus(),
    solvedIds: new Set([
      ...loadSolvedIds(),
      ...(currentProblem ? [currentProblem.id] : []),
    ]),
    rng,
  })

  if (problem != null) {
    currentProblem = problem
    await loadProblemIntoBoard(problem)
  }

  publishState(progress)
}

async function settleAndJudge(strayTreePosition = null) {
  settled = true
  judging = true

  let problem = currentProblem
  unassignSparringColors()

  if (strayTreePosition != null) {
    await sabaki.removeNode(strayTreePosition, {suppressConfirmation: true})
  }

  let verdict
  try {
    verdict = await judgeRegion(currentBoard(), problem.region)
  } finally {
    judging = false
  }

  if (currentProblem !== problem) return

  let mine = problem.toPlay === 'B' ? verdict.black : verdict.white
  let theirs = problem.toPlay === 'B' ? verdict.white : verdict.black
  let success = goal === 'live' ? mine === 'alive' : theirs === 'dead'

  if (success) {
    scheduleAutoSolve()
  } else {
    await failAndPrompt(failureText())
  }
}

// For kill problems: if the player has committed stones and every one of
// them now looks dead while the fight is still on, the attempt has failed.
async function checkAttemptStonesDead() {
  if (goal !== 'kill' || attemptMoves.length < 2) return false

  let deadSet = await guessDeadSet(currentBoard())
  let board = currentBoard()

  let allGone = attemptMoves.every(([x, y]) => {
    let sign = board.get([x, y])
    let mySign = currentProblem.toPlay === 'B' ? 1 : -1

    return sign !== mySign || deadSet.has(`${x},${y}`)
  })

  return allGone
}

// Applies the player's move to the solution tree: answers with the
// tree's reply, celebrates Correct lines, fails refuted ones.
async function handleTreeMove(node) {
  let myColor = currentProblem.toPlay
  if (node.data[myColor] == null || node.data[myColor][0] === '') return

  let outcome = checker.tryMove(node.data[myColor][0])

  if (outcome.result === 'correct') {
    settled = true
    if (outcome.comment != null) {
      sabaki.setComment(sabaki.state.treePosition, {comment: outcome.comment})
    }
    scheduleAutoSolve()
    return
  }

  if (outcome.result === 'wrong') {
    settled = true
    await failAndPrompt(
      outcome.comment != null
        ? outcome.comment
        : t('That is not the right move here.'),
    )
    return
  }

  // continue / refuted: play the tree's reply on the board
  if (outcome.reply != null) {
    judging = true
    try {
      let oppSign = myColor === 'B' ? -1 : 1
      let vertex = sgf.parseVertex(outcome.reply)
      sabaki.makeMove(vertex, {player: oppSign})

      if (outcome.replyComment != null) {
        sabaki.setComment(sabaki.state.treePosition, {
          comment: outcome.replyComment,
        })
      }
    } finally {
      judging = false
    }
  }

  if (outcome.result === 'refuted') {
    settled = true
    await failAndPrompt(
      outcome.replyComment != null
        ? outcome.replyComment
        : t('That line does not work.'),
    )
  }
}

// Called on every move/navigation; drives the automatic grading.
async function handleMoveMake() {
  if (currentProblem == null || settled || judging) {
    return
  }

  let {gameTrees, gameIndex, treePosition} = sabaki.state
  let node = gameTrees[gameIndex].get(treePosition)

  if (checker != null) {
    await handleTreeMove(node)
    return
  }

  if (sparringSyncerId == null) return

  let myColor = currentProblem.toPlay
  let engineColor = myColor === 'B' ? 'W' : 'B'

  // Track the player's own stones for the early-failure check.
  if (node.data[myColor] != null && node.data[myColor][0] !== '') {
    let vertex = sgf.parseVertex(node.data[myColor][0])

    if (!attemptMoves.some(([x, y]) => x === vertex[0] && y === vertex[1])) {
      attemptMoves.push(vertex)
    }

    return
  }

  if (node.data[engineColor] == null) return

  let raw = node.data[engineColor][0]
  let vertex = raw === '' ? null : sgf.parseVertex(raw)

  if (vertex != null && isInsideRegion(vertex, currentProblem.region)) {
    // Local answer — check whether the player's attempt has already died.
    judging = true

    let failedEarly
    try {
      failedEarly = await checkAttemptStonesDead()
    } finally {
      judging = false
    }

    if (failedEarly && !settled && currentProblem != null) {
      settled = true
      unassignSparringColors()
      await failAndPrompt(failureText(true))
    }

    return
  }

  // Tenuki or pass: the local fight is settled — judge it.
  await settleAndJudge(vertex != null || raw === '' ? treePosition : null)
}

function attachMoveListener() {
  if (moveListener != null) return

  moveListener = () => {
    handleMoveMake().catch(() => {})
  }

  // Engine moves don't go through makeMove (generateMove appends the node
  // and only navigates), so 'moveMake' never fires for them — listen to
  // 'navigate' as well. handleMoveMake is idempotent and only reacts to
  // move nodes.
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
  attemptMoves = []

  // Problems with a solution tree are graded exactly against it — the
  // tree plays the opponent, so no engine sparring is needed. The board
  // itself only gets the setup position (never the solution).
  checker =
    problem.hasSolutions && problem.sgf != null
      ? createChecker(problem.sgf, problem.toPlay)
      : null

  await sabaki.loadContent(problemToSgf(problem), 'sgf', {
    suppressAskForSave: !firstLoad,
  })

  if (checker != null) {
    unassignSparringColors()
    // Commented problems teach — show the commentary as it appears
    setting.set('view.show_comments', true)
    sabaki.setState({showCommentBox: true})
  } else {
    assignSparringColors()
    await inferGoal()
  }
}

export function isActive() {
  return currentProblem != null
}

// Starting practice cancels any other frank activity (drills, rank test)
async function stopOtherActivities() {
  let rank = await import('./rankTest.js')
  rank.stopTest()
  sabaki.setState({frankScoreDrill: null, frankLadderDrill: null})
}

export async function startPractice() {
  await stopOtherActivities()

  let progress = loadProgress()
  let problem = pickProblem(getSharedStore(), {
    level: progress.level,
    focus: currentFocus(),
    solvedIds: loadSolvedIds(),
    rng,
  })

  if (problem == null) return

  sessionStats = {solved: 0, missed: 0}
  mode = 'level'
  ensureSparringPartner()
  attachMoveListener()

  hideGtpConsole(sabaki)

  currentProblem = problem
  await loadProblemIntoBoard(problem, {firstLoad: true})
  publishState(progress)
}

// Study mode: walks every GoGameGuru problem in order (easy → intermediate
// → hard), a real comment-backed solution tree instead of a heuristic
// guess — no level, no streak, just working through all 420 at your pace.
export async function startSolvedStudy() {
  await stopOtherActivities()

  let sequence = gggSequence()
  if (sequence.length === 0) return

  // Reopening from the menu always resumes at the first problem you still
  // haven't solved — so an accidental skip is recovered just by going back
  // and reopening, instead of having to walk all the way around. The
  // cursor still advances normally with "Next" once you're in.
  let cursor = firstUnsolvedIndex(sequence, loadSolvedIds())
  saveGGGCursor(cursor)

  let problem = sequence[cursor]

  sessionStats = {solved: 0, missed: 0}
  mode = 'sequential'
  ensureSparringPartner()
  attachMoveListener()

  hideGtpConsole(sabaki)

  currentProblem = problem
  await loadProblemIntoBoard(problem, {firstLoad: true})
  publishState(loadProgress())
}

// Manual grading — used by the auto-solve timer, the "Next" button on a
// success banner, and the self-grade buttons when no engine is attached.
// Big moments deserve more than a badge
function flashLevelEvent(next) {
  if (next.event === 'level-up') {
    sabaki.flashInfoOverlay(
      `🎉 ${t('Level up!')} ${t('Now level')} ${next.level} (${LEVEL_RANKS[next.level]})`,
    )
  } else if (next.event === 'level-down') {
    sabaki.flashInfoOverlay(
      `${t('Back to level')} ${next.level} (${LEVEL_RANKS[next.level]}) — ${t('no worries, it happens!')}`,
    )
  }
}

export async function answer(correct) {
  if (currentProblem == null) return

  cancelAutoAdvance()
  sessionStats[correct ? 'solved' : 'missed']++

  // Detect the moment a *newly* solved problem completes the whole GGG
  // set — only true on the transition to 420/420, not on later reviews.
  let justCompletedAll = false

  if (correct) {
    let solvedIds = loadSolvedIds()
    let wasAlreadySolved = solvedIds.has(currentProblem.id)
    solvedIds.add(currentProblem.id)
    saveSolvedIds(solvedIds)

    justCompletedAll =
      mode === 'sequential' &&
      !wasAlreadySolved &&
      countGGGSolved() === gggSequence().length
  }

  if (mode === 'sequential') {
    await advanceSequential()

    if (justCompletedAll) {
      await dialog.showMessageBox(
        t(
          '🎉 Congratulations! You’ve worked through all 420 GoGameGuru problems. From here it’s free review — every problem is still here to revisit.',
        ),
        'info',
        [t('Nice!')],
      )
    }

    return
  }

  let progress = loadProgress()
  let next = applyResult(progress, correct)
  saveProgress(next)
  flashLevelEvent(next)

  let problem = pickProblem(getSharedStore(), {
    level: next.level,
    focus: currentFocus(),
    solvedIds: loadSolvedIds(),
    rng,
  })

  currentProblem = problem
  if (problem != null) await loadProblemIntoBoard(problem)
  publishState(next, next.event)
}

// Skips the auto-advance delay after an automatic solve.
export async function continueAfterSolve() {
  if (autoVerdict == null || autoVerdict.result !== 'solved') return

  answer(true)
}

// Human-friendly rank labels for the 1-10 difficulty scale.
export const LEVEL_RANKS = {
  1: '~18 kyu',
  2: '~13 kyu',
  3: '~10 kyu',
  4: '~8 kyu',
  5: '~5 kyu',
  6: '~3 kyu',
  7: '~1 dan',
  8: '~2 dan',
  9: '~4 dan',
  10: '~6 dan+',
}

// Lets the player choose their own difficulty; loads a fresh problem at
// the new level without grading the current one.
export async function setLevel(level) {
  if (currentProblem == null || mode === 'sequential') return

  level = Math.min(10, Math.max(1, Math.round(level)))
  cancelAutoAdvance()
  setting.set('frank.tsumego_level', level)
  setting.set('frank.tsumego_streak', 0)

  await advanceToNextProblem()
}

export async function skipProblem() {
  if (currentProblem == null) return

  cancelAutoAdvance()

  if (mode === 'sequential') {
    await advanceSequential()
    return
  }

  await advanceToNextProblem()
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
  mode = 'level'

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

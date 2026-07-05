// frank_go: ladder drill session (renderer only) — UI orchestration over
// the pure generator in ladderDrill.js.

import sabaki from '../modules/sabaki.js'
import {createRng} from './data/problemStore.js'
import {generateLadder, ladderToSgf} from './ladderDrill.js'

let rng = createRng()
let drill = null // {ladder, phase}
let stats = {correct: 0, wrong: 0, streak: 0}

function publish() {
  sabaki.setState({
    frankLadderDrill:
      drill == null
        ? null
        : {
            phase: drill.phase,
            reveal: drill.reveal || null,
            stats: {...stats},
          },
  })
}

async function loadNext() {
  drill = {ladder: generateLadder(rng), phase: 'question', reveal: null}

  await sabaki.loadContent(ladderToSgf(drill.ladder), 'sgf', {
    suppressAskForSave: true,
  })
}

export function isActive() {
  return drill != null
}

export async function startDrill() {
  stats = {correct: 0, wrong: 0, streak: 0}
  await loadNext()
  publish()
}

export async function nextLadder() {
  if (drill == null) return

  await loadNext()
  publish()
}

// guess: true = "the ladder works" (White gets captured)
export function answer(guess) {
  if (drill == null || drill.phase !== 'question') return

  let correct = guess === drill.ladder.works
  stats[correct ? 'correct' : 'wrong']++
  stats.streak = correct ? stats.streak + 1 : 0

  drill.phase = 'reveal'
  drill.reveal = {correct, works: drill.ladder.works}
  publish()
}

// Replays the full running sequence and jumps to its end so the outcome
// is visible; the player can step back through it with the arrows.
export async function watchItRun() {
  if (drill == null || drill.phase !== 'reveal') return

  await sabaki.loadContent(
    ladderToSgf(drill.ladder, {withSequence: true}),
    'sgf',
    {
      suppressAskForSave: true,
    },
  )
  sabaki.goToEnd()
}

export function stopDrill() {
  drill = null
  sabaki.setState({frankLadderDrill: null})
  sabaki.newFile({suppressAskForSave: true})
}

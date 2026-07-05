// frank_go: friction-free "play vs KataGo" (renderer only).
//
// Finds a KataGo engine registered in the settings (see
// scripts/frank/setup-katago.mjs), starts a fresh game, attaches the engine
// on the requested color and lets Sabaki's regular engine flow answer the
// player's moves. Game state is published as `frankKatagoGame` so the
// practice sidebar can offer beginner-friendly controls (score estimate,
// undo, pass, restart, stop).

import {join} from 'path'
import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'
import i18n from '../i18n.js'
import * as dialog from '../modules/dialog.js'
import {mergeEngines, runSetup} from './katagoSetup.js'
import {
  setting,
  currentBoard as envCurrentBoard,
  hideGtpConsole,
} from './env.js'

const t = i18n.context('frank.katago')

let game = null // {playerSign, engineName, syncerId}

// All configured KataGo variants (setup-katago.mjs registers Beginner /
// Full / Human rank engines).
export function listKataGoEngines(engines = setting.get('engines.list') || []) {
  return engines.filter((engine) => /katago/i.test(engine.name))
}

// Prefers the player's chosen opponent (frank.katago_engine), then the
// beginner-friendly engine, then any KataGo.
export function findKataGoEngine(engines = setting.get('engines.list') || []) {
  let preferred = setting.get('frank.katago_engine')

  return (
    (preferred && engines.find((engine) => engine.name === preferred)) ||
    engines.find((engine) => /katago.*beginner/i.test(engine.name)) ||
    engines.find((engine) => /katago.*human/i.test(engine.name)) ||
    engines.find((engine) => /katago/i.test(engine.name)) ||
    null
  )
}

export function setPreferredEngine(name) {
  setting.set('frank.katago_engine', name)
}

export function hasHumanRanks(engines = setting.get('engines.list') || []) {
  return engines.some((engine) => /katago.*human/i.test(engine.name))
}

// In-app one-click setup. Downloads into Electron's userData directory
// (works for packaged/AUR installs); when the katago binary is already on
// PATH — e.g. installed as an AUR dependency — only the small network is
// fetched. Registers the engines in the live settings.
export async function setupKataGo({human = false, onProgress = () => {}} = {}) {
  let dir = join(window.sabaki.setting.userDataDirectory, 'frank-katago')

  try {
    let engines = await runSetup({dir, human, onProgress})
    let {list} = mergeEngines(setting.get('engines.list'), engines)
    setting.set('engines.list', list)
    return true
  } catch (err) {
    await dialog.showMessageBox(
      t('KataGo setup failed:') + '\n\n' + err.message,
      'warning',
    )
    return false
  }
}

function publishState() {
  sabaki.setState({
    frankKatagoGame:
      game == null
        ? null
        : {playerSign: game.playerSign, engineName: game.engineName},
  })
}

function assignColors() {
  sabaki.setState({
    blackEngineSyncerId: game.playerSign > 0 ? null : game.syncerId,
    whiteEngineSyncerId: game.playerSign > 0 ? game.syncerId : null,
  })
}

export function isActive() {
  return game != null
}

// playerSign: 1 = the human plays Black, -1 = the human plays White.
export async function playAgainstKataGo(playerSign = 1) {
  let engine = findKataGoEngine()

  if (engine == null) {
    await dialog.showMessageBox(
      t(
        [
          'No KataGo engine is configured yet.',
          '',
          'Use the "Set up KataGo" button in the practice panel first —',
          'one click, one small download.',
        ].join('\n'),
      ),
      'info',
    )

    return
  }

  // Cancel any running frank activity first
  let rank = await import('./rankTest.js')
  rank.stopTest()
  sabaki.setState({frankScoreDrill: null, frankLadderDrill: null})

  await sabaki.newFile({playSound: false, showInfo: false})

  let [syncer] = sabaki.attachEngines([engine])
  if (syncer == null) return

  game = {playerSign, engineName: engine.name, syncerId: syncer.id}

  hideGtpConsole(sabaki)

  assignColors()
  publishState()

  // If the engine plays Black it should open the game.
  if (playerSign < 0) {
    sabaki.generateMove(game.syncerId, sabaki.state.treePosition)
  }
}

export async function restartGame() {
  if (game == null) return

  await sabaki.newFile({
    playSound: false,
    showInfo: false,
    suppressAskForSave: true,
  })

  assignColors()
  publishState()

  if (game.playerSign < 0) {
    sabaki.generateMove(game.syncerId, sabaki.state.treePosition)
  }
}

// Takes back the player's last move (and the engine's answer to it).
export function undoMove() {
  if (game == null) return

  let {gameTrees, gameIndex, treePosition} = sabaki.state
  let tree = gameTrees[gameIndex]
  let level = tree.getLevel(treePosition)
  let isPlayersTurn = sabaki.getPlayer(treePosition) === game.playerSign

  sabaki.goStep(-Math.min(level, isPlayersTurn ? 2 : 1))
}

export function passMove() {
  if (game == null) return

  sabaki.makeMove([-1, -1])
}

export function currentBoard() {
  return envCurrentBoard(sabaki)
}

export function gameScoringInfo() {
  let {gameTrees, gameIndex} = sabaki.state
  let tree = gameTrees[gameIndex]

  return {
    komi: +gametree.getRootProperty(tree, 'KM', 6.5),
    handicap: +gametree.getRootProperty(tree, 'HA', 0),
  }
}

export function stopGame() {
  if (game == null) return

  sabaki.detachEngines([game.syncerId])
  game = null

  sabaki.setState({
    blackEngineSyncerId: null,
    whiteEngineSyncerId: null,
    frankKatagoGame: null,
  })
}

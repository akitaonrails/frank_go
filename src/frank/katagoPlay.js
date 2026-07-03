// frank_go: friction-free "play vs KataGo" (renderer only).
//
// Finds a KataGo engine registered in the settings (see
// scripts/frank/setup-katago.mjs), starts a fresh game, attaches the engine
// on the requested color and lets Sabaki's regular engine flow answer the
// player's moves. Game state is published as `frankKatagoGame` so the
// practice sidebar can offer beginner-friendly controls (score estimate,
// undo, pass, restart, stop).

import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'
import i18n from '../i18n.js'
import * as dialog from '../modules/dialog.js'

const t = i18n.context('frank.katago')

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

let game = null // {playerSign, engineName, syncerId}

// Prefers the beginner-friendly engine installed by setup-katago.mjs, but
// accepts any engine whose name mentions KataGo.
export function findKataGoEngine(engines = setting.get('engines.list') || []) {
  return (
    engines.find((engine) => /katago.*beginner/i.test(engine.name)) ||
    engines.find((engine) => /katago.*human/i.test(engine.name)) ||
    engines.find((engine) => /katago/i.test(engine.name)) ||
    null
  )
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
          'Run `npm run frank:katago` in the app folder,',
          'or add your own engine under Engines > Manage Engines.',
        ].join('\n'),
      ),
      'info',
    )

    return
  }

  await sabaki.newFile({playSound: false, showInfo: false})

  let [syncer] = sabaki.attachEngines([engine])
  if (syncer == null) return

  game = {playerSign, engineName: engine.name, syncerId: syncer.id}

  // Beginners don't need the raw GTP console.
  setting.set('view.show_leftsidebar', false)

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
  let {gameTrees, gameIndex, treePosition} = sabaki.state
  return gametree.getBoard(gameTrees[gameIndex], treePosition)
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

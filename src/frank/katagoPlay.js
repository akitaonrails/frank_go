// frank_go: friction-free "play vs KataGo" (renderer only).
//
// Finds a KataGo engine registered in the settings (see
// scripts/frank/setup-katago.mjs), starts a fresh game, attaches the engine
// on the requested color and lets Sabaki's regular engine flow answer the
// player's moves. The beginner area painting overlay works as usual during
// the game (Practice menu / Ctrl+Shift+B).

import sabaki from '../modules/sabaki.js'
import i18n from '../i18n.js'
import * as dialog from '../modules/dialog.js'

const t = i18n.context('frank.katago')

const setting = {
  get: (key) => window.sabaki.setting.get(key),
}

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

// playerSign: 1 = the human plays Black, -1 = the human plays White.
export async function playAgainstKataGo(playerSign = 1) {
  let engine = findKataGoEngine()

  if (engine == null) {
    await dialog.showMessageBox(
      t(
        [
          'No KataGo engine is configured yet.',
          '',
          'Run `node scripts/frank/setup-katago.mjs` in the app folder,',
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

  sabaki.setState({
    blackEngineSyncerId: playerSign > 0 ? null : syncer.id,
    whiteEngineSyncerId: playerSign > 0 ? syncer.id : null,
  })

  // If the engine plays Black it should open the game.
  if (playerSign < 0) {
    sabaki.generateMove(syncer.id, sabaki.state.treePosition)
  }
}

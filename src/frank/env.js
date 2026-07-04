// frank_go: small renderer-side helpers shared by the frank modules.
//
// Deliberately does NOT import modules/sabaki.js so that anything pure
// stays importable from node (tests, scripts); the settings bridge is a
// thin wrapper over the preload API.

import * as gametree from '../modules/gametree.js'

export const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

// Board of the current position (callers pass the sabaki singleton to
// avoid a module-level import).
export function currentBoard(sabaki) {
  let {gameTrees, gameIndex, treePosition} = sabaki.state
  return gametree.getBoard(gameTrees[gameIndex], treePosition)
}

// Beginners don't need the raw GTP console. Sabaki keeps the visibility
// in UI state separately from the setting, so both must be set.
export function hideGtpConsole(sabaki) {
  setting.set('view.show_leftsidebar', false)
  sabaki.setState({showLeftSidebar: false})
}

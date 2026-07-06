// frank_go: pure KataGo engine selection over a plain engines list. No
// Sabaki/window imports — unit-testable. katagoPlay wraps these with the
// live settings.

export function listKataGoEngines(engines = []) {
  return engines.filter((engine) => /katago/i.test(engine.name))
}

// Prefers the player's chosen opponent by name, then a beginner-friendly
// engine, then any human-rank engine, then any KataGo.
export function selectKataGoEngine(engines = [], preferredName = null) {
  return (
    (preferredName &&
      engines.find((engine) => engine.name === preferredName)) ||
    engines.find((engine) => /katago.*beginner/i.test(engine.name)) ||
    engines.find((engine) => /katago.*human/i.test(engine.name)) ||
    engines.find((engine) => /katago/i.test(engine.name)) ||
    null
  )
}

export function hasHumanRanks(engines = []) {
  return engines.some((engine) => /katago.*human/i.test(engine.name))
}

// frank_go: pure progression logic for tsumego practice.
//
// The player climbs difficulty levels 1..10 (see data/tsumego/index.json):
// solving STREAK_TO_LEVEL_UP problems in a row levels up, missing
// MISSES_TO_LEVEL_DOWN in a row levels down. Solved problem ids are
// remembered so fresh problems are preferred.

export const LEVEL_MIN = 1
export const LEVEL_MAX = 10
export const STREAK_TO_LEVEL_UP = 5
export const MISSES_TO_LEVEL_DOWN = 2

export function initialProgress(level = LEVEL_MIN) {
  return {
    level: Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, level)),
    streak: 0,
    misses: 0,
  }
}

// Returns the next progress state plus an `event` of 'level-up',
// 'level-down', or null.
export function applyResult(progress, correct) {
  let {level, streak, misses} = progress

  if (correct) {
    streak++
    misses = 0

    if (streak >= STREAK_TO_LEVEL_UP && level < LEVEL_MAX) {
      return {level: level + 1, streak: 0, misses: 0, event: 'level-up'}
    }

    return {level, streak, misses, event: null}
  }

  streak = 0
  misses++

  if (misses >= MISSES_TO_LEVEL_DOWN && level > LEVEL_MIN) {
    return {level: level - 1, streak: 0, misses: 0, event: 'level-down'}
  }

  return {level, streak, misses, event: null}
}

// Study focus → problem categories (null = everything). Buckets come
// from the Gokyo Shumyo sections plus the GGG comment classification.
export const FOCUS_CATEGORIES = {
  all: null,
  'life-and-death': ['life-and-death', 'living', 'killing'],
  tesuji: ['tesuji', 'technique'],
  ko: ['ko'],
  'capturing-race': ['capturing-race', 'oiotoshi'],
}

export const FOCUS_LABELS = {
  all: 'Everything',
  'life-and-death': 'Life & death',
  tesuji: 'Tesuji & technique',
  ko: 'Ko',
  'capturing-race': 'Capturing races',
}

// Picks a random problem near the given level, preferring problems the
// player hasn't solved yet — and among those, ones that carry a solution
// tree (exact feedback beats heuristics): exact level first, then one
// level around it, then already-solved problems (endless practice).
export function pickProblem(
  store,
  {level, solvedIds = new Set(), focus = 'all', rng},
) {
  let categories = FOCUS_CATEGORIES[focus] || null
  let fresh = (problems) =>
    problems.filter((problem) => !solvedIds.has(problem.id))
  let preferSolved = (problems) => {
    let withSolutions = problems.filter((problem) => problem.hasSolutions)
    return withSolutions.length > 0 ? withSolutions : problems
  }

  let candidates = fresh(store.query({level, categories}))

  if (candidates.length === 0) {
    candidates = fresh(
      store.query({
        minLevel: Math.max(LEVEL_MIN, level - 1),
        maxLevel: Math.min(LEVEL_MAX, level + 1),
        categories,
      }),
    )
  }

  if (candidates.length === 0) {
    candidates = store.query({level, categories})
  }

  if (candidates.length === 0 && categories != null) {
    // Focus bucket exhausted at this level — widen to everything rather
    // than dead-ending the session
    candidates = store.query({level})
  }

  if (candidates.length === 0) return null

  candidates = preferSolved(candidates)
  return candidates[Math.floor(rng() * candidates.length)]
}

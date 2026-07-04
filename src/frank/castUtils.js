// frank_go: pure helpers for the Hikaru no Go character cast display.
// No Sabaki/window imports — unit-testable from node.

import {existsSync} from 'fs'
import {join} from 'path'

// 'Hikaru (Sai)' → 'hikaru', 'Akira Toya' → 'akira-toya'
export function characterSlug(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// 'Akira Toya' → 'AT', 'Sai' → 'S'
export function castInitials(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Portrait lookup: full-name slug first, then the given name alone, so
// one hikaru.png covers both 'Hikaru Shindo' and 'Hikaru (Sai)'.
export function findPortrait(portraitsDir, name) {
  let slug = characterSlug(name)
  let firstName = slug.split('-')[0]

  return (
    ['png', 'jpg', 'jpeg', 'webp']
      .flatMap((ext) => [
        join(portraitsDir, `${slug}.${ext}`),
        join(portraitsDir, `${firstName}.${ext}`),
      ])
      .find(existsSync) || null
  )
}

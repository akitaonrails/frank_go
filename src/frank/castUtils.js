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

// Built-in medallion styling per character: an accent color plus a small
// motif drawn inside the go-stone badge. The motifs are original, minimalist
// glyphs evoking the character without using any copyrighted artwork (see
// issue #6); the UI maps each motif key to an inline SVG shape.
const CAST_STYLES = {
  // Sai — Heian court eboshi hat
  sai: {accent: '#a58fd6', motif: 'eboshi'},
  // Hikaru — the shooting star / number 5 on his shirt
  hikaru: {accent: '#d9a03f', motif: 'star'},
  // Akira — his immaculate bob, reduced to an abstract silhouette
  'akira-toya': {accent: '#6f95d8', motif: 'bob'},
  // Ko Yongha — the Korean taegeuk
  'ko-yongha': {accent: '#d9706a', motif: 'taegeuk'},
  // Ochi — a young sprout (rising insei)
  'kosuke-ochi': {accent: '#7fae7a', motif: 'sprout'},
  // Kuwabara — the old master's folding fan
  'kuwabara-honinbo': {accent: '#dd8f52', motif: 'fan'},
  // Ogata — his glasses
  'seiji-ogata': {accent: '#9aa7b8', motif: 'glasses'},
  // Kadowaki — a lightning bolt
  'tatsuhiko-kadowaki': {accent: '#c9759f', motif: 'bolt'},
  // Kaga — a shogi piece (his other game)
  'tetsuo-kaga': {accent: '#b98a4e', motif: 'shogi'},
  // The Rival Tutor — an unknown figure
  'the-rival-tutor': {accent: '#6e7f92', motif: 'question'},
  // Toya Koyo — the Meijin's crown
  'toya-koyo': {accent: '#5fb3a8', motif: 'crown'},
  // Waya — his headband
  'yoshitaka-waya': {accent: '#62b6d9', motif: 'headband'},
}

// Medallion style lookup: full-name slug first, then the given name alone
// (mirroring findPortrait). Unknown characters get a deterministic accent
// derived from the name and no motif, so they keep the initials badge.
export function castStyle(name) {
  let slug = characterSlug(name)
  let style = CAST_STYLES[slug] ?? CAST_STYLES[slug.split('-')[0]]

  if (style != null) return style

  let hue = 0
  for (let char of slug) hue = (hue * 31 + char.charCodeAt(0)) % 360

  return {accent: `hsl(${hue} 35% 62%)`, motif: null}
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

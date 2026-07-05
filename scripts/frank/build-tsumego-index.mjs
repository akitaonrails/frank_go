#!/usr/bin/env node

// Builds data/tsumego/index.json (the local problem database) from the raw
// SGF collection files in data/tsumego/collections/.
//
// Each collection file is a single SGF gametree whose root holds the book
// header and whose children are the individual problems (AB/AW/PL/C only).
//
// Difficulty model: every problem gets a `level` from 1 (double-digit kyu)
// to 10 (top amateur/pro). Books are assigned a [lo, hi] range and problems
// ramp linearly through it, matching the books' own easy-to-hard ordering.
// See data/SOURCES.md for provenance and licensing notes.

import {existsSync, readFileSync, readdirSync, writeFileSync} from 'fs'
import {dirname, join} from 'path'
import {fileURLToPath} from 'url'
import sgf from '@sabaki/sgf'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const collectionsDir = join(rootDir, 'data', 'tsumego', 'collections')
const outputPath = join(rootDir, 'data', 'tsumego', 'index.json')

const GOKYO_SECTIONS = {
  1: 'living',
  2: 'killing',
  3: 'ko',
  4: 'capturing-race',
  5: 'oiotoshi',
  6: 'connecting',
  7: 'technique',
}

const COLLECTIONS = [
  {
    id: 'cho-elementary',
    file: 'cho-1.sgf',
    title: "Cho Chikun's Encyclopedia of Life & Death — Elementary",
    levelRange: [1, 3],
    category: () => 'life-and-death',
  },
  {
    id: 'lee-chang-ho',
    file: 'lee-chang-ho.sgf',
    title: "Lee Chang-ho's Selected Life and Death Go Problems",
    levelRange: [2, 5],
    category: () => 'life-and-death',
  },
  {
    id: 'cho-intermediate',
    file: 'cho-2.sgf',
    title: "Cho Chikun's Encyclopedia of Life & Death — Intermediate",
    levelRange: [3, 6],
    category: () => 'life-and-death',
  },
  {
    id: 'gokyo-shumyo',
    file: 'gokyoshumyo.sgf',
    title: 'Gokyo Shumyo (1812)',
    levelRange: [5, 7],
    category: (title) => {
      let match = title.match(/problem (\d+)-\d+/)
      return (match && GOKYO_SECTIONS[+match[1]]) || 'technique'
    },
  },
  {
    id: 'cho-advanced',
    file: 'cho-3.sgf',
    title: "Cho Chikun's Encyclopedia of Life & Death — Advanced",
    levelRange: [6, 8],
    category: () => 'life-and-death',
  },
  {
    id: 'xuanxuan-qijing',
    file: 'xxqj.sgf',
    title: 'Xuanxuan Qijing / Gengen Gokyo (1347)',
    levelRange: [7, 9],
    category: () => 'classic',
  },
  {
    id: 'hatsuyoron',
    file: 'hatsuyoron.sgf',
    title: 'Igo Hatsuyō-ron (1713)',
    levelRange: [9, 10],
    category: () => 'classic',
  },
]

// GoGameGuru weekly problems: commented, with full solution trees.
// Credit: An Younggil (8p) & David Ormerod, CC BY-NC-SA 4.0.
const GGG_TIERS = [
  {
    id: 'ggg-easy',
    dir: 'easy',
    title: 'Go Game Guru — Weekly Problems (Easy)',
    levelRange: [2, 4],
  },
  {
    id: 'ggg-intermediate',
    dir: 'intermediate',
    title: 'Go Game Guru — Weekly Problems (Intermediate)',
    levelRange: [4, 7],
  },
  {
    id: 'ggg-hard',
    dir: 'hard',
    title: 'Go Game Guru — Weekly Problems (Hard)',
    levelRange: [7, 9],
  },
]

const GGG_CREDIT =
  'Problems by An Younggil 8p & David Ormerod, Go Game Guru · CC BY-NC-SA 4.0'

const TASUKI_CREDIT = 'Transcribed by Vít Brunner (tsumego.tasuki.org)'

// Coarse theme from the solution commentary, most specific first
const THEME_PATTERNS = [
  ['tesuji', /tesuji/i],
  ['endgame', /endgame|yose/i],
  ['capturing-race', /semeai|capturing race|liberty race/i],
  ['life-and-death', /\blive\b|\blife\b|\bkill|\bdead\b|death|\beye\b|eyes\b/i],
  ['ko', /\bko\b/i],
]

function classifyTheme(sgfText) {
  // Only look at comment text — raw SGF is full of two-letter coordinates
  // like [ko] that would fool word matches
  // …and prefer comments on the solution line ("Correct") — refutation
  // comments often name what the WRONG move leads to (e.g. "it's a ko")
  let all = [...sgfText.matchAll(/C\[((?:\\.|[^\]])*)\]/g)].map(
    (match) => match[1],
  )
  let solutionComments = all.filter((text) => /correct/i.test(text))
  let comments = (solutionComments.length > 0 ? solutionComments : all).join(
    '\n',
  )

  for (let [theme, pattern] of THEME_PATTERNS) {
    if (pattern.test(comments)) return theme
  }

  return 'mixed'
}

function buildGggTier(config) {
  let dir = join(rootDir, 'data', 'tsumego', 'ggg', config.dir)
  let files = readdirSync(dir)
    .filter((name) => name.endsWith('.sgf'))
    .sort()
  let [lo, hi] = config.levelRange

  let problems = files.map((file, i) => {
    let text = readFileSync(join(dir, file), 'utf8')
    let [root] = sgf.parse(text)
    let size = +(root.data.SZ ? root.data.SZ[0] : 19)
    let black = root.data.AB || []
    let white = root.data.AW || []
    let rootComment = root.data.C ? root.data.C[0] : ''
    let toPlay = /white to play/i.test(rootComment) ? 'W' : 'B'
    let level =
      files.length > 1
        ? Math.round(lo + ((hi - lo) * i) / (files.length - 1))
        : lo

    return {
      id: `${config.id}/${i + 1}`,
      collection: config.id,
      n: i + 1,
      title: `${config.title.replace('Go Game Guru — Weekly Problems', 'Weekly problem')} #${i + 1}`,
      level,
      category: classifyTheme(text),
      toPlay,
      size,
      AB: black,
      AW: white,
      region: boundingBox([...black, ...white].map(parseVertex)),
      hasSolutions: true,
      sgf: text,
    }
  })

  return {
    meta: {
      id: config.id,
      title: config.title,
      file: `ggg/${config.dir}`,
      count: problems.length,
      levelRange: config.levelRange,
      credit: GGG_CREDIT,
      hasSolutions: true,
    },
    problems,
  }
}

function boundingBox(vertices) {
  let xs = vertices.map(([x]) => x)
  let ys = vertices.map(([, y]) => y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function parseVertex(coord) {
  // SGF coordinates: 'a' = 0
  return [coord.charCodeAt(0) - 97, coord.charCodeAt(1) - 97]
}

function buildCollection(config) {
  let filePath = join(collectionsDir, config.file)
  if (!existsSync(filePath)) {
    throw new Error(`Missing collection file: ${filePath}`)
  }

  let [root] = sgf.parse(readFileSync(filePath, 'utf8'))
  let size = +(root.data.SZ ? root.data.SZ[0] : 19)
  let [lo, hi] = config.levelRange
  let count = root.children.length

  let problems = root.children.map((node, i) => {
    let title = node.data.C ? node.data.C[0].trim() : `problem ${i + 1}`
    let black = node.data.AB || []
    let white = node.data.AW || []
    let toPlay = node.data.PL && node.data.PL[0] === 'W' ? 'W' : 'B'
    let level = count > 1 ? Math.round(lo + ((hi - lo) * i) / (count - 1)) : lo

    return {
      id: `${config.id}/${i + 1}`,
      collection: config.id,
      n: i + 1,
      title,
      level,
      category: config.category(title),
      toPlay,
      size,
      AB: black,
      AW: white,
      region: boundingBox([...black, ...white].map(parseVertex)),
    }
  })

  return {
    meta: {
      id: config.id,
      title: config.title,
      file: `collections/${config.file}`,
      count: problems.length,
      levelRange: config.levelRange,
    },
    problems,
  }
}

let collections = {}
let problems = []

for (let config of COLLECTIONS) {
  let built = buildCollection(config)
  built.meta.credit = TASUKI_CREDIT
  collections[config.id] = built.meta
  problems.push(...built.problems)
  console.log(`${config.id}: ${built.problems.length} problems`)
}

for (let config of GGG_TIERS) {
  let built = buildGggTier(config)
  collections[config.id] = built.meta
  problems.push(...built.problems)
  console.log(
    `${config.id}: ${built.problems.length} problems (with solutions)`,
  )
}

let index = {
  version: 1,
  generatedAt: new Date().toISOString(),
  levelScale:
    '1≈15+ kyu, 3≈10 kyu, 5≈5 kyu, 7≈1 dan, 9≈4 dan+, 10≈top amateur/pro',
  collections,
  problems,
}

writeFileSync(outputPath, JSON.stringify(index))
console.log(`\nWrote ${problems.length} problems to ${outputPath}`)

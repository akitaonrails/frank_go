#!/usr/bin/env node

// Developer CLI for the local KataGo setup. End users don't need this —
// the app offers the same setup with one click in the practice sidebar
// (downloads go to Electron's userData directory there). This wrapper
// targets the repo's data/katago and registers the engines directly in
// Sabaki's settings.json.
//
//   node scripts/frank/setup-katago.mjs [--human] [--strong] [--backend <b>]

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import {homedir} from 'os'
import {dirname, join, resolve} from 'path'
import {fileURLToPath} from 'url'
import {mergeEngines, runSetup} from '../../src/frank/katagoSetup.js'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const kataDir = join(rootDir, 'data', 'katago')

const args = process.argv.slice(2)
const wantHuman = args.includes('--human')
const wantStrong = args.includes('--strong')
const backend = args.includes('--backend')
  ? args[args.indexOf('--backend') + 1]
  : 'eigenavx2'

function sabakiSettingsPath() {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || '', 'Sabaki', 'settings.json')
  }

  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Sabaki',
      'settings.json',
    )
  }

  return join(homedir(), '.config', 'Sabaki', 'settings.json')
}

let lastStep = null

let engines = await runSetup({
  dir: kataDir,
  human: wantHuman,
  strong: wantStrong,
  backend,
  onProgress: ({step, fraction}) => {
    if (step !== lastStep) {
      lastStep = step
      process.stdout.write(`\n`)
    }
    process.stdout.write(`\r${step}: ${Math.round(fraction * 100)}%   `)
  },
})

console.log('\n')

let settingsPath = sabakiSettingsPath()
let settings = {}

if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  } catch (err) {
    console.error(`Could not parse ${settingsPath} — engines not registered.`)
    process.exit(1)
  }
} else {
  mkdirSync(dirname(settingsPath), {recursive: true})
}

let {list, added} = mergeEngines(settings['engines.list'], engines)
settings['engines.list'] = list
writeFileSync(settingsPath, JSON.stringify(settings, null, 2))

console.log(
  `Registered/updated ${engines.length} engines in ${settingsPath} (${added} new).`,
)
console.log(`
Done. Start the app and use the practice sidebar, or:
  Practice > Play vs KataGo

Flags: --strong (b18 network, ~100 MB) · --human (ranked human-like
opponents 15k/5k/1d, ~250 MB)
`)

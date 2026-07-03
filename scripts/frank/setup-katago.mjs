#!/usr/bin/env node

// One-command local KataGo setup for frank_go.
//
//   node scripts/frank/setup-katago.mjs [--human] [--strong] [--backend <b>]
//
// - Finds `katago` on PATH, or downloads the official release binary
//   (Linux/Windows x64; on macOS install via `brew install katago`).
// - Downloads a fast CPU-friendly network (b6c96, ~10 MB) — plus the strong
//   b18 network with --strong (~100 MB) and the human-imitation network
//   (b18-humanv0, KataGo v1.15+) with --human.
// - Writes GTP configs (beginner / full / human-5k) into data/katago/.
// - Registers the engines in Sabaki's settings so they appear in the
//   Engines sidebar and the Practice menu can use them.
//
// Everything lands in data/katago/ (gitignored). Re-running is idempotent.

import {spawnSync} from 'child_process'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  readdirSync,
} from 'fs'
import {get} from 'https'
import {homedir} from 'os'
import {dirname, join, resolve} from 'path'
import {fileURLToPath} from 'url'

const KATAGO_VERSION = 'v1.16.5'
const RELEASE_BASE = `https://github.com/lightvector/KataGo/releases/download/${KATAGO_VERSION}`

const NETWORKS = {
  fast: {
    file: 'kata1-b6c96.txt.gz',
    url: 'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s175395328-d26788732.txt.gz',
  },
  strong: {
    file: 'kata1-b18c384nbt.bin.gz',
    url: 'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz',
  },
  human: {
    file: 'b18c384nbt-humanv0.bin.gz',
    url: 'https://github.com/lightvector/KataGo/releases/download/v1.15.0/b18c384nbt-humanv0.bin.gz',
  },
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const kataDir = join(rootDir, 'data', 'katago')
const binDir = join(kataDir, 'bin')
const netDir = join(kataDir, 'networks')
const logDir = join(kataDir, 'logs')

const args = process.argv.slice(2)
const wantHuman = args.includes('--human')
const wantStrong = args.includes('--strong')
const backend =
  args[args.indexOf('--backend') + 1] && args.includes('--backend')
    ? args[args.indexOf('--backend') + 1]
    : 'eigenavx2'

function download(url, destination, label) {
  return new Promise((resolvePromise, reject) => {
    let request = (currentUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'))

      get(currentUrl, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          return request(response.headers.location, redirects + 1)
        }

        if (response.statusCode !== 200) {
          return reject(
            new Error(`HTTP ${response.statusCode} for ${currentUrl}`),
          )
        }

        let file = createWriteStream(destination)
        let total = +response.headers['content-length'] || 0
        let received = 0

        response.on('data', (chunk) => {
          received += chunk.length
          if (total > 0 && received % (10 * 1024 * 1024) < chunk.length) {
            process.stdout.write(
              `\r  ${label}: ${Math.round((received / total) * 100)}%   `,
            )
          }
        })

        response.pipe(file)
        file.on('finish', () => {
          process.stdout.write(`\r  ${label}: done          \n`)
          file.close(resolvePromise)
        })
      }).on('error', reject)
    }

    request(url)
  })
}

function findKatagoOnPath() {
  let result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [
    'katago',
  ])

  if (result.status === 0) {
    return result.stdout.toString().split('\n')[0].trim()
  }

  return null
}

function extractZip(zipPath, destination) {
  for (let [cmd, cmdArgs] of [
    ['unzip', ['-o', zipPath, '-d', destination]],
    ['bsdtar', ['-xf', zipPath, '-C', destination]],
    ['tar', ['-xf', zipPath, '-C', destination]],
  ]) {
    let result = spawnSync(cmd, cmdArgs, {stdio: 'pipe'})
    if (result.status === 0) return true
  }

  return false
}

async function ensureKatagoBinary() {
  let onPath = findKatagoOnPath()

  if (onPath != null) {
    console.log(`Using katago from PATH: ${onPath}`)
    return onPath
  }

  let localBinary = join(
    binDir,
    process.platform === 'win32' ? 'katago.exe' : 'katago',
  )

  if (existsSync(localBinary)) {
    console.log(`Using previously downloaded katago: ${localBinary}`)
    return localBinary
  }

  if (process.platform === 'darwin') {
    console.error(
      'No official macOS binaries — install KataGo with `brew install katago`, then re-run.',
    )
    process.exit(1)
  }

  let platform = process.platform === 'win32' ? 'windows-x64' : 'linux-x64'
  let asset = `katago-${KATAGO_VERSION}-${backend}-${platform}.zip`
  let zipPath = join(binDir, asset)

  console.log(`Downloading ${asset}…`)
  mkdirSync(binDir, {recursive: true})
  await download(`${RELEASE_BASE}/${asset}`, zipPath, asset)

  if (!extractZip(zipPath, binDir)) {
    console.error(`Could not extract ${zipPath} (need unzip, bsdtar or tar).`)
    process.exit(1)
  }

  // Some archives nest the binary in a subdirectory — locate it.
  let findBinary = (dir) => {
    for (let entry of readdirSync(dir, {withFileTypes: true})) {
      let path = join(dir, entry.name)
      if (entry.isDirectory()) {
        let found = findBinary(path)
        if (found) return found
      } else if (/^katago(\.exe)?$/.test(entry.name)) {
        return path
      }
    }
    return null
  }

  let binary = findBinary(binDir)
  if (binary == null) {
    console.error('katago binary not found in the extracted archive.')
    process.exit(1)
  }

  if (process.platform !== 'win32') chmodSync(binary, 0o755)
  console.log(`Installed ${binary}`)
  return binary
}

async function ensureNetwork(key) {
  let {file, url} = NETWORKS[key]
  let destination = join(netDir, file)

  if (!existsSync(destination)) {
    mkdirSync(netDir, {recursive: true})
    await download(url, destination, file)
  } else {
    console.log(`Network already present: ${file}`)
  }

  return destination
}

function writeConfigs({human}) {
  let common = [
    `logDir = ${logDir}`,
    'logAllGTPCommunication = false',
    'logSearchInfo = false',
    'logToStderr = false',
    'rules = japanese',
    'lagBuffer = 1.0',
  ]

  let configs = {
    'gtp-beginner.cfg': [
      '# frank_go: weak, friendly KataGo for beginners (CPU-cheap)',
      ...common,
      'allowResignation = false',
      'resignThreshold = -0.99',
      'resignConsecTurns = 20',
      'maxVisits = 24',
      'numSearchThreads = 2',
      'ponderingEnabled = false',
    ],
    'gtp-full.cfg': [
      '# frank_go: full-strength KataGo (as strong as your hardware allows)',
      ...common,
      'allowResignation = true',
      'resignThreshold = -0.95',
      'resignConsecTurns = 6',
      'maxVisits = 800',
      'numSearchThreads = 4',
      'ponderingEnabled = false',
    ],
  }

  if (human) {
    // Mirrors KataGo's official gtp_human5k_example.cfg
    configs['gtp-human5k.cfg'] = [
      '# frank_go: imitates a ~5-kyu human (requires -human-model)',
      '# Change humanSLProfile to e.g. preaz_15k, preaz_1d to adjust rank.',
      ...common,
      'allowResignation = false',
      'maxVisits = 40',
      'numSearchThreads = 1',
      'delayMoveScale = 2.0',
      'delayMoveMax = 10.0',
      'humanSLProfile = preaz_5k',
      'humanSLChosenMoveProp = 1.0',
      'humanSLChosenMoveIgnorePass = true',
      'humanSLChosenMovePiklLambda = 100000000',
      'humanSLRootExploreProbWeightless = 0.0',
      'humanSLRootExploreProbWeightful = 0.0',
      'humanSLPlaExploreProbWeightless = 0.0',
      'humanSLPlaExploreProbWeightful = 0.0',
      'humanSLOppExploreProbWeightless = 0.0',
      'humanSLOppExploreProbWeightful = 0.0',
    ]
  }

  for (let [name, lines] of Object.entries(configs)) {
    writeFileSync(join(kataDir, name), lines.join('\n') + '\n')
    console.log(`Wrote ${join(kataDir, name)}`)
  }
}

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

function registerEngines({binary, fastNet, strongNet, humanNet}) {
  let engines = [
    {
      name: 'KataGo (Beginner)',
      path: binary,
      args: `gtp -config ${join(kataDir, 'gtp-beginner.cfg')} -model ${fastNet}`,
      commands: '',
    },
    {
      name: 'KataGo (Full)',
      path: binary,
      args: `gtp -config ${join(kataDir, 'gtp-full.cfg')} -model ${strongNet || fastNet}`,
      commands: '',
    },
  ]

  if (humanNet) {
    engines.push({
      name: 'KataGo (Human ~5k)',
      path: binary,
      args: `gtp -config ${join(kataDir, 'gtp-human5k.cfg')} -model ${strongNet || fastNet} -human-model ${humanNet}`,
      commands: '',
    })
  }

  let settingsPath = sabakiSettingsPath()
  let settings = {}

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
    } catch (err) {
      console.error(`Could not parse ${settingsPath} — engines not registered.`)
      return
    }
  } else {
    mkdirSync(dirname(settingsPath), {recursive: true})
  }

  let list = settings['engines.list'] || []
  let added = 0

  for (let engine of engines) {
    let existing = list.findIndex((x) => x.name === engine.name)

    if (existing >= 0) {
      list[existing] = engine
    } else {
      list.push(engine)
      added++
    }
  }

  settings['engines.list'] = list
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  console.log(
    `Registered/updated ${engines.length} engines in ${settingsPath} (${added} new).`,
  )
}

mkdirSync(logDir, {recursive: true})

let binary = await ensureKatagoBinary()
let fastNet = await ensureNetwork('fast')
let strongNet = wantStrong ? await ensureNetwork('strong') : null
let humanNet = wantHuman ? await ensureNetwork('human') : null

writeConfigs({human: wantHuman})
registerEngines({binary, fastNet, strongNet, humanNet})

console.log(`
Done. Start the app and use:
  Practice > Play vs KataGo   (or attach engines via the Engines sidebar)

Tips:
  --strong   also download the strong b18 network (~100 MB)
  --human    also download the human-imitation network and a ~5k profile
`)

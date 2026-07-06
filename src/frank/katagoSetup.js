// frank_go: KataGo installation core — environment-agnostic.
//
// Used both by the in-app one-click setup (PracticeSidebar buttons, which
// download into Electron's userData directory so packaged/AUR installs
// work without touching /usr) and by the developer CLI wrapper
// (scripts/frank/setup-katago.mjs, which targets the repo's data/katago).
//
// This module must not reference `window` or Sabaki state — callers pass
// the target directory, a progress callback and an engine-registration
// callback.

import {spawnSync} from 'child_process'
import {
  chmodSync,
  closeSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  rmSync,
  writeFileSync,
} from 'fs'
import {get} from 'https'
import {join} from 'path'

export const KATAGO_VERSION = 'v1.16.5'

const RELEASE_BASE = `https://github.com/lightvector/KataGo/releases/download/${KATAGO_VERSION}`

// Human-imitation opponents registered with the human model (weak → strong)
export const HUMAN_RANKS = ['15k', '5k', '1d']

export const NETWORKS = {
  fast: {
    file: 'kata1-b6c96.txt.gz',
    label: 'fast network (~10 MB)',
    url: 'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s175395328-d26788732.txt.gz',
  },
  strong: {
    file: 'kata1-b18c384nbt.bin.gz',
    label: 'strong network (~100 MB)',
    url: 'https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz',
  },
  human: {
    file: 'b18c384nbt-humanv0.bin.gz',
    label: 'human-imitation network (~250 MB)',
    url: 'https://github.com/lightvector/KataGo/releases/download/v1.15.0/b18c384nbt-humanv0.bin.gz',
  },
}

export function download(url, destination, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
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
          if (total > 0) onProgress(received / total)
        })

        response.pipe(file)
        file.on('finish', () => file.close(resolve))
      }).on('error', reject)
    }

    request(url)
  })
}

// A katago binary is only useful if it actually inits its backend. GPU
// builds (katago-opencl / katago-cuda) with no working driver install
// fine and even answer `version`, but crash the moment `gtp` loads the
// network (e.g. CL_PLATFORM_NOT_FOUND_KHR). So we verify with a real GTP
// session that loads the model — the only check that catches this.
export function katagoBootsGtp(binary, config, model) {
  try {
    let result = spawnSync(
      binary,
      ['gtp', '-config', config, '-model', model],
      {
        input: 'name\nquit\n',
        timeout: 60000,
        encoding: 'utf8',
        // If the binary is still an AppImage (e.g. found on PATH), keep
        // AppImageLauncher from hijacking the exec with a GUI dialog.
        env: {...process.env, APPIMAGELAUNCHER_DISABLE: '1'},
      },
    )
    return result.status === 0
  } catch (err) {
    return false
  }
}

// KataGo's official Linux binaries are AppImages (type 2: magic bytes
// "AI\x02" at offset 8). Run as-is they need FUSE, and AppImageLauncher —
// common on Arch/CachyOS — intercepts the exec with an integration dialog
// that *moves the file away*, breaking the engine and looping the setup.
export function isAppImage(path) {
  let fd
  try {
    fd = openSync(path, 'r')
    let magic = Buffer.alloc(3)
    let bytes = readSync(fd, magic, 0, 3, 8)
    return (
      bytes === 3 && magic[0] === 0x41 && magic[1] === 0x49 && magic[2] === 0x02
    )
  } catch (err) {
    return false
  } finally {
    if (fd != null) closeSync(fd)
  }
}

// Turns an AppImage katago into a plain binary by unpacking it once into
// binDir/squashfs-root (`--appimage-extract` needs no FUSE) and returning
// its AppRun. Plain binaries pass through untouched. `force` re-extracts,
// e.g. when a fresh CPU build must replace a previously unpacked GPU one.
export function extractAppImage(binary, binDir, {force = false} = {}) {
  if (!isAppImage(binary)) return binary

  let appRun = join(binDir, 'squashfs-root', 'AppRun')

  if (force || !existsSync(appRun)) {
    mkdirSync(binDir, {recursive: true})
    rmSync(join(binDir, 'squashfs-root'), {recursive: true, force: true})

    let result = spawnSync(binary, ['--appimage-extract'], {
      cwd: binDir,
      stdio: 'pipe',
      env: {...process.env, APPIMAGELAUNCHER_DISABLE: '1'},
    })

    if (result.status !== 0 || !existsSync(appRun)) return binary
  }

  return appRun
}

export function findKatagoOnPath() {
  let result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [
    'katago',
  ])

  if (result.status !== 0) return null
  return result.stdout.toString().split('\n')[0].trim()
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

export async function ensureKatagoBinary({
  dir,
  backend = 'eigenavx2',
  forceDownload = false,
  onProgress = () => {},
}) {
  let binDir = join(dir, 'bin')
  let localBinary = join(
    binDir,
    process.platform === 'win32' ? 'katago.exe' : 'katago',
  )
  let extracted = join(binDir, 'squashfs-root', 'AppRun')

  if (!forceDownload) {
    let onPath = findKatagoOnPath()
    if (onPath != null) return extractAppImage(onPath, binDir)

    if (existsSync(extracted)) return extracted
    if (existsSync(localBinary)) return extractAppImage(localBinary, binDir)
  }

  if (process.platform === 'darwin') {
    throw new Error(
      'No official macOS binaries — install KataGo with `brew install katago` and retry.',
    )
  }

  let platform = process.platform === 'win32' ? 'windows-x64' : 'linux-x64'
  let asset = `katago-${KATAGO_VERSION}-${backend}-${platform}.zip`
  let zipPath = join(binDir, asset)

  mkdirSync(binDir, {recursive: true})
  await download(`${RELEASE_BASE}/${asset}`, zipPath, onProgress)

  if (!extractZip(zipPath, binDir)) {
    throw new Error(`Could not extract ${zipPath} (need unzip, bsdtar or tar)`)
  }

  let findBinary = (searchDir) => {
    for (let entry of readdirSync(searchDir, {withFileTypes: true})) {
      let path = join(searchDir, entry.name)
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
    throw new Error('katago binary not found in the extracted archive')
  }

  if (process.platform !== 'win32') chmodSync(binary, 0o755)
  return extractAppImage(binary, binDir, {force: true})
}

export async function ensureNetwork(key, {dir, onProgress = () => {}}) {
  let {file, url} = NETWORKS[key]
  let netDir = join(dir, 'networks')
  let destination = join(netDir, file)

  if (!existsSync(destination)) {
    mkdirSync(netDir, {recursive: true})
    await download(url, destination, onProgress)
  }

  return destination
}

export function writeConfigs({dir, human = false}) {
  let logDir = join(dir, 'logs')
  mkdirSync(logDir, {recursive: true})

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
    // Mirrors KataGo's official gtp_human5k_example.cfg, at several ranks
    for (let rank of HUMAN_RANKS) {
      configs[`gtp-human${rank}.cfg`] = [
        `# frank_go: imitates a ~${rank} human (requires -human-model)`,
        '# Change humanSLProfile (e.g. preaz_20k .. preaz_9d) to adjust.',
        ...common,
        'allowResignation = false',
        'maxVisits = 40',
        'numSearchThreads = 1',
        'delayMoveScale = 2.0',
        'delayMoveMax = 10.0',
        `humanSLProfile = preaz_${rank}`,
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
  }

  for (let [name, lines] of Object.entries(configs)) {
    writeFileSync(join(dir, name), lines.join('\n') + '\n')
  }
}

export function buildEngineEntries({
  dir,
  binary,
  fastNet,
  strongNet = null,
  humanNet = null,
}) {
  let engines = [
    {
      name: 'KataGo (Beginner)',
      path: binary,
      args: `gtp -config ${join(dir, 'gtp-beginner.cfg')} -model ${fastNet}`,
      commands: '',
    },
    {
      name: 'KataGo (Full)',
      path: binary,
      args: `gtp -config ${join(dir, 'gtp-full.cfg')} -model ${strongNet || fastNet}`,
      commands: '',
    },
  ]

  if (humanNet != null) {
    for (let rank of HUMAN_RANKS) {
      engines.push({
        name: `KataGo (Human ~${rank})`,
        path: binary,
        args: `gtp -config ${join(dir, `gtp-human${rank}.cfg`)} -model ${strongNet || fastNet} -human-model ${humanNet}`,
        commands: '',
      })
    }
  }

  return engines
}

// Merges engine entries into an engines list (by name), returning the new
// list plus how many were added.
export function mergeEngines(list, engines) {
  let merged = [...(list || [])]
  let added = 0

  for (let engine of engines) {
    let existing = merged.findIndex((x) => x.name === engine.name)

    if (existing >= 0) {
      merged[existing] = engine
    } else {
      merged.push(engine)
      added++
    }
  }

  return {list: merged, added}
}

// Full setup: binary + networks + configs. Returns the engine entries;
// the caller persists them (settings file or live settings API).
export async function runSetup({
  dir,
  human = false,
  strong = false,
  backend = 'eigenavx2',
  onProgress = () => {},
}) {
  mkdirSync(dir, {recursive: true})

  onProgress({step: 'binary', fraction: 0})
  let binary = await ensureKatagoBinary({
    dir,
    backend,
    onProgress: (fraction) => onProgress({step: 'binary', fraction}),
  })

  onProgress({step: 'fast network', fraction: 0})
  let fastNet = await ensureNetwork('fast', {
    dir,
    onProgress: (fraction) => onProgress({step: 'fast network', fraction}),
  })

  let strongNet = null
  if (strong) {
    onProgress({step: 'strong network', fraction: 0})
    strongNet = await ensureNetwork('strong', {
      dir,
      onProgress: (fraction) => onProgress({step: 'strong network', fraction}),
    })
  }

  let humanNet = null
  if (human) {
    onProgress({step: 'human network', fraction: 0})
    humanNet = await ensureNetwork('human', {
      dir,
      onProgress: (fraction) => onProgress({step: 'human network', fraction}),
    })
  }

  writeConfigs({dir, human})

  // Verify the chosen binary actually boots GTP with the model. A PATH
  // katago can be a GPU build with no working driver (installs fine, then
  // crashes on launch); if so, fall back to the portable CPU build.
  let beginnerConfig = join(dir, 'gtp-beginner.cfg')
  if (!katagoBootsGtp(binary, beginnerConfig, fastNet)) {
    onProgress({step: 'downloading a working CPU engine', fraction: 0})
    binary = await ensureKatagoBinary({
      dir,
      backend,
      forceDownload: true,
      onProgress: (fraction) =>
        onProgress({step: 'downloading a working CPU engine', fraction}),
    })
  }

  return buildEngineEntries({dir, binary, fastNet, strongNet, humanNet})
}

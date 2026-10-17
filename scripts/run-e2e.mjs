import {spawnSync} from 'node:child_process'

const playwrightArgs = ['playwright', 'test', ...process.argv.slice(2)]
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(command, args, env = process.env) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    env,
  })
}

let result

if (process.platform === 'linux') {
  const virtualDisplayEnv = {
    ...process.env,
    ELECTRON_OZONE_PLATFORM_HINT: 'x11',
    SABAKI_E2E_VIRTUAL_DISPLAY: '1',
    XDG_SESSION_TYPE: 'x11',
  }
  delete virtualDisplayEnv.WAYLAND_DISPLAY

  result = run(
    'xvfb-run',
    [
      '--auto-servernum',
      '--server-args=-screen 0 1280x960x24',
      '--',
      npx,
      ...playwrightArgs,
    ],
    virtualDisplayEnv,
  )

  // Developers without Xvfb can still run the suite on their current display.
  // Do not fall back when Xvfb or the tests return a failure: that used to run
  // the suite twice and expose the second run's windows on the real desktop.
  if (result.error?.code === 'ENOENT') {
    console.warn(
      'xvfb-run is unavailable; running E2E tests on the current display',
    )
    result = run(npx, playwrightArgs)
  }
} else {
  result = run(npx, playwrightArgs)
}

if (result.error) throw result.error

process.exitCode = result.status ?? 1

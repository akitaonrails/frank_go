// frank_go: locates bundled data files. Pure node — importable from
// tests and scripts.
//
// The app root differs by context: webpack puts bundle.js at the repo
// root (__dirname of every bundled module), tests run from src/, and a
// packaged install keeps data/ next to the app files. Walking a few
// levels up from the calling module covers all three.

import {existsSync} from 'fs'
import {dirname, join} from 'path'

export function locateData(subpath, startDir) {
  let dir =
    startDir != null
      ? startDir
      : typeof __dirname !== 'undefined'
        ? __dirname
        : process.cwd()

  for (let i = 0; i < 5; i++) {
    let candidate = join(dir, 'data', subpath)
    if (existsSync(candidate)) return candidate
    dir = dirname(dir)
  }

  let fallback = join(process.cwd(), 'data', subpath)
  return existsSync(fallback) ? fallback : null
}

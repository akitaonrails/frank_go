import assert from 'assert'
import {mkdirSync, mkdtempSync, writeFileSync} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import {locateData} from '../../src/frank/paths.js'

describe('locateData', () => {
  it('finds a data file by walking up from a nested start dir', () => {
    let root = mkdtempSync(join(tmpdir(), 'frank-paths-'))
    mkdirSync(join(root, 'data', 'games'), {recursive: true})
    writeFileSync(join(root, 'data', 'games', 'index.json'), '{}')

    let deep = join(root, 'a', 'b', 'c')
    mkdirSync(deep, {recursive: true})

    assert.equal(
      locateData(join('games', 'index.json'), deep),
      join(root, 'data', 'games', 'index.json'),
    )
  })

  it('returns null when the file is not found within the walk depth', () => {
    let root = mkdtempSync(join(tmpdir(), 'frank-paths-'))
    assert.equal(locateData(join('nope', 'missing.json'), root), null)
  })

  it('locates the real bundled tsumego index', () => {
    // No startDir → uses this module's location, walking up to the repo
    let found = locateData(join('tsumego', 'index.json'))
    assert.ok(found != null)
    assert.ok(found.endsWith(join('data', 'tsumego', 'index.json')))
  })
})

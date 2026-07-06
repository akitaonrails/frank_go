import assert from 'assert'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import {
  HUMAN_RANKS,
  buildEngineEntries,
  extractAppImage,
  isAppImage,
  mergeEngines,
  writeConfigs,
} from '../../src/frank/katagoSetup.js'

describe('mergeEngines', () => {
  let incoming = [
    {name: 'KataGo (Beginner)', path: '/new/katago', args: 'gtp', commands: ''},
  ]

  it('adds new engines', () => {
    let {list, added} = mergeEngines([], incoming)

    assert.equal(added, 1)
    assert.equal(list.length, 1)
  })

  it('replaces engines with the same name and keeps others', () => {
    let existing = [
      {name: 'KataGo (Beginner)', path: '/old/katago', args: '', commands: ''},
      {name: 'GNU Go', path: '/usr/bin/gnugo', args: '', commands: ''},
    ]

    let {list, added} = mergeEngines(existing, incoming)

    assert.equal(added, 0)
    assert.equal(list.length, 2)
    assert.equal(list[0].path, '/new/katago')
    assert.equal(list[1].name, 'GNU Go')
  })

  it('tolerates a null list', () => {
    assert.equal(mergeEngines(null, incoming).list.length, 1)
  })
})

describe('buildEngineEntries', () => {
  it('builds beginner and full engines', () => {
    let engines = buildEngineEntries({
      dir: '/tmp/kata',
      binary: '/usr/bin/katago',
      fastNet: '/tmp/kata/networks/fast.txt.gz',
    })

    assert.deepEqual(
      engines.map((engine) => engine.name),
      ['KataGo (Beginner)', 'KataGo (Full)'],
    )
    assert.ok(engines[0].args.includes('gtp-beginner.cfg'))
    // Without a strong net, Full falls back to the fast one
    assert.ok(engines[1].args.includes('fast.txt.gz'))
  })

  it('adds one ranked engine per human rank', () => {
    let engines = buildEngineEntries({
      dir: '/tmp/kata',
      binary: '/usr/bin/katago',
      fastNet: '/tmp/kata/fast.gz',
      humanNet: '/tmp/kata/human.gz',
    })

    let humanEngines = engines.filter((engine) => engine.name.includes('Human'))

    assert.equal(humanEngines.length, HUMAN_RANKS.length)
    assert.ok(
      humanEngines.every((engine) => engine.args.includes('-human-model')),
    )
  })
})

describe('isAppImage', () => {
  it('detects the type-2 magic bytes at offset 8', () => {
    let dir = mkdtempSync(join(tmpdir(), 'frank-kata-'))
    let path = join(dir, 'katago')

    writeFileSync(
      path,
      // 8 bytes of ELF-ish header, then the AppImage magic at offset 8
      Buffer.concat([
        Buffer.from('\x7fELF\x02\x01\x01\x00', 'latin1'),
        Buffer.from('AI\x02rest', 'latin1'),
      ]),
    )
    assert.ok(isAppImage(path))
  })

  it('rejects plain binaries and missing files', () => {
    let dir = mkdtempSync(join(tmpdir(), 'frank-kata-'))
    let plain = join(dir, 'plain')

    writeFileSync(plain, 'just a regular executable, nothing to see')
    assert.ok(!isAppImage(plain))
    assert.ok(!isAppImage(join(dir, 'does-not-exist')))
  })
})

describe('extractAppImage', () => {
  it('passes plain binaries through untouched', () => {
    let dir = mkdtempSync(join(tmpdir(), 'frank-kata-'))
    let plain = join(dir, 'katago')

    writeFileSync(plain, '\x7fELF plain binary')
    assert.equal(extractAppImage(plain, dir), plain)
  })

  it('returns a previously extracted AppRun without re-running', () => {
    let dir = mkdtempSync(join(tmpdir(), 'frank-kata-'))
    let appImage = join(dir, 'katago')
    let appRun = join(dir, 'squashfs-root', 'AppRun')

    writeFileSync(
      appImage,
      Buffer.concat([
        Buffer.from('\x7fELF\x02\x01\x01\x00', 'latin1'),
        Buffer.from('AI\x02', 'latin1'),
      ]),
    )
    mkdirSync(join(dir, 'squashfs-root'), {recursive: true})
    writeFileSync(appRun, '#!/bin/sh\n')

    assert.equal(extractAppImage(appImage, dir), appRun)
  })
})

describe('writeConfigs', () => {
  it('writes valid configs including required resign keys', () => {
    let dir = mkdtempSync(join(tmpdir(), 'frank-kata-'))

    writeConfigs({dir, human: true})

    let beginner = readFileSync(join(dir, 'gtp-beginner.cfg'), 'utf8')
    // KataGo refuses to start without these keys even when resignation
    // is disabled (found the hard way)
    assert.ok(beginner.includes('resignThreshold'))
    assert.ok(beginner.includes('maxVisits = 24'))

    for (let rank of HUMAN_RANKS) {
      let config = readFileSync(join(dir, `gtp-human${rank}.cfg`), 'utf8')
      assert.ok(config.includes(`humanSLProfile = preaz_${rank}`))
    }

    assert.ok(existsSync(join(dir, 'logs')))
  })
})

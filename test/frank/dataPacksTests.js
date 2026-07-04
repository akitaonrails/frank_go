// Integrity tests for the bundled data packs: every game the indexes
// reference must exist, parse as SGF, and (for Hikaru) carry the fields
// the study UI relies on.

import assert from 'assert'
import {existsSync, readFileSync} from 'fs'
import {dirname, join} from 'path'
import sgf from '@sabaki/sgf'
import {locateData} from '../../src/frank/paths.js'
import {characterSlug} from '../../src/frank/castUtils.js'

function loadPack(subpath) {
  let indexPath = locateData(subpath)
  assert.ok(indexPath != null, `missing ${subpath}`)

  return {
    dir: dirname(indexPath),
    index: JSON.parse(readFileSync(indexPath, 'utf8')),
  }
}

describe('famous games pack', () => {
  let {dir, index} = loadPack(join('games', 'index.json'))

  it('has games with the fields the UI shows', () => {
    assert.ok(index.games.length >= 10)

    for (let game of index.games) {
      for (let field of ['file', 'title', 'date', 'result', 'why']) {
        assert.ok(game[field], `${game.file}: missing ${field}`)
      }
    }
  })

  it('every SGF exists and parses', () => {
    for (let game of index.games) {
      let path = join(dir, game.file)
      assert.ok(existsSync(path), `missing ${game.file}`)

      let roots = sgf.parse(readFileSync(path, 'utf8'))
      assert.ok(roots.length > 0, `${game.file}: unparseable`)
    }
  })

  it('the AlphaGo-Lee Sedol games carry move commentary', () => {
    // (the Ke Jie games have no commented versions in the source database)
    let alphago = index.games.filter((game) => game.file.includes('lee-sedol'))
    assert.ok(alphago.length >= 5)

    for (let game of alphago) {
      let text = readFileSync(join(dir, game.file), 'utf8')
      let afterFirstMove = text.slice(text.search(/;[BW]\[/))
      assert.ok(
        afterFirstMove.includes('C['),
        `${game.file}: expected commentary`,
      )
    }
  })
})

describe('hikaru pack', () => {
  let {dir, index} = loadPack(join('games', 'hikaru', 'index.json'))

  it('has the about text for the intro dialog', () => {
    assert.ok(index.about.length > 100)
  })

  it('every game has manga reference, trivia and a valid SGF', () => {
    assert.ok(index.games.length >= 15)

    for (let game of index.games) {
      for (let field of [
        'file',
        'manga',
        'title',
        'date',
        'result',
        'trivia',
      ]) {
        assert.ok(game[field], `${game.file}: missing ${field}`)
      }

      let path = join(dir, game.file)
      assert.ok(existsSync(path), `missing ${game.file}`)
      assert.ok(sgf.parse(readFileSync(path, 'utf8')).length > 0)
    }
  })

  it('cast members are listed in the portraits FILENAMES.txt', () => {
    let filenames = readFileSync(
      join(dir, 'portraits', 'FILENAMES.txt'),
      'utf8',
    )

    for (let game of index.games) {
      for (let member of game.cast || []) {
        let slug = characterSlug(member.name)
        let firstName = slug.split('-')[0]

        assert.ok(
          filenames.includes(`${slug}.png`) ||
            filenames.includes(`${firstName}.png`),
          `${member.name}: not documented in FILENAMES.txt`,
        )
      }
    }
  })
})

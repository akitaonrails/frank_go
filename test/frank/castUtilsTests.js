import assert from 'assert'
import {mkdtempSync, writeFileSync} from 'fs'
import {tmpdir} from 'os'
import {join} from 'path'
import {
  castInitials,
  characterSlug,
  findPortrait,
} from '../../src/frank/castUtils.js'

describe('characterSlug', () => {
  it('kebab-cases names', () => {
    assert.equal(characterSlug('Akira Toya'), 'akira-toya')
    assert.equal(characterSlug('Kuwabara Honinbo'), 'kuwabara-honinbo')
  })

  it('drops parentheticals', () => {
    assert.equal(characterSlug('Hikaru (Sai)'), 'hikaru')
  })

  it('handles punctuation', () => {
    assert.equal(characterSlug('The Rival Tutor'), 'the-rival-tutor')
  })
})

describe('castInitials', () => {
  it('takes up to two initials', () => {
    assert.equal(castInitials('Akira Toya'), 'AT')
    assert.equal(castInitials('Sai'), 'S')
    assert.equal(castInitials('The Rival Tutor'), 'TR')
  })

  it('ignores parentheticals', () => {
    assert.equal(castInitials('Hikaru (Sai)'), 'H')
  })
})

describe('findPortrait', () => {
  let dir = mkdtempSync(join(tmpdir(), 'frank-portraits-'))

  it('returns null when nothing matches', () => {
    assert.equal(findPortrait(dir, 'Akira Toya'), null)
  })

  it('finds full-name portraits in any supported format', () => {
    writeFileSync(join(dir, 'akira-toya.webp'), '')

    assert.equal(findPortrait(dir, 'Akira Toya'), join(dir, 'akira-toya.webp'))
  })

  it('falls back to the given name', () => {
    writeFileSync(join(dir, 'hikaru.png'), '')

    assert.equal(findPortrait(dir, 'Hikaru Shindo'), join(dir, 'hikaru.png'))
    assert.equal(findPortrait(dir, 'Hikaru (Sai)'), join(dir, 'hikaru.png'))
  })
})

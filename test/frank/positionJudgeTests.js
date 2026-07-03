import assert from 'assert'
import {describeVerdict} from '../../src/frank/positionJudge.js'

describe('describeVerdict', () => {
  it('describes a successful kill', () => {
    let text = describeVerdict({black: 'alive', white: 'dead'})

    assert.ok(text.includes('White stones look dead'))
    assert.ok(text.includes('Black looks alive'))
  })

  it('handles one-sided regions', () => {
    assert.equal(
      describeVerdict({black: 'dead', white: 'none'}),
      'Black stones look dead',
    )
  })

  it('handles empty regions', () => {
    assert.equal(
      describeVerdict({black: 'none', white: 'none'}),
      'No stones to judge yet.',
    )
  })
})

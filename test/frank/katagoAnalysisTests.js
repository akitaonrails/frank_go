import assert from 'assert'
import {parseScoreLeads} from '../../src/frank/katagoAnalysis.js'

describe('parseScoreLeads', () => {
  it('parses a multi-move kata-analyze line into coord → scoreLead', () => {
    let line =
      'info move Q16 visits 12 winrate 0.55 scoreLead 3.2 pv Q16 D4 ' +
      'info move D4 visits 8 winrate 0.48 scoreLead -1.1 pv D4 Q16'

    let scores = parseScoreLeads([line])
    assert.equal(scores.get('Q16'), 3.2)
    assert.equal(scores.get('D4'), -1.1)
  })

  it('keeps the richest (most candidates) line as analysis deepens', () => {
    let thin = 'info move Q16 visits 1 winrate 0.5 scoreLead 2 pv Q16'
    let rich =
      'info move Q16 visits 30 winrate 0.6 scoreLead 4 pv Q16 ' +
      'info move R16 visits 20 winrate 0.55 scoreLead 3 pv R16'

    let scores = parseScoreLeads([rich, thin])
    assert.equal(scores.size, 2)
    assert.equal(scores.get('Q16'), 4)
    assert.equal(scores.get('R16'), 3)
  })

  it('ignores non-info lines and non-strings', () => {
    let scores = parseScoreLeads([
      '= ',
      null,
      undefined,
      'random log output',
      'info move C3 visits 5 winrate 0.5 scoreLead -7.5 pv C3',
    ])
    assert.equal(scores.size, 1)
    assert.equal(scores.get('C3'), -7.5)
  })

  it('handles negative and decimal score leads', () => {
    let scores = parseScoreLeads([
      'info move A1 visits 1 winrate 0.5 scoreLead -0.5 pv A1',
    ])
    assert.equal(scores.get('A1'), -0.5)
  })

  it('returns an empty map when nothing parses', () => {
    assert.equal(parseScoreLeads([]).size, 0)
    assert.equal(parseScoreLeads(['no candidates here']).size, 0)
  })
})

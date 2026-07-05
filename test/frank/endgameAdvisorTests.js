import assert from 'assert'
import {
  MIN_MOVES_RESIGN,
  MIN_MOVES_SETTLED,
  RESIGN_CONSEC,
  RESIGN_LEAD,
  SETTLED_CONSEC,
  advise,
  formatLead,
} from '../../src/frank/endgameAdvisor.js'

function entries(leads, startMove = 100) {
  return leads.map((lead, i) => ({lead, moveNumber: startMove + i}))
}

describe('advise', () => {
  it('stays quiet with no history', () => {
    assert.equal(advise([], {playerSign: 1}).type, null)
  })

  it('stays quiet during the opening even when far behind', () => {
    let history = entries([-50, -50, -50], 10)

    assert.equal(advise(history, {playerSign: 1}).type, null)
  })

  it('hints resignation after a sustained hopeless deficit', () => {
    let history = entries(
      Array(RESIGN_CONSEC).fill(-(RESIGN_LEAD + 5)),
      MIN_MOVES_RESIGN,
    )

    let result = advise(history, {playerSign: 1})
    assert.equal(result.type, 'resign-hint')
    assert.ok(result.playerLead < 0)
  })

  it('does not hint resignation to the winning side', () => {
    // Black is 40 ahead — the White player would resign, not Black
    let history = entries(Array(RESIGN_CONSEC).fill(40), MIN_MOVES_RESIGN)

    assert.equal(advise(history, {playerSign: 1}).type, null)
    assert.equal(advise(history, {playerSign: -1}).type, 'resign-hint')
  })

  it('ignores a single bad estimate (no flicker)', () => {
    let history = entries([-40, -10, -40], MIN_MOVES_RESIGN)

    assert.equal(advise(history, {playerSign: 1}).type, null)
  })

  it('detects a settled endgame from stable estimates', () => {
    let history = entries(Array(SETTLED_CONSEC).fill(6.5), MIN_MOVES_SETTLED)

    assert.equal(advise(history, {playerSign: 1}).type, 'settled')
  })

  it('does not call a swinging game settled', () => {
    let history = entries([6.5, 12, 3, 8], MIN_MOVES_SETTLED)

    assert.equal(advise(history, {playerSign: 1}).type, null)
  })

  it('prefers the resign hint over settled when both hold', () => {
    let history = entries(
      Array(Math.max(RESIGN_CONSEC, SETTLED_CONSEC)).fill(-50),
      MIN_MOVES_SETTLED,
    )

    assert.equal(advise(history, {playerSign: 1}).type, 'resign-hint')
  })
})

describe('formatLead', () => {
  it('formats both colors and even results', () => {
    assert.equal(formatLead(3.4), 'B+3.5')
    assert.equal(formatLead(-12), 'W+12')
    assert.equal(formatLead(0.1), 'Even')
  })
})

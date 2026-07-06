import assert from 'assert'
import {
  hasHumanRanks,
  listKataGoEngines,
  selectKataGoEngine,
} from '../../src/frank/engineSelect.js'

let engines = [
  {name: 'GNU Go'},
  {name: 'KataGo (Beginner)'},
  {name: 'KataGo (Full)'},
  {name: 'KataGo (Human 5k)'},
]

describe('listKataGoEngines', () => {
  it('keeps only KataGo engines', () => {
    assert.deepEqual(
      listKataGoEngines(engines).map((e) => e.name),
      ['KataGo (Beginner)', 'KataGo (Full)', 'KataGo (Human 5k)'],
    )
  })

  it('is empty for no engines', () => {
    assert.deepEqual(listKataGoEngines([]), [])
    assert.deepEqual(listKataGoEngines(), [])
  })
})

describe('selectKataGoEngine', () => {
  it('honours an explicit preferred name first', () => {
    assert.equal(
      selectKataGoEngine(engines, 'KataGo (Full)').name,
      'KataGo (Full)',
    )
  })

  it('prefers the beginner engine when no preference is given', () => {
    assert.equal(selectKataGoEngine(engines).name, 'KataGo (Beginner)')
  })

  it('falls back to a human engine, then any KataGo', () => {
    let noBeginner = [{name: 'KataGo (Human 1d)'}, {name: 'KataGo (Full)'}]
    assert.equal(selectKataGoEngine(noBeginner).name, 'KataGo (Human 1d)')

    let onlyFull = [{name: 'KataGo (Full)'}]
    assert.equal(selectKataGoEngine(onlyFull).name, 'KataGo (Full)')
  })

  it('ignores a preferred name that is not present', () => {
    assert.equal(
      selectKataGoEngine(engines, 'Nonexistent').name,
      'KataGo (Beginner)',
    )
  })

  it('returns null when no KataGo engine exists', () => {
    assert.equal(selectKataGoEngine([{name: 'GNU Go'}]), null)
    assert.equal(selectKataGoEngine([]), null)
  })
})

describe('hasHumanRanks', () => {
  it('detects a human-imitation engine', () => {
    assert.equal(hasHumanRanks(engines), true)
    assert.equal(hasHumanRanks([{name: 'KataGo (Full)'}]), false)
    assert.equal(hasHumanRanks([]), false)
  })
})

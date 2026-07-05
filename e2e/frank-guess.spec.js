const {expect} = require('@playwright/test')
const {test} = require('./fixtures/electron-app')
const {loadSgfStringAndWait, waitForRender} = require('./helpers')

// Regression: entering guess mode in a study session used to crash the
// renderer because this.state.guessStats was never initialized, so the
// study footer threw reading `.hits` and broke the whole render tree.
const SGF =
  '(;GM[1]FF[4]CA[UTF-8]SZ[19]' +
  ';B[pd];W[dp];B[qp];W[dd];B[oq];W[qj];B[ql];W[qg];B[nc];W[rd])'

test('guess mode in a study session survives a wrong guess', async ({page}) => {
  let errors = []
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]))

  await loadSgfStringAndWait(page, SGF)

  await page.evaluate(() => {
    window.__sabaki.setState({
      frankStudy: {pack: 'famous', title: 'x', meta: '', text: '', cast: []},
      frankShowBeginnerOverlay: true,
    })
    window.__sabaki.goToMoveNumber(2)
    window.__sabaki.setMode('guess')
  })
  await waitForRender(page)

  // Wrong guess — must not crash; the point is remembered for the board
  // highlight, and NO stone is placed
  await page.evaluate(() => window.__sabaki.clickVertex([0, 0]))
  await waitForRender(page)

  let afterWrong = await page.evaluate(() => ({
    mode: window.__sabaki.state.mode,
    wrong: window.__sabaki.state.frankLastWrongGuess,
    level: window.__sabaki.inferredState.gameTree.getLevel(
      window.__sabaki.state.treePosition,
    ),
  }))
  expect(afterWrong.mode).toBe('guess')
  expect(afterWrong.wrong).toEqual([0, 0])
  expect(afterWrong.level).toBe(2)

  // Correct guess (the pro's actual next move) — places a stone, advances,
  // clears the wrong-guess highlight
  await page.evaluate(() => {
    let s = window.__sabaki
    let next = s.inferredState.gameTree.navigate(
      s.state.treePosition,
      1,
      s.state.gameCurrents[s.state.gameIndex],
    )
    let coord = next.data.B != null ? next.data.B[0] : next.data.W[0]
    s.clickVertex([coord.charCodeAt(0) - 97, coord.charCodeAt(1) - 97])
  })
  await waitForRender(page)

  let afterRight = await page.evaluate(() => ({
    level: window.__sabaki.inferredState.gameTree.getLevel(
      window.__sabaki.state.treePosition,
    ),
    wrong: window.__sabaki.state.frankLastWrongGuess,
  }))
  expect(afterRight.level).toBe(3)
  expect(afterRight.wrong).toBe(null)

  await page.evaluate(() => window.__sabaki.setMode('play'))
  await waitForRender(page)
  expect(await page.evaluate(() => window.__sabaki.state.mode)).toBe('play')

  expect(errors).toEqual([])
})

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

  // Wrong guess — must not crash
  await page.evaluate(() => window.__sabaki.clickVertex([0, 0]))
  await waitForRender(page)

  // Renderer still responsive and in guess mode
  let mode = await page.evaluate(() => window.__sabaki.state.mode)
  expect(mode).toBe('guess')

  // Can leave cleanly
  await page.evaluate(() => window.__sabaki.setMode('play'))
  await waitForRender(page)
  expect(await page.evaluate(() => window.__sabaki.state.mode)).toBe('play')

  expect(errors).toEqual([])
})

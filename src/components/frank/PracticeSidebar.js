// frank_go: beginner-friendly control panel, docked at the top of the
// right sidebar whenever a practice activity (tsumego or a KataGo game)
// is running. Replaces the old floating panel.

import {h, Component} from 'preact'
import classNames from 'classnames'
import i18n from '../../i18n.js'
import * as gametree from '../../modules/gametree.js'
import * as tsumegoSession from '../../frank/tsumegoSession.js'
import * as katagoPlay from '../../frank/katagoPlay.js'
import {
  describeVerdict,
  estimateScore,
  judgeRegion,
} from '../../frank/positionJudge.js'

const t = i18n.context('frank.practice')

const setting = {
  get: (key) => window.sabaki.setting.get(key),
  set: (key, value) => window.sabaki.setting.set(key, value),
}

export default class PracticeSidebar extends Component {
  constructor(props) {
    super(props)

    this.state = {busy: false, statusText: null}

    this.handleSolved = () => {
      this.setState({statusText: null})
      tsumegoSession.answer(true)
    }

    this.handleMissed = () => {
      this.setState({statusText: null})
      tsumegoSession.answer(false)
    }

    this.handleSkip = () => {
      this.setState({statusText: null})
      tsumegoSession.skipProblem()
    }

    this.handleRetry = () => {
      this.setState({statusText: null})
      tsumegoSession.retryProblem()
    }

    this.handleStopTsumego = () => tsumegoSession.stopPractice()

    this.handleToggleSparring = () =>
      tsumegoSession.setSparring(!this.props.frankTsumego.sparring)

    this.handleCheckPosition = async () => {
      let {gameTree, treePosition, frankTsumego} = this.props
      if (frankTsumego == null) return

      this.setState({busy: true, statusText: t('Judging…')})

      let board = gametree.getBoard(gameTree, treePosition)
      let verdict = await judgeRegion(board, frankTsumego.problem.region)

      this.setState({
        busy: false,
        statusText: `${describeVerdict(verdict)} — ${t('your call!')}`,
      })
    }

    this.handleEstimateScore = async () => {
      this.setState({busy: true, statusText: t('Estimating…')})

      let board = katagoPlay.currentBoard()
      let {komi, handicap} = katagoPlay.gameScoringInfo()
      let {scoreText} = await estimateScore(board, {komi, handicap})

      this.setState({
        busy: false,
        statusText: `${t('Estimated score:')} ${scoreText}`,
      })
    }

    this.handleUndo = () => {
      this.setState({statusText: null})
      katagoPlay.undoMove()
    }

    this.handlePass = () => katagoPlay.passMove()

    this.handleRestart = () => {
      this.setState({statusText: null})
      katagoPlay.restartGame()
    }

    this.handleStopGame = () => katagoPlay.stopGame()

    this.handleToggleOverlay = () =>
      setting.set(
        'frank.show_beginner_overlay',
        !setting.get('frank.show_beginner_overlay'),
      )
  }

  componentWillReceiveProps(nextProps) {
    // Judgments/estimates describe a position — drop them when the
    // problem changes.
    let prevId = this.props.frankTsumego?.problem?.id
    let nextId = nextProps.frankTsumego?.problem?.id

    if (prevId !== nextId) {
      this.setState({statusText: null})
    }
  }

  renderOverlayToggle() {
    return h(
      'label',
      {class: 'overlay-toggle'},
      h('input', {
        type: 'checkbox',
        checked: !!this.props.frankShowBeginnerOverlay,
        onChange: this.handleToggleOverlay,
      }),
      ' ',
      t('Show area painting'),
    )
  }

  renderStatus() {
    if (this.state.statusText == null) return null

    return h('p', {class: 'status-text'}, this.state.statusText)
  }

  renderTsumego(tsumego) {
    let {problem, progress, streakTarget, sessionStats, sparring, lastEvent} =
      tsumego
    let toPlayLabel =
      problem.toPlay === 'W' ? t('White to play') : t('Black to play')

    let streakDots = [...Array(streakTarget)].map((_, i) =>
      h('span', {
        class: classNames('dot', {filled: i < progress.streak}),
      }),
    )

    return h(
      'div',
      {class: 'activity tsumego'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, t('Tsumego Practice')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopTsumego},
          t('quit'),
        ),
      ),

      h(
        'div',
        {class: 'levelrow'},
        h('span', {class: 'level'}, t('Level'), ' ', progress.level, '/10'),
        h(
          'span',
          {class: 'dots', title: t('Solve 5 in a row to level up')},
          streakDots,
        ),
        lastEvent != null &&
          h(
            'span',
            {class: classNames('event', lastEvent)},
            lastEvent === 'level-up' ? t('Level up!') : t('Level down'),
          ),
      ),

      h(
        'div',
        {class: 'problem'},
        h(
          'span',
          {class: classNames('toplay', {white: problem.toPlay === 'W'})},
          toPlayLabel,
        ),
        h('span', {class: 'name'}, problem.title),
      ),

      h(
        'p',
        {class: 'guide'},
        sparring
          ? t(
              'Play your move — KataGo will answer. When the fight is settled, grade yourself:',
            )
          : t(
              'Play out your line on the board (both colors), then grade yourself:',
            ),
      ),

      h(
        'div',
        {class: 'actions main'},
        h(
          'button',
          {class: 'solved', onClick: this.handleSolved},
          '✓ ',
          t('Solved'),
        ),
        h(
          'button',
          {class: 'missed', onClick: this.handleMissed},
          '✗ ',
          t('Missed'),
        ),
      ),

      h(
        'div',
        {class: 'actions'},
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleCheckPosition},
          t('Check position'),
        ),
        h('button', {onClick: this.handleRetry}, t('Reset')),
        h('button', {onClick: this.handleSkip}, t('Skip')),
      ),

      this.renderStatus(),

      h(
        'p',
        {class: 'session'},
        t('This session:'),
        ` ${sessionStats.solved} ✓ · ${sessionStats.missed} ✗`,
      ),

      h(
        'label',
        {class: 'overlay-toggle'},
        h('input', {
          type: 'checkbox',
          checked: sparring,
          onChange: this.handleToggleSparring,
        }),
        ' ',
        t('KataGo answers my moves'),
      ),

      this.renderOverlayToggle(),
    )
  }

  renderKatagoGame(game) {
    let youLabel =
      game.playerSign > 0
        ? t('You play Black') + ' ⚫'
        : t('You play White') + ' ⚪'

    return h(
      'div',
      {class: 'activity katago'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, t('Playing KataGo')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopGame},
          t('quit'),
        ),
      ),

      h('p', {class: 'guide'}, `${youLabel} · ${game.engineName}`),

      h(
        'div',
        {class: 'actions'},
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleEstimateScore},
          t('Estimate score'),
        ),
        h('button', {onClick: this.handleUndo}, t('Undo')),
        h('button', {onClick: this.handlePass}, t('Pass')),
        h('button', {onClick: this.handleRestart}, t('Restart')),
      ),

      this.renderStatus(),

      h(
        'p',
        {class: 'session'},
        t('Rewind with the arrow keys or the graph below.'),
      ),

      this.renderOverlayToggle(),
    )
  }

  render({frankTsumego, frankKatagoGame}) {
    if (frankTsumego == null && frankKatagoGame == null) return null

    return h(
      'section',
      {id: 'frank-practice-sidebar'},
      frankTsumego != null
        ? this.renderTsumego(frankTsumego)
        : this.renderKatagoGame(frankKatagoGame),
    )
  }
}

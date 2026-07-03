// frank_go: beginner-friendly control panel, docked at the top of the
// right sidebar whenever a practice activity (tsumego or a KataGo game)
// is running. Replaces the old floating panel.

import {h, Component} from 'preact'
import classNames from 'classnames'
import i18n from '../../i18n.js'
import * as gametree from '../../modules/gametree.js'
import * as tsumegoSession from '../../frank/tsumegoSession.js'
import {LEVEL_RANKS} from '../../frank/tsumegoSession.js'
import * as katagoPlay from '../../frank/katagoPlay.js'
import * as famousGames from '../../frank/famousGames.js'
import * as sabakiDialog from '../../modules/dialog.js'
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

    this.handleNextNow = () => tsumegoSession.continueAfterSolve()

    this.handleLevelDown = () => {
      let {frankTsumego} = this.props
      if (frankTsumego != null)
        tsumegoSession.setLevel(frankTsumego.progress.level - 1)
    }

    this.handleLevelUp = () => {
      let {frankTsumego} = this.props
      if (frankTsumego != null)
        tsumegoSession.setLevel(frankTsumego.progress.level + 1)
    }

    this.handleEngineChoice = (evt) => {
      katagoPlay.setPreferredEngine(evt.currentTarget.value)
      this.forceUpdate()
    }

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

    this.handleStartTsumego = () => tsumegoSession.startPractice()

    this.handlePlayBlack = () => katagoPlay.playAgainstKataGo(1)

    this.handlePlayWhite = () => katagoPlay.playAgainstKataGo(-1)

    this.handleStudyGame = async () => {
      this.setState({busy: true})

      let game = await famousGames.studyRandomGame('famous')

      this.setState({
        busy: false,
        statusText:
          game == null
            ? t('Could not find the famous games pack.')
            : `${game.title} (${game.date}, ${game.result}) — ${game.why}`,
      })
    }

    this.hikaruAboutShown = false

    this.handleStudyHikaru = async () => {
      // First time: explain that the manga games are real pro games.
      if (!this.hikaruAboutShown) {
        this.hikaruAboutShown = true
        let about = famousGames.packAbout('hikaru')

        if (about != null) {
          await sabakiDialog.showMessageBox(about, 'info', [t('Let me see!')])
        }
      }

      this.setState({busy: true})

      let game = await famousGames.studyRandomGame('hikaru')

      this.setState({
        busy: false,
        statusText:
          game == null
            ? t('Could not find the Hikaru no Go pack.')
            : `${game.manga} · ${game.title} (${game.result}) — ${game.trivia}`,
      })
    }

    this.handleHidePanel = () => {
      this.setState({statusText: null})
      setting.set('frank.show_home_panel', false)
    }
  }

  componentWillReceiveProps(nextProps) {
    // Judgments/estimates/stories describe a position — drop them when the
    // problem or the kind of activity changes.
    let activity = (props) =>
      props.frankTsumego != null
        ? `tsumego:${props.frankTsumego.problem.id}`
        : props.frankKatagoGame != null
          ? 'katago'
          : 'home'

    if (activity(this.props) !== activity(nextProps)) {
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
    let {
      problem,
      progress,
      streakTarget,
      sessionStats,
      sparring,
      autoVerdict,
      lastEvent,
    } = tsumego
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
        h('span', {class: 'title'}, '🧩 ', t('Tsumego Practice')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopTsumego},
          t('quit'),
        ),
      ),

      h(
        'div',
        {class: 'levelrow'},
        h(
          'button',
          {
            class: 'levelstep',
            title: t('Easier problems'),
            disabled: progress.level <= 1,
            onClick: this.handleLevelDown,
          },
          '−',
        ),
        h(
          'span',
          {class: 'level', title: t('Choose your difficulty')},
          t('Level'),
          ' ',
          progress.level,
          ` (${LEVEL_RANKS[progress.level]})`,
        ),
        h(
          'button',
          {
            class: 'levelstep',
            title: t('Harder problems'),
            disabled: progress.level >= 10,
            onClick: this.handleLevelUp,
          },
          '+',
        ),
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

      // frank_go: automatic verdict banner (engine tenuki + region judge)
      autoVerdict != null &&
        h(
          'p',
          {class: classNames('auto-verdict', autoVerdict.result)},
          autoVerdict.result === 'solved' ? '✓ ' : '✗ ',
          t(autoVerdict.text),
        ),

      autoVerdict == null &&
        h(
          'p',
          {class: 'guide'},
          sparring
            ? t(
                'Play your move — KataGo answers. Solve the position and it is graded automatically.',
              )
            : t(
                'Play out your line on the board (both colors), then grade yourself:',
              ),
        ),

      // frank_go: with a sparring engine the grading is automatic — no
      // manual buttons, just a "Next now" shortcut on success. Without an
      // engine the player self-grades.
      sparring
        ? autoVerdict != null &&
            autoVerdict.result === 'solved' &&
            h(
              'div',
              {class: 'actions main'},
              h(
                'button',
                {class: 'solved', onClick: this.handleNextNow},
                t('Next problem'),
                ' →',
              ),
            )
        : h(
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
        h('span', {class: 'title'}, '⚔️ ', t('Playing KataGo')),
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

  renderHome() {
    let level = setting.get('frank.tsumego_level') || 1
    let engines = katagoPlay.listKataGoEngines()
    let hasKatago = engines.length > 0
    let chosenEngine = katagoPlay.findKataGoEngine()

    return h(
      'div',
      {class: 'activity home'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, '⚫⚪ ', t('Practice')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleHidePanel},
          t('hide'),
        ),
      ),

      h('p', {class: 'guide'}, t('Welcome! What shall we play today?')),

      h(
        'div',
        {class: 'actions start'},
        h(
          'button',
          {class: 'primary', onClick: this.handleStartTsumego},
          `🧩 ${t('Tsumego practice')} · ${t('Level')} ${level}`,
        ),
      ),

      hasKatago
        ? h(
            'div',
            {class: 'katago-start'},
            engines.length > 1 &&
              h(
                'label',
                {class: 'strength'},
                t('Opponent:'),
                ' ',
                h(
                  'select',
                  {
                    value: chosenEngine != null ? chosenEngine.name : '',
                    onChange: this.handleEngineChoice,
                  },
                  engines.map((engine) =>
                    h('option', {value: engine.name}, engine.name),
                  ),
                ),
              ),
            h(
              'div',
              {class: 'actions start'},
              h(
                'button',
                {onClick: this.handlePlayBlack},
                `⚫ ${t('Play KataGo')} — ${t('you take Black')}`,
              ),
              h(
                'button',
                {onClick: this.handlePlayWhite},
                `⚪ ${t('Play KataGo')} — ${t('you take White')}`,
              ),
            ),
            engines.length <= 2 &&
              h(
                'p',
                {class: 'session'},
                t(
                  'Tip: `npm run frank:katago -- --human` adds human-like ranked opponents (15k / 5k / 1d).',
                ),
              ),
          )
        : h(
            'p',
            {class: 'session'},
            t('To play against KataGo, run: npm run frank:katago'),
          ),

      h(
        'div',
        {class: 'actions start'},
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleStudyGame},
          '📖 ' + t('Study a famous game'),
        ),
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleStudyHikaru},
          '🎌 ' + t('Hikaru no Go game'),
        ),
      ),

      this.renderStatus(),

      this.renderOverlayToggle(),
    )
  }

  render({frankTsumego, frankKatagoGame, frankShowHomePanel}) {
    let content =
      frankTsumego != null
        ? this.renderTsumego(frankTsumego)
        : frankKatagoGame != null
          ? this.renderKatagoGame(frankKatagoGame)
          : frankShowHomePanel !== false
            ? this.renderHome()
            : null

    if (content == null) return null

    return h('section', {id: 'frank-practice-sidebar'}, content)
  }
}

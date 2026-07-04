// frank_go: beginner-friendly control panel, docked in the right sidebar.
// Shows the start menu when idle and the controls of the running activity
// (tsumego / KataGo game / study) otherwise. The panel is a flex column:
// main controls on top, toggles and the Back button pinned to the bottom
// of the sidebar (the sidebar fills the full height when the graph and
// comment areas are hidden).

import {h, Component} from 'preact'
import classNames from 'classnames'
import i18n from '../../i18n.js'
import sabaki from '../../modules/sabaki.js'
import * as gametree from '../../modules/gametree.js'
import {isTextLikeElement} from '../../modules/helper.js'
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
          game == null ? t('Could not find the famous games pack.') : null,
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
          game == null ? t('Could not find the Hikaru no Go pack.') : null,
      })
    }

    this.handleStopStudy = () => famousGames.stopStudy()

    this.handleAnotherStudyGame = async () => {
      let pack =
        this.props.frankStudy != null ? this.props.frankStudy.pack : 'famous'
      this.setState({busy: true})
      await famousGames.studyRandomGame(pack)
      this.setState({busy: false})
    }

    this.handleHidePanel = () => {
      this.setState({statusText: null})
      setting.set('frank.show_home_panel', false)
    }

    // Study mode: Space steps forward, Backspace rewinds.
    this.handleKeyDown = (evt) => {
      if (this.props.frankStudy == null) return
      if (isTextLikeElement(document.activeElement)) return

      if (evt.key === ' ') {
        evt.preventDefault()
        sabaki.goStep(1)
      } else if (evt.key === 'Backspace') {
        evt.preventDefault()
        sabaki.goStep(-1)
      }
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  componentWillReceiveProps(nextProps) {
    // Judgments/estimates/stories describe a position — drop them when the
    // problem or the kind of activity changes.
    let activity = (props) =>
      props.frankTsumego != null
        ? `tsumego:${props.frankTsumego.problem.id}`
        : props.frankKatagoGame != null
          ? 'katago'
          : props.frankStudy != null
            ? 'study'
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
      h('span', {class: 'text'}, '🎨 ', t('Area painting')),
      h('span', {class: 'shortcut'}, 'Ctrl+Shift+B'),
    )
  }

  renderSparringToggle(sparring) {
    return h(
      'label',
      {class: 'overlay-toggle'},
      h('input', {
        type: 'checkbox',
        checked: sparring,
        onChange: this.handleToggleSparring,
      }),
      h('span', {class: 'text'}, '🤖 ', t('KataGo answers my moves')),
    )
  }

  renderBackButton(onClick) {
    return h(
      'div',
      {class: 'actions'},
      h('button', {class: 'back', onClick}, '⬅ ', t('Back to menu')),
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

    let main = h(
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
          'span',
          {class: 'stepper'},
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
        ),
        h(
          'span',
          {class: 'dots', title: t('Solve 5 in a row to level up')},
          streakDots,
        ),
      ),

      h(
        'p',
        {class: 'ranknote'},
        `${LEVEL_RANKS[progress.level]} · ${t('solve 5 in a row to level up')}`,
        lastEvent != null &&
          h(
            'span',
            {class: classNames('event', lastEvent)},
            ' ',
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

      // With a sparring engine the grading is automatic — no manual
      // buttons, just a "Next now" shortcut on success. Without an engine
      // the player self-grades.
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
    )

    let footer = [
      h(
        'p',
        {class: 'session'},
        t('This session:'),
        ` ${sessionStats.solved} ✓ · ${sessionStats.missed} ✗`,
      ),
      this.renderSparringToggle(sparring),
      this.renderOverlayToggle(),
      this.renderBackButton(this.handleStopTsumego),
    ]

    return {main, footer}
  }

  renderKatagoGame(game) {
    let youLabel =
      game.playerSign > 0
        ? t('You play Black') + ' ⚫'
        : t('You play White') + ' ⚪'

    let main = h(
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
    )

    let footer = [
      h(
        'p',
        {class: 'session'},
        t('Rewind with the arrow keys or the graph below.'),
      ),
      this.renderOverlayToggle(),
      this.renderBackButton(this.handleStopGame),
    ]

    return {main, footer}
  }

  renderCastMember(member) {
    return h(
      'div',
      {class: 'castmember'},
      member.portrait != null
        ? h('img', {class: 'portrait', src: member.portrait, alt: member.name})
        : h(
            'span',
            {
              class: classNames('medallion', {
                white: member.color === 'W',
              }),
            },
            member.initials,
          ),
      h('span', {class: 'castname'}, member.name),
    )
  }

  renderCast(cast) {
    if (cast == null || cast.length === 0) return null

    return h(
      'div',
      {class: 'cast'},
      this.renderCastMember(cast[0]),
      cast.length > 1 && h('span', {class: 'vs'}, t('vs')),
      cast.length > 1 && this.renderCastMember(cast[1]),
    )
  }

  renderStudy(study) {
    let main = h(
      'div',
      {class: 'activity study'},

      h(
        'div',
        {class: 'header'},
        h(
          'span',
          {class: 'title'},
          study.pack === 'hikaru' ? '🎌 ' : '📖 ',
          t('Studying'),
        ),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopStudy},
          t('quit'),
        ),
      ),

      this.renderCast(study.cast),

      h('p', {class: 'guide'}, study.description),

      h(
        'div',
        {class: 'actions'},
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleAnotherStudyGame},
          t('Another game'),
        ),
      ),

      this.renderStatus(),
    )

    let footer = [
      h(
        'p',
        {class: 'session'},
        t('Space / ← → step through the moves, Backspace rewinds.'),
      ),
      this.renderOverlayToggle(),
      this.renderBackButton(this.handleStopStudy),
    ]

    return {main, footer}
  }

  renderHome() {
    let level = setting.get('frank.tsumego_level') || 1
    let engines = katagoPlay.listKataGoEngines()
    let hasKatago = engines.length > 0
    let chosenEngine = katagoPlay.findKataGoEngine()

    let main = h(
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
    )

    let footer = [
      hasKatago &&
        engines.length <= 2 &&
        h(
          'p',
          {class: 'session'},
          t(
            'Tip: `npm run frank:katago -- --human` adds human-like ranked opponents (15k / 5k / 1d).',
          ),
        ),
      this.renderOverlayToggle(),
    ]

    return {main, footer}
  }

  render({frankTsumego, frankKatagoGame, frankStudy, frankShowHomePanel}) {
    let view =
      frankTsumego != null
        ? this.renderTsumego(frankTsumego)
        : frankKatagoGame != null
          ? this.renderKatagoGame(frankKatagoGame)
          : frankStudy != null
            ? this.renderStudy(frankStudy)
            : frankShowHomePanel !== false
              ? this.renderHome()
              : null

    if (view == null) return null

    return h(
      'section',
      {id: 'frank-practice-sidebar'},
      h('div', {class: 'panel-main'}, view.main),
      h('div', {class: 'panel-footer'}, ...view.footer),
    )
  }
}

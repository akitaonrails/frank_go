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
import * as sound from '../../modules/sound.js'
import * as tsumegoSession from '../../frank/tsumegoSession.js'
import {LEVEL_RANKS} from '../../frank/tsumegoSession.js'
import {FOCUS_LABELS} from '../../frank/tsumegoProgress.js'
import * as katagoPlay from '../../frank/katagoPlay.js'
import * as famousGames from '../../frank/famousGames.js'
import * as scoreDrill from '../../frank/scoreDrill.js'
import * as ladderSession from '../../frank/ladderSession.js'
import * as rankTest from '../../frank/rankTest.js'
import * as bulkGames from '../../frank/bulkGames.js'
import * as sabakiDialog from '../../modules/dialog.js'
import {
  describeVerdict,
  estimateScore,
  judgeRegion,
} from '../../frank/positionJudge.js'
import {setting} from '../../frank/env.js'
import {advise, formatLead} from '../../frank/endgameAdvisor.js'
import sgfLib from '@sabaki/sgf'
import {nameForMove} from '../../frank/moveNames.js'

const t = i18n.context('frank.practice')

// Study auto-play: one move every couple of seconds
const AUTO_PLAY_INTERVAL = 2000

export default class PracticeSidebar extends Component {
  constructor(props) {
    super(props)

    this.state = {
      busy: false,
      statusText: null,
      autoPlaying: false,
      liveScore: null,
    }

    this.scoreHistory = []
    this.liveScoreTimer = null

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

    this.handleFocusChoice = (evt) =>
      tsumegoSession.setFocus(evt.currentTarget.value)

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

    this.updateLiveScore = async () => {
      let game = this.props.frankKatagoGame
      if (game == null) return

      let {gameTree, treePosition} = this.props
      let moveNumber = gameTree.getLevel(treePosition)
      let board = katagoPlay.currentBoard()
      let {komi, handicap} = katagoPlay.gameScoringInfo()
      let {territoryScore} = await estimateScore(board, {komi, handicap})

      if (this.props.frankKatagoGame == null) return

      // Undo/restart rewinds the game — drop stale history
      let last = this.scoreHistory[this.scoreHistory.length - 1]
      if (last != null && moveNumber <= last.moveNumber) {
        this.scoreHistory = this.scoreHistory.filter(
          (entry) => entry.moveNumber < moveNumber,
        )
      }

      this.scoreHistory.push({lead: territoryScore, moveNumber})

      this.setState({
        liveScore: {
          lead: territoryScore,
          advice: advise(this.scoreHistory, {playerSign: game.playerSign}),
        },
      })
    }

    this.scheduleLiveScore = () => {
      clearTimeout(this.liveScoreTimer)
      this.liveScoreTimer = setTimeout(() => {
        this.updateLiveScore().catch(() => {})
      }, 400)
    }

    this.handleResignGame = () => {
      sabaki.makeResign()
      katagoPlay.stopGame()
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

    this.handleToggleMenuBar = () =>
      setting.set('view.show_menubar', !setting.get('view.show_menubar'))

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

    this.handleStudyJoseki = async () => {
      this.setState({busy: true})
      let ok = await famousGames.studyJoseki()
      this.setState({
        busy: false,
        statusText:
          ok == null ? t('Could not find the joseki dictionary.') : null,
      })
    }

    this.handleToggleGuess = () => {
      sabaki.setMode(this.props.mode === 'guess' ? 'play' : 'guess')
    }

    this.handleAnotherStudyGame = async () => {
      let pack =
        this.props.frankStudy != null ? this.props.frankStudy.pack : 'famous'
      this.setState({busy: true})
      await famousGames.studyRandomGame(pack)
      this.setState({busy: false})
    }

    this.handleStartScoreDrill = async () => {
      this.setState({busy: true})
      await scoreDrill.startDrill()
      this.setState({busy: false})
    }

    this.handleScoreAnswer = (choice) => () => scoreDrill.answer(choice)

    this.handleScoreNext = async () => {
      this.setState({busy: true})
      await scoreDrill.nextPosition()
      this.setState({busy: false})
    }

    this.handleStopScoreDrill = () => scoreDrill.stopDrill()

    this.handleFetchBulk = async () => {
      this.setState({busy: true})
      try {
        await bulkGames.fetchBulkGames(({step, fraction}) => {
          this.setState({
            statusText: `${t(step)}: ${Math.round(fraction * 100)}%`,
          })
        })
        this.setState({statusText: t('Done — endless variety unlocked!')})
      } catch (err) {
        this.setState({statusText: t('Download failed:') + ' ' + err.message})
      }
      this.setState({busy: false})
    }

    this.handleStartLadderDrill = async () => {
      this.setState({busy: true})
      await ladderSession.startDrill()
      this.setState({busy: false})
    }

    this.handleLadderAnswer = (guess) => () => ladderSession.answer(guess)

    this.handleLadderWatch = async () => {
      this.setState({busy: true})
      await ladderSession.watchItRun()
      this.setState({busy: false})
    }

    this.handleLadderNext = async () => {
      this.setState({busy: true})
      await ladderSession.nextLadder()
      this.setState({busy: false})
    }

    this.handleStopLadderDrill = () => ladderSession.stopDrill()

    this.handleStartRankTest = async () => {
      this.setState({busy: true})
      await rankTest.startTest()
      this.setState({busy: false})
    }

    this.handleRankPractice = () => rankTest.practiceAtResult()

    this.handleStopRankTest = () => rankTest.stopTest()

    this.handleHidePanel = () => {
      this.setState({statusText: null})
      setting.set('frank.show_home_panel', false)
    }

    this.setupProgress = ({step, fraction}) => {
      this.setState({
        statusText: `${t('Setting up KataGo')} — ${t(step)}: ${Math.round(
          fraction * 100,
        )}%`,
      })
    }

    this.handleSetupKatago = async () => {
      this.setState({busy: true})
      let ok = await katagoPlay.setupKataGo({onProgress: this.setupProgress})
      this.setState({
        busy: false,
        statusText: ok ? t('KataGo is ready — have fun!') : null,
      })
    }

    this.handleSetupHumanRanks = async () => {
      this.setState({busy: true})
      let ok = await katagoPlay.setupKataGo({
        human: true,
        onProgress: this.setupProgress,
      })
      this.setState({
        busy: false,
        statusText: ok ? t('Ranked opponents installed!') : null,
      })
    }

    // Study mode keys: Enter auto-plays the game (one move every couple
    // of seconds), Space pauses auto-play (or steps forward when paused),
    // Backspace pauses and rewinds.
    this.autoPlayTimer = null

    this.startAutoPlay = () => {
      this.stopAutoPlay()
      this.setState({autoPlaying: true})
      sabaki.goStep(1)

      this.autoPlayTimer = setInterval(() => {
        let {frankStudy, gameTree, treePosition} = this.props
        let atEnd = gameTree.getLevel(treePosition) >= gameTree.getHeight() - 1

        if (frankStudy == null || atEnd) {
          this.stopAutoPlay()
          return
        }

        sabaki.goStep(1)
      }, AUTO_PLAY_INTERVAL)
    }

    this.stopAutoPlay = () => {
      if (this.autoPlayTimer != null) {
        clearInterval(this.autoPlayTimer)
        this.autoPlayTimer = null
      }

      if (this.state.autoPlaying) this.setState({autoPlaying: false})
    }

    this.handleToggleAutoPlay = () => {
      if (this.state.autoPlaying) {
        this.stopAutoPlay()
      } else {
        this.startAutoPlay()
      }
    }

    this.handleKeyDown = (evt) => {
      if (this.props.frankStudy == null) return
      if (this.props.mode === 'guess') return
      if (isTextLikeElement(document.activeElement)) return

      if (evt.key === 'Enter') {
        evt.preventDefault()
        this.startAutoPlay()
      } else if (evt.key === ' ') {
        evt.preventDefault()

        if (this.state.autoPlaying) {
          this.stopAutoPlay()
        } else {
          sabaki.goStep(1)
        }
      } else if (evt.key === 'Backspace') {
        evt.preventDefault()
        this.stopAutoPlay()
        sabaki.goStep(-1)
      }
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown)

    // Apply the persisted menu-bar visibility at startup — Sabaki only
    // reacts to changes, and the BrowserWindow autoHideMenuBar option
    // alone doesn't reliably hide it on every platform.
    if (!setting.get('view.show_menubar')) {
      window.sabaki.window.setMenuBarVisibility(false)
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
    this.stopAutoPlay()
    clearTimeout(this.liveScoreTimer)
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
            : props.frankScoreDrill != null
              ? 'scoredrill'
              : props.frankLadderDrill != null
                ? 'ladderdrill'
                : props.frankRankTest != null
                  ? 'ranktest'
                  : 'home'

    if (activity(this.props) !== activity(nextProps)) {
      this.setState({statusText: null})
      if (nextProps.frankStudy == null) this.stopAutoPlay()

      if (activity(nextProps) === 'katago') {
        this.scoreHistory = []
        this.setState({liveScore: null})
        this.scheduleLiveScore()
      } else {
        clearTimeout(this.liveScoreTimer)
        this.setState({liveScore: null})
      }
    } else if (
      nextProps.frankKatagoGame != null &&
      nextProps.treePosition !== this.props.treePosition
    ) {
      this.scheduleLiveScore()
    }

    // Friendly right/wrong feedback while guessing the pro's moves
    if (
      this.props.frankStudy != null &&
      nextProps.frankStudy != null &&
      nextProps.mode === 'guess'
    ) {
      let prevBlocked = (this.props.blockedGuesses || []).length
      let nextBlocked = (nextProps.blockedGuesses || []).length
      let prevLevel = this.props.gameTree.getLevel(this.props.treePosition)
      let nextLevel = nextProps.gameTree.getLevel(nextProps.treePosition)

      if (nextBlocked > prevBlocked) {
        this.setState(({guessStats}) => ({
          statusText:
            '✗ ' + t('Not there — the pro chose another point. Try again!'),
          guessStats: {...guessStats, misses: guessStats.misses + 1},
        }))
      } else if (nextLevel === prevLevel + 1) {
        this.setState(({guessStats}) => ({
          statusText: '✓ ' + t('Spot on — exactly where the pro played!'),
          guessStats: {...guessStats, hits: guessStats.hits + 1},
        }))
      }
    } else if (this.props.mode === 'guess' && nextProps.mode !== 'guess') {
      this.setState({statusText: null, guessStats: {hits: 0, misses: 0}})
    }

    // Stone sounds while replaying a study game. Sabaki only plays sounds
    // for moves being *made*; stepping through a record is silent
    // upstream, but hearing the stones makes auto-play feel alive.
    if (
      this.props.frankStudy != null &&
      nextProps.frankStudy != null &&
      nextProps.treePosition !== this.props.treePosition &&
      setting.get('sound.enable')
    ) {
      let prevLevel = this.props.gameTree.getLevel(this.props.treePosition)
      let nextLevel = nextProps.gameTree.getLevel(nextProps.treePosition)

      // Single forward step only — jumps through the graph stay quiet
      if (nextLevel === prevLevel + 1) {
        let prevBoard = gametree.getBoard(
          this.props.gameTree,
          this.props.treePosition,
        )
        let nextBoard = gametree.getBoard(
          nextProps.gameTree,
          nextProps.treePosition,
        )
        let captured = [1, -1].some(
          (sign) => nextBoard.getCaptures(sign) > prevBoard.getCaptures(sign),
        )

        sound.playPachi()
        if (captured) sound.playCapture()
      }
    }
  }

  // "Hane", "Attachment", "One-Point Jump"… via Sabaki's bundled
  // boardmatcher (the same engine behind the comment box's move
  // interpretation); falls back to the a-b point name in the opening.
  moveName(gameTree, treePosition) {
    let node = gameTree.get(treePosition)
    if (node == null || node.parentId == null) return null

    let sign, vertex
    if (node.data.B != null && node.data.B[0] !== '') {
      sign = 1
      vertex = sgfLib.parseVertex(node.data.B[0])
    } else if (node.data.W != null && node.data.W[0] !== '') {
      sign = -1
      vertex = sgfLib.parseVertex(node.data.W[0])
    } else {
      return null
    }

    let prevBoard = gametree.getBoard(gameTree, node.parentId)
    let name = nameForMove(prevBoard, sign, vertex)

    return name == null ? null : {name, sign}
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

  renderMenuBarToggle() {
    return h(
      'label',
      {class: 'overlay-toggle'},
      h('input', {
        type: 'checkbox',
        checked: !!this.props.showMenuBar,
        onChange: this.handleToggleMenuBar,
      }),
      h('span', {class: 'text'}, '☰ ', t('Menu bar')),
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
      grading,
      credit,
      focus,
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
        'label',
        {class: 'strength focusrow'},
        t('Focus:'),
        ' ',
        h(
          'select',
          {value: focus, onChange: this.handleFocusChoice},
          Object.entries(FOCUS_LABELS).map(([value, label]) =>
            h('option', {value}, t(label)),
          ),
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
          grading === 'exact'
            ? t(
                'This problem knows its answer: play your move and it responds. Wrong moves are corrected with an explanation.',
              )
            : sparring
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
      grading !== 'manual'
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
      credit != null && h('p', {class: 'session credit'}, credit),
      grading !== 'exact' && this.renderSparringToggle(sparring),
      this.renderOverlayToggle(),
      this.renderMenuBarToggle(),
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

      (() => {
        // While hovering, preview what YOUR move there would be called;
        // otherwise show the last move played
        let hover = this.props.frankHoverMove

        if (hover != null) {
          return h(
            'p',
            {class: 'movename hover'},
            `${t('This would be:')} `,
            h('strong', null, t(hover.name)),
          )
        }

        let move = this.moveName(this.props.gameTree, this.props.treePosition)
        if (move == null) return null

        let who = move.sign === game.playerSign ? t('you') : t('KataGo')
        return h(
          'p',
          {class: 'movename'},
          `${t('Last move:')} `,
          h('strong', null, t(move.name)),
          ` (${who})`,
        )
      })(),

      this.state.liveScore != null &&
        h(
          'p',
          {class: 'livescore'},
          t('Live estimate:'),
          ' ',
          h('strong', null, formatLead(this.state.liveScore.lead)),
          h('span', {class: 'komi-note'}, ` (${t('komi included')})`),
        ),

      this.state.liveScore != null &&
        this.state.liveScore.advice.type === 'resign-hint' &&
        h(
          'div',
          null,
          h(
            'p',
            {class: 'auto-verdict failed'},
            t(
              'You are far behind and it is not changing — more stones will not turn this around. Resigning is the polite move; playing on to practice is fine too.',
            ),
          ),
          h(
            'div',
            {class: 'actions'},
            h(
              'button',
              {class: 'missed', onClick: this.handleResignGame},
              '🏳 ',
              t('Resign'),
            ),
          ),
        ),

      this.state.liveScore != null &&
        this.state.liveScore.advice.type === 'settled' &&
        h(
          'p',
          {class: 'auto-verdict solved'},
          t(
            'The borders look settled — no points left to gain. Pass twice and the game will be counted.',
          ),
        ),

      h(
        'div',
        {class: 'actions'},
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
      this.renderMenuBarToggle(),
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

      study.chapter != null && h('p', {class: 'chapterline'}, study.chapter),

      h(
        'p',
        {class: 'gametitle'},
        study.title,
        h('span', {class: 'gamemeta'}, ` — ${study.meta}`),
      ),

      h('p', {class: 'trivia'}, study.text),

      study.pack !== 'joseki' &&
        h(
          'div',
          {class: 'actions'},
          h(
            'button',
            {
              class: classNames({playing: this.state.autoPlaying}),
              onClick: this.handleToggleAutoPlay,
              disabled: this.props.mode === 'guess',
            },
            this.state.autoPlaying ? '⏸ ' + t('Pause') : '▶ ' + t('Auto-play'),
          ),
          h(
            'button',
            {
              class: classNames({playing: this.props.mode === 'guess'}),
              onClick: this.handleToggleGuess,
            },
            this.props.mode === 'guess'
              ? '🎯 ' + t('Stop guessing')
              : '🎯 ' + t('Guess the moves'),
          ),
          h(
            'button',
            {disabled: this.state.busy, onClick: this.handleAnotherStudyGame},
            t('Another game'),
          ),
        ),

      this.renderStatus(),
    )

    let footer = [
      this.props.mode === 'guess' &&
        h(
          'p',
          {class: 'session'},
          `${t('Guessing:')} ${this.state.guessStats.hits} ✓ · ${this.state.guessStats.misses} ✗`,
        ),
      h(
        'p',
        {class: 'session'},
        this.props.mode === 'guess'
          ? t('Guess mode: click where the next move was actually played!')
          : this.state.autoPlaying
            ? t('Auto-playing — Space pauses so you can browse yourself.')
            : t(
                'Enter auto-plays the game. Space / ← → step, Backspace rewinds.',
              ),
      ),
      this.renderOverlayToggle(),
      this.renderMenuBarToggle(),
      this.renderBackButton(this.handleStopStudy),
    ]

    return {main, footer}
  }

  renderScoreDrill(drill) {
    let main = h(
      'div',
      {class: 'activity scoredrill'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, '🔢 ', t('Who is winning?')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopScoreDrill},
          t('quit'),
        ),
      ),

      h(
        'p',
        {class: 'guide'},
        `${drill.title} — ${t('after move')} ${drill.moveNumber} (${t('komi')} ${drill.komi}).`,
      ),

      drill.phase === 'guess'
        ? h(
            'div',
            null,
            h(
              'p',
              {class: 'guide'},
              t('Look at the whole board: who is ahead right now?'),
            ),
            h(
              'div',
              {class: 'actions main'},
              h(
                'button',
                {
                  disabled: this.state.busy,
                  onClick: this.handleScoreAnswer('B'),
                },
                '⚫ ',
                t('Black'),
              ),
              h(
                'button',
                {
                  disabled: this.state.busy,
                  onClick: this.handleScoreAnswer('W'),
                },
                '⚪ ',
                t('White'),
              ),
              h(
                'button',
                {
                  disabled: this.state.busy,
                  onClick: this.handleScoreAnswer('close'),
                },
                t('Too close'),
              ),
            ),
          )
        : h(
            'div',
            null,
            h(
              'p',
              {
                class: classNames(
                  'auto-verdict',
                  drill.reveal.correct ? 'solved' : 'failed',
                ),
              },
              drill.reveal.correct ? '✓ ' : '✗ ',
              `${t('Estimate:')} ${drill.reveal.scoreText}`,
              drill.reveal.isClose ? ` — ${t('a close game!')}` : '',
            ),
            h(
              'div',
              {class: 'actions main'},
              h(
                'button',
                {
                  class: 'solved',
                  disabled: this.state.busy,
                  onClick: this.handleScoreNext,
                },
                t('Next position'),
                ' →',
              ),
            ),
          ),
    )

    let footer = [
      h(
        'p',
        {class: 'session'},
        `${t('This session:')} ${drill.stats.correct} ✓ · ${drill.stats.wrong} ✗ · ${t('streak')} ${drill.stats.streak}`,
      ),
      !drill.hasBulk &&
        h(
          'div',
          {class: 'actions'},
          h(
            'button',
            {disabled: this.state.busy, onClick: this.handleFetchBulk},
            '⬇ ' + t('More variety: 90,000 pro games (~46 MB)'),
          ),
        ),
      this.renderOverlayToggle(),
      this.renderMenuBarToggle(),
      this.renderBackButton(this.handleStopScoreDrill),
    ]

    return {main, footer}
  }

  renderLadderDrill(drill) {
    let main = h(
      'div',
      {class: 'activity ladderdrill'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, '🪜 ', t('Ladder drill')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopLadderDrill},
          t('quit'),
        ),
      ),

      drill.phase === 'question'
        ? h(
            'div',
            null,
            h(
              'p',
              {class: 'guide'},
              t(
                'Read it out — no stones allowed! Can Black capture the marked white stone in a ladder?',
              ),
            ),
            h(
              'div',
              {class: 'actions main'},
              h(
                'button',
                {onClick: this.handleLadderAnswer(true)},
                t('It works'),
              ),
              h(
                'button',
                {onClick: this.handleLadderAnswer(false)},
                t('It escapes'),
              ),
            ),
          )
        : h(
            'div',
            null,
            h(
              'p',
              {
                class: classNames(
                  'auto-verdict',
                  drill.reveal.correct ? 'solved' : 'failed',
                ),
              },
              drill.reveal.correct ? '✓ ' : '✗ ',
              drill.reveal.works
                ? t('The ladder works — White is captured.')
                : t('The ladder fails — White escapes.'),
            ),
            h(
              'div',
              {class: 'actions'},
              h(
                'button',
                {disabled: this.state.busy, onClick: this.handleLadderWatch},
                '▶ ',
                t('Watch it run'),
              ),
              h(
                'button',
                {
                  class: 'solved',
                  disabled: this.state.busy,
                  onClick: this.handleLadderNext,
                },
                t('Next ladder'),
                ' →',
              ),
            ),
          ),
    )

    let footer = [
      h(
        'p',
        {class: 'session'},
        `${t('This session:')} ${drill.stats.correct} ✓ · ${drill.stats.wrong} ✗ · ${t('streak')} ${drill.stats.streak}`,
      ),
      this.renderOverlayToggle(),
      this.renderMenuBarToggle(),
      this.renderBackButton(this.handleStopLadderDrill),
    ]

    return {main, footer}
  }

  renderRankTest(testState) {
    let main = h(
      'div',
      {class: 'activity ranktest'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, '🎓 ', t('Rank test')),
        h(
          'a',
          {href: '#', class: 'stop', onClick: this.handleStopRankTest},
          t('quit'),
        ),
      ),

      testState.phase === 'question'
        ? h(
            'div',
            null,
            h(
              'div',
              {class: 'levelrow'},
              h(
                'span',
                {class: 'level'},
                `${t('Problem')} ${testState.index + 1}/${testState.total}`,
              ),
              h(
                'span',
                {class: 'dots'},
                `${t('level')} ${testState.level} (${LEVEL_RANKS[testState.level]})`,
              ),
            ),
            h(
              'p',
              {class: 'guide'},
              (testState.toPlay === 'W'
                ? t('White to play.')
                : t('Black to play.')) +
                ' ' +
                t('No hints, no retries — wrong moves simply move on.'),
            ),
            testState.lastOutcome != null &&
              h(
                'p',
                {class: 'session'},
                testState.lastOutcome === 'correct'
                  ? '✓ ' + t('Previous: solved')
                  : '✗ ' + t('Previous: missed'),
              ),
          )
        : h(
            'div',
            null,
            h(
              'p',
              {class: 'auto-verdict solved'},
              `${t('Estimated rank:')} ${testState.result.rank}`,
            ),
            h(
              'p',
              {class: 'guide'},
              `${testState.result.correct}/${testState.result.total} ${t('solved')}.`,
            ),
            h(
              'div',
              {class: 'actions main'},
              h(
                'button',
                {class: 'solved', onClick: this.handleRankPractice},
                t('Practice at this level'),
              ),
            ),
          ),
    )

    let footer = [
      this.renderMenuBarToggle(),
      this.renderBackButton(this.handleStopRankTest),
    ]

    return {main, footer}
  }

  renderHome() {
    let level = setting.get('frank.tsumego_level') || 1
    let neverTested = !setting.get('frank.last_rank_test')
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

      neverTested &&
        h(
          'p',
          {class: 'status-text'},
          t(
            'New here? Take the 🎓 Rank test first — ten quick problems and we find your level.',
          ),
        ),

      h('p', {class: 'sectionlabel'}, t('Practice')),
      h(
        'div',
        {class: 'actions start'},
        h(
          'button',
          {class: 'primary', onClick: this.handleStartTsumego},
          `🧩 ${t('Tsumego practice')} · ${t('Level')} ${level} (${LEVEL_RANKS[level]})`,
        ),
      ),

      h('p', {class: 'sectionlabel'}, t('Play')),
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
            'div',
            {class: 'actions start'},
            h(
              'button',
              {disabled: this.state.busy, onClick: this.handleSetupKatago},
              '⚡ ' + t('Set up KataGo (one small download)'),
            ),
          ),

      h('p', {class: 'sectionlabel'}, t('Study')),
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
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleStudyJoseki},
          '📚 ' + t('Joseki dictionary'),
        ),
      ),

      h('p', {class: 'sectionlabel'}, t('Drills')),
      h(
        'div',
        {class: 'actions start'},
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleStartScoreDrill},
          '🔢 ' + t('Who is winning? (drill)'),
        ),
        h(
          'button',
          {disabled: this.state.busy, onClick: this.handleStartLadderDrill},
          '🪜 ' + t('Ladder drill'),
        ),
        h(
          'button',
          {
            class: classNames({primary: neverTested}),
            disabled: this.state.busy,
            onClick: this.handleStartRankTest,
          },
          '🎓 ' + t('Rank test'),
        ),
      ),

      this.renderStatus(),
    )

    let footer = [
      hasKatago &&
        !katagoPlay.hasHumanRanks() &&
        h(
          'div',
          {class: 'actions'},
          h(
            'button',
            {disabled: this.state.busy, onClick: this.handleSetupHumanRanks},
            '⬇ ' + t('Add human-like opponents (15k/5k/1d · ~250 MB)'),
          ),
        ),
      this.renderOverlayToggle(),
      this.renderMenuBarToggle(),
    ]

    return {main, footer}
  }

  render({
    frankTsumego,
    frankKatagoGame,
    frankStudy,
    frankScoreDrill,
    frankLadderDrill,
    frankRankTest,
    frankShowHomePanel,
  }) {
    let view =
      frankTsumego != null
        ? this.renderTsumego(frankTsumego)
        : frankKatagoGame != null
          ? this.renderKatagoGame(frankKatagoGame)
          : frankStudy != null
            ? this.renderStudy(frankStudy)
            : frankScoreDrill != null
              ? this.renderScoreDrill(frankScoreDrill)
              : frankLadderDrill != null
                ? this.renderLadderDrill(frankLadderDrill)
                : frankRankTest != null
                  ? this.renderRankTest(frankRankTest)
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

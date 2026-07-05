import {h, Component} from 'preact'

import Goban from './Goban.js'
import PlayBar from './bars/PlayBar.js'
import EditBar from './bars/EditBar.js'
import GuessBar from './bars/GuessBar.js'
import AutoplayBar from './bars/AutoplayBar.js'
import ScoringBar from './bars/ScoringBar.js'
import FindBar from './bars/FindBar.js'

import sabaki from '../modules/sabaki.js'
import * as gametree from '../modules/gametree.js'

// frank_go: beginner assistance
import {getBeginnerOverlay} from '../frank/beginnerOverlay.js'
import {nameForMove} from '../frank/moveNames.js'

export default class MainView extends Component {
  constructor(props) {
    super(props)

    this.handleTogglePlayer = () => {
      let {gameTree, treePosition, currentPlayer} = this.props
      sabaki.setPlayer(treePosition, -currentPlayer)
    }

    this.handleToolButtonClick = (evt) => {
      sabaki.setState({selectedTool: evt.tool})
    }

    this.handleFindButtonClick = (evt) =>
      sabaki.findMove(evt.step, {
        vertex: this.props.findVertex,
        text: this.props.findText,
      })

    this.handleGobanVertexClick = this.handleGobanVertexClick.bind(this)
    this.handleGobanLineDraw = this.handleGobanLineDraw.bind(this)

    // frank_go: hover move-name preview during KataGo games
    this.handleFrankVertexEnter = (vertex) => {
      let {mode, gameTree, treePosition, currentPlayer} = this.props
      if (this.props.frankKatagoGame == null || mode !== 'play') return

      let board = gametree.getBoard(gameTree, treePosition)
      let name = nameForMove(board, currentPlayer, vertex)

      sabaki.setState({
        frankHoverMove: name == null ? null : {name, sign: currentPlayer},
      })
    }

    this.handleFrankVertexLeave = () => {
      if (sabaki.state.frankHoverMove != null) {
        sabaki.setState({frankHoverMove: null})
      }
    }

    // frank_go: position the floating move-name tooltip at the cursor
    // via a direct DOM write (no re-render on mousemove). Last position is
    // remembered so the tip is placed correctly the instant it appears.
    this.frankLastMouse = {x: 0, y: 0}

    this.positionFrankTip = () => {
      if (this.frankHoverTip == null) return
      this.frankHoverTip.style.left = `${this.frankLastMouse.x + 16}px`
      this.frankHoverTip.style.top = `${this.frankLastMouse.y + 16}px`
    }

    this.handleFrankMouseMove = (evt) => {
      this.frankLastMouse = {x: evt.clientX, y: evt.clientY}
      this.positionFrankTip()
    }
  }

  componentDidMount() {
    // Pressing Ctrl/Cmd should show crosshair cursor on Goban in edit mode

    document.addEventListener('keydown', (evt) => {
      if (evt.key !== 'Control' || evt.key !== 'Meta') return

      if (this.props.mode === 'edit') {
        this.setState({gobanCrosshair: true})
      }
    })

    document.addEventListener('keyup', (evt) => {
      if (evt.key !== 'Control' || evt.key !== 'Meta') return

      if (this.props.mode === 'edit') {
        this.setState({gobanCrosshair: false})
      }
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.mode !== 'edit') {
      this.setState({gobanCrosshair: false})
    }
  }

  handleGobanVertexClick(evt) {
    sabaki.clickVertex(evt.vertex, evt)
  }

  handleGobanLineDraw(evt) {
    let {v1, v2} = evt.line
    sabaki.useTool(this.props.selectedTool, v1, v2)
    sabaki.editVertexData = null
  }

  render(
    {
      mode,
      gameIndex,
      gameTree,
      gameCurrents,
      treePosition,
      currentPlayer,
      gameInfo,

      deadStones,
      scoringMethod,
      scoreBoard,
      playVariation,
      analysis,
      analysisTreePosition,
      areaMap,
      blockedGuesses,

      highlightVertices,
      analysisType,
      analysisValueType,
      showAnalysis,
      showCoordinates,
      showMoveColorization,
      showMoveNumbers,
      moveNumbersType,
      showNextMoves,
      showSiblings,
      fuzzyStonePlacement,
      animateStonePlacement,
      boardTransformation,

      selectedTool,
      findText,
      findVertex,
    },
    {gobanCrosshair},
  ) {
    let node = gameTree.get(treePosition)
    let board = gametree.getBoard(gameTree, treePosition)
    let komi = +gametree.getRootProperty(gameTree, 'KM', 0)
    let handicap = +gametree.getRootProperty(gameTree, 'HA', 0)
    let paintMap
    let frankDeadStones = []

    if (['scoring', 'estimator'].includes(mode)) {
      paintMap = areaMap
    } else if (mode === 'guess') {
      paintMap = [...Array(board.height)].map((_) => Array(board.width).fill(0))

      // frank_go: in a study session we give simple right/wrong feedback
      // in the sidebar, so skip Sabaki's hot/cold half-plane shading —
      // that big dark overlay reads like a bug to beginners.
      if (this.props.frankStudy == null) {
        for (let [x, y] of blockedGuesses) {
          paintMap[y][x] = 1
        }
      }
    } else if (this.props.frankShowBeginnerOverlay) {
      // frank_go: beginner influence overlay ("area painting") with
      // likely-dead stones dimmed once the async guess resolves
      let overlay = getBeginnerOverlay(board, () => sabaki.setState({}))
      paintMap = overlay.paintMap
      frankDeadStones = overlay.deadStones
    }

    // frank_go: during practice — and while guessing the pro's move in a
    // study — the cursor over the board becomes a translucent stone in the
    // color to play, so you can tell you're able to place (see frank.css)
    let frankPlacing =
      ((this.props.frankTsumego != null ||
        this.props.frankKatagoGame != null) &&
        mode === 'play') ||
      (this.props.frankStudy != null && mode === 'guess')
    let frankStoneCursor = frankPlacing
      ? currentPlayer > 0
        ? 'frank-cursor-black'
        : 'frank-cursor-white'
      : null

    return h(
      'section',
      {id: 'main'},

      h(
        'main',
        {
          ref: (el) => (this.mainElement = el),
          class: frankStoneCursor,
          onMouseMove: this.handleFrankMouseMove,
        },

        // frank_go: floating move-name tooltip next to the cursor
        this.props.frankHoverMove != null &&
          h(
            'div',
            {
              ref: (el) => {
                this.frankHoverTip = el
                this.positionFrankTip()
              },
              class: 'frank-hover-tip',
            },
            this.props.frankHoverMove.name,
          ),

        h(Goban, {
          gameTree,
          treePosition,
          board,
          highlightVertices:
            // frank_go: mark the wrong-guess point on the board
            this.props.frankStudy != null &&
            mode === 'guess' &&
            this.props.frankLastWrongGuess != null
              ? [this.props.frankLastWrongGuess]
              : findVertex && mode === 'find'
                ? [findVertex]
                : highlightVertices,
          analysisType,
          analysisValueType,
          analysis:
            showAnalysis &&
            analysisTreePosition != null &&
            analysisTreePosition === treePosition
              ? analysis
              : null,
          paintMap,
          dimmedStones: ['scoring', 'estimator'].includes(mode)
            ? deadStones
            : frankDeadStones,

          crosshair: gobanCrosshair,
          showCoordinates,
          showMoveColorization,
          showMoveNumbers: mode !== 'edit' && showMoveNumbers,
          moveNumbersType,
          showNextMoves: mode !== 'guess' && showNextMoves,
          showSiblings: mode !== 'guess' && showSiblings,
          fuzzyStonePlacement,
          animateStonePlacement,

          playVariation,
          drawLineMode:
            mode === 'edit' && ['arrow', 'line'].includes(selectedTool)
              ? selectedTool
              : null,
          transformation: boardTransformation,

          onVertexClick: this.handleGobanVertexClick,
          onLineDraw: this.handleGobanLineDraw,

          // frank_go: hover move-name preview
          onFrankVertexEnter: this.handleFrankVertexEnter,
          onFrankVertexLeave: this.handleFrankVertexLeave,
        }),
      ),

      h(
        'section',
        {id: 'bar'},
        h(PlayBar, {
          mode,
          engineSyncers: [
            this.props.blackEngineSyncerId,
            this.props.whiteEngineSyncerId,
          ].map((id) =>
            this.props.attachedEngineSyncers.find((syncer) => syncer.id === id),
          ),
          playerNames: gameInfo.playerNames,
          playerRanks: gameInfo.playerRanks,
          playerCaptures: [1, -1].map((sign) => board.getCaptures(sign)),
          currentPlayer,
          showHotspot: node.data.HO != null,
          onCurrentPlayerClick: this.handleTogglePlayer,
        }),

        h(EditBar, {
          mode,
          selectedTool,
          onToolButtonClick: this.handleToolButtonClick,
        }),

        h(GuessBar, {
          mode,
          treePosition,
        }),

        h(AutoplayBar, {
          mode,
          gameTree,
          gameCurrents: gameCurrents[gameIndex],
          treePosition,
        }),

        h(ScoringBar, {
          type: 'scoring',
          mode,
          method: scoringMethod,
          scoreBoard,
          areaMap,
          komi,
          handicap,
        }),

        h(ScoringBar, {
          type: 'estimator',
          mode,
          method: scoringMethod,
          scoreBoard,
          areaMap,
          komi,
          handicap,
        }),

        h(FindBar, {
          mode,
          findText,
          onButtonClick: this.handleFindButtonClick,
        }),
      ),
    )
  }
}

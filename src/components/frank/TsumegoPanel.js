// frank_go: floating control panel for tsumego practice mode.

import {h, Component} from 'preact'
import classNames from 'classnames'
import i18n from '../../i18n.js'
import * as tsumegoSession from '../../frank/tsumegoSession.js'

const t = i18n.context('frank.tsumego')

export default class TsumegoPanel extends Component {
  constructor(props) {
    super(props)

    this.handleSolved = () => tsumegoSession.answer(true)
    this.handleMissed = () => tsumegoSession.answer(false)
    this.handleSkip = () => tsumegoSession.skipProblem()
    this.handleRetry = () => tsumegoSession.retryProblem()
    this.handleStop = () => tsumegoSession.stopPractice()
  }

  render({tsumego}) {
    if (tsumego == null) return null

    let {problem, progress, streakTarget, lastEvent} = tsumego
    let toPlayLabel =
      problem.toPlay === 'W' ? t('White to play') : t('Black to play')

    return h(
      'section',
      {id: 'frank-tsumego-panel'},

      h(
        'div',
        {class: 'header'},
        h('span', {class: 'title'}, t('Tsumego Practice')),
        h(
          'a',
          {
            class: 'stop',
            href: '#',
            title: t('Stop practicing'),
            onClick: this.handleStop,
          },
          '×',
        ),
      ),

      h(
        'div',
        {class: 'status'},
        h('span', {class: 'level'}, t('Level'), ' ', progress.level),
        h(
          'span',
          {class: 'streak'},
          t('Streak'),
          ` ${progress.streak}/${streakTarget}`,
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
          {
            class: classNames('toplay', {
              white: problem.toPlay === 'W',
            }),
          },
          toPlayLabel,
        ),
        h('span', {class: 'name'}, problem.title),
      ),

      h(
        'div',
        {class: 'actions'},
        h('button', {class: 'solved', onClick: this.handleSolved}, t('Solved')),
        h('button', {class: 'missed', onClick: this.handleMissed}, t('Missed')),
        h('button', {onClick: this.handleRetry}, t('Reset')),
        h('button', {onClick: this.handleSkip}, t('Skip')),
      ),

      h(
        'p',
        {class: 'hint'},
        t('Read it out, play your line on the board, then grade yourself.'),
      ),
    )
  }
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import {useEffect, useMemo, useState} from 'react'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {useT} from '@/lib/i18n/useT'
import AvatarDisplay from '@/components/AvatarDisplay'
import Icon from '@/components/Icon'
import {Button, ButtonLink} from '@/components/ui/Button'
import {formatAppDate, formatAppDateTime} from '@/lib/dateFormat'
import {watchMobileViewport} from '@/lib/deviceUtils'
import {getGamePlayViewText} from '../utils/constants'
import StartModeOptions from '../StartModeOptions'
import styles from './GamePlayView.module.scss'

export default function GamePlayView({
  game,
  questions,
  bottles,
  historySessions = [],
  avatarOptions = [],
  isOwner,
}) {
  const {lang} = useLanguage()
  const t = useT('gamePlayViewActions')
  const text = getGamePlayViewText(lang)
  const [activeBottleIndex, setActiveBottleIndex] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const isReadyToPlay = questions.length > 0 && bottles.length > 0

  useEffect(() => {
    return watchMobileViewport(setIsMobileViewport)
  }, [])

  const activeBottle = bottles[activeBottleIndex]

  const answerMap = useMemo(() => {
    if (!activeBottle) return new Map()
    return new Map((activeBottle.answers || []).map((a) => [a.question_id, a.option_id]))
  }, [activeBottle])

  const gameAvatar =
    Number.isInteger(game.cover_index) && game.cover_index >= 0
      ? avatarOptions[game.cover_index] || ''
      : ''
  const gameDateLabel = useMemo(() => {
    return formatAppDate(game?.created_at, lang)
  }, [game?.created_at, lang])

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.gameHeader}>
          {gameAvatar && (
            <div className={styles.gameAvatarWrap}>
              <Image
                src={gameAvatar}
                alt=""
                aria-hidden="true"
                className={styles.gameAvatar}
                width={88}
                height={88}
              />
              <p className={styles.gameDateMobile}>{gameDateLabel}</p>
            </div>
          )}
          <div className={styles.gameHeaderInfo}>
            <div>
              <p className={styles.gameDate}>{gameDateLabel}</p>
              <h1 className={styles.gameTitle}>{game.name}</h1>
            </div>
            <div className={styles.gameInfo}>
              <p className={styles.infoItem}>
                <Icon name="bottle" size={24} className={styles.infoBottleIcon} />
                {t('bottlesCount', {count: bottles.length})}
              </p>
              <span className={styles.infoDivider} aria-hidden="true">
                -
              </span>
              <p className={styles.infoItem}>
                <Icon name="question" size={24} className={styles.infoQuestionIcon} />
                {t('questionsCount', {count: questions.length})}
              </p>
              <span className={styles.infoDivider + ' ' + styles.removeOnMobile} aria-hidden="true">
                -
              </span>
              <Button
                size="small"
                className={styles.historyToggle}
                onClick={() => setHistoryOpen(true)}
                aria-expanded={historyOpen}
                aria-controls="game-history-panel">
                {t('history')}
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.actionsBar}>
          {isReadyToPlay ? (
            <ButtonLink
              href={`/game/${game.id}/mode`}
              variant="success"
              className={`btn-start ${styles.actionBtn}`}>
              {t('startMatch')}
            </ButtonLink>
          ) : (
            <div className={styles.setupCtaWrap}>
              <ButtonLink
                href={`/game/${game.id}/edit?step=4`}
                variant="success"
                className={`btn-start ${styles.actionBtn}`}>
                {t('completeGame')}
              </ButtonLink>
            </div>
          )}
          <div className={styles.actionsBtnBottom}>
            {isOwner && (
              <ButtonLink
                href={`/game/${game.id}/edit`}
                variant="neutral"
                size={isMobileViewport ? 'small' : undefined}
                className={styles.actionBtn}>
                <span className={styles.actionBtnContent}>
                  <Icon name="edit" size={24} className={styles.actionBtnIcon} />
                  <span>{t('edit')}</span>
                </span>
              </ButtonLink>
            )}
            <ButtonLink
              href={`/game/${game.id}/print`}
              variant="neutral"
              size={isMobileViewport ? 'small' : undefined}
              className={styles.actionBtn}>
              <span className={styles.actionBtnContent}>
                <Icon name="print" size={24} className={styles.actionBtnIcon} />
                <span>{t('printCard')}</span>
              </span>
            </ButtonLink>
          </div>
        </div>
      </div>

      {isReadyToPlay && (
        <section className={styles.sliderSection} aria-label={text.sliderAria}>
          <div className={styles.sliderTrack}>
            {bottles.map((bottle, idx) => (
              <button
                key={bottle.id}
                className={`${styles.bottleCard} ${idx === activeBottleIndex ? styles.activeBottle : ''}`}
                onClick={() => setActiveBottleIndex(idx)}>
                <span className={styles.bottleIndex}>{idx + 1}</span>
                <div className={styles.bottleCardBody}>
                  <h3>
                    {bottle.name || text.unnamed} {bottle.year || text.yearMissing}
                  </h3>
                  <p>{bottle.producer || text.producerMissing}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {isReadyToPlay && (
        <div className={styles.card}>
          <div className={styles.bottleHeader}>
            <span className={styles.questionNumberGeneral}>
              {text.bottle} {activeBottleIndex + 1} {text.bottleCounterOf} {bottles.length}
            </span>
            <h2>{activeBottle?.name || text.bottle}</h2>
            <p>
              {activeBottle?.producer || text.producerMissing} - {activeBottle?.year || text.yearNA}
            </p>
          </div>

          <div className={styles.questionsList}>
            {questions.map((q, idx) => {
              const correctOptionId = answerMap.get(q.id)
              const hasCorrectOption = Boolean(correctOptionId)
              return (
                <div key={q.id} className={styles.questionBlock}>
                  <div className={styles.questionHeader}>
                    <span className={styles.questionNumber}>
                      {text.question} {idx + 1}
                    </span>
                    <p className={styles.questionTitle}>{q.text}</p>
                  </div>

                  <div className={styles.options}>
                    {q.options.map((opt) => {
                      const isCorrect = hasCorrectOption && opt.id === correctOptionId
                      return (
                        <div
                          key={opt.id}
                          className={`${styles.option} ${
                            hasCorrectOption
                              ? isCorrect
                                ? styles.correct
                                : styles.wrong
                              : ''
                          }`}>
                          {hasCorrectOption ? (
                            <Icon
                              className={styles.optionIcon}
                              name={isCorrect ? 'checkCorrect' : 'checkWrong'}
                              size={24}
                            />
                          ) : null}
                          <span>{opt.text}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* <p className={styles.correctLabel}>{text.correctLabel}</p> */}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {historyOpen && (
        <div className={styles.historySheetBackdrop} onClick={() => setHistoryOpen(false)}>
          <div
            id="game-history-panel"
            className={styles.historySheet}
            onClick={(event) => event.stopPropagation()}>
            <div className={styles.historySheetHandle} />
            <div className={styles.historySheetHeader}>
              <h3>{t('historyTitle')}</h3>
              <button
                type="button"
                className={styles.historySheetClose}
                onClick={() => setHistoryOpen(false)}>
                {t('close')}
              </button>
            </div>
            <div className={styles.historyPanel}>
              {historySessions.length === 0 ? (
                <p className={styles.historyEmpty}>{t('historyEmpty')}</p>
              ) : (
                <div className={styles.historyList}>
                  {historySessions.map((session, index) => (
                    <article key={session.id} className={styles.historyItem}>
                      <div className={styles.historyMain}>
                        <div>
                          <div className={styles.historyNameRow}>
                            <p className={styles.historyName}>
                              {t('historyMatchLabel', {number: historySessions.length - index})}
                            </p>
                            <span className={styles.historyTypeBadge}>
                              {session.modeLabel ||
                                ((session.player_count || (session.players || []).length) > 1
                                  ? 'Live'
                                  : 'Single')}
                            </span>
                          </div>
                          <p className={styles.historyMeta}>
                            {formatAppDateTime(session.played_at, lang)}
                          </p>
                        </div>
                      </div>
                      {session.players?.length > 0 && (
                        <div className={styles.historyPlayers}>
                          {session.players.slice(0, 3).map((player) => (
                            <div key={player.id} className={styles.historyPlayer}>
                              <AvatarDisplay avatarId={player.avatar_id} size={20} />
                              <span>{player.nickname}</span>
                              <strong>{player.total_score}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

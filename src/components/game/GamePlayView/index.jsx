'use client'

import Link from 'next/link'
import {useMemo, useState} from 'react'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import AvatarDisplay from '@/components/AvatarDisplay'
import Icon from '@/components/Icon'
import {Button, ButtonLink} from '@/components/ui/Button'
import {formatAppDate, formatAppDateTime} from '@/lib/dateFormat'
import {getGamePlayViewText} from '../utils/constants'
import styles from './GamePlayView.module.scss'

const GAME_PLAY_VIEW_ACTIONS_DICTIONARY = {
  it: {
    startMatch: 'Avvia una partita',
    playLive: 'Gioca Live',
    playEnoteca: 'Enoteca',
    chooseMode: 'Scegli modalita',
    close: 'Chiudi',
    cancel: 'Annulla',
    printCard: 'Stampa',
    edit: 'Modifica',
    liveDescription: 'Partita multiplayer dal vivo con host e classifica in tempo reale.',
    enotecaDescription:
      'Modalita individuale per giocare in autonomia e vedere il risultato finale.',
  },
  en: {
    startMatch: 'Start a match',
    playLive: 'Play Live',
    playEnoteca: 'Enoteca',
    chooseMode: 'Choose mode',
    close: 'Close',
    cancel: 'Cancel',
    printCard: 'Print Card',
    edit: 'Edit',
    liveDescription: 'Live multiplayer match with host and real-time leaderboard.',
    enotecaDescription: 'Solo mode to play on your own and see the final result.',
  },
}

export default function GamePlayView({
  game,
  questions,
  bottles,
  historySessions = [],
  avatarOptions = [],
  isOwner,
}) {
  const {lang} = useLanguage()
  const text = getGamePlayViewText(lang)
  const t = pickLangText(lang, GAME_PLAY_VIEW_ACTIONS_DICTIONARY)
  const [activeBottleIndex, setActiveBottleIndex] = useState(0)
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

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
      <div className={styles.gameHeader}>
        {gameAvatar && (
          <img src={gameAvatar} alt="" aria-hidden="true" className={styles.gameAvatar} />
        )}
        <div className={styles.gameHeaderInfo}>
          <p className={styles.gameDate}>{gameDateLabel}</p>
          <h1 className={styles.gameTitle}>{game.name}</h1>
          <div className={styles.gameInfo}>
            <p className={styles.infoItem}>
              <Icon name="bottle" size={24} className={styles.infoBottleIcon} />
              {`${bottles.length} Bottiglie`}
            </p>
            <span className={styles.infoDivider} aria-hidden="true">
              -
            </span>
            <p className={styles.infoItem}>
              <img
                src="/icons/questions.svg"
                alt=""
                aria-hidden="true"
                className={styles.infoQuestionIcon}
              />
              {`${questions.length} Domande`}
            </p>
          </div>

          <Button
            size="small"
            className={styles.historyToggle}
            onClick={() => setHistoryOpen(true)}
            aria-expanded={historyOpen}
            aria-controls="game-history-panel">
            {lang === 'en' ? 'Tasting history' : ' Storico degustazioni'}
          </Button>
        </div>
      </div>
      <div className={styles.actionsBar}>
        <Button
          variant="success"
          className={`btn-start ${styles.actionBtn}`}
          onClick={() => setStartModalOpen(true)}>
          {t.startMatch}
        </Button>
        <div className={styles.actionsBtnBottom}>
          {isOwner && (
            <ButtonLink
              href={`/game/${game.id}/edit`}
              variant="neutral"
              size="small"
              className={styles.actionBtn}>
              <span className={styles.actionBtnContent}>
                <Icon name="edit" size={24} className={styles.actionBtnIcon} />
                <span>{t.edit}</span>
              </span>
            </ButtonLink>
          )}
          <ButtonLink
            href={`/game/${game.id}/print`}
            variant="neutral"
            size="small"
            className={styles.actionBtn}>
            <span className={styles.actionBtnContent}>
              <Icon name="print" size={24} className={styles.actionBtnIcon} />
              <span>{t.printCard}</span>
            </span>
          </ButtonLink>
        </div>
      </div>

      <section className={styles.sliderSection} aria-label={text.sliderAria}>
        <h3>Le bottiglie:</h3>
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
                    const isCorrect = opt.id === correctOptionId
                    return (
                      <div
                        key={opt.id}
                        className={`${styles.option} ${isCorrect ? styles.correct : styles.wrong}`}>
                        <Icon
                          className={styles.optionIcon}
                          name={isCorrect ? 'checkCorrect' : 'checkWrong'}
                          size={24}
                        />
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

      {startModalOpen && (
        <div className={styles.startModalBackdrop} onClick={() => setStartModalOpen(false)}>
          <div className={styles.startModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.startModalHeader}>
              <h3>{t.chooseMode}</h3>
              <button
                type="button"
                className={styles.startModalX}
                onClick={() => setStartModalOpen(false)}
                aria-label={t.close}>
                ×
              </button>
            </div>
            <div className={styles.startModalActions}>
              <ButtonLink
                href={`/game/${game.id}/live`}
                className={`${styles.startModeOption} ${styles.startModeOptionSuccess}`}>
                <span className={styles.startModeTitle}>{t.playLive}</span>
                <span className={styles.startModeDescription}>{t.liveDescription}</span>
              </ButtonLink>
              {game.status === 'published' && (
                <ButtonLink
                  href={`/enoteca/${game.id}`}
                  className={`${styles.startModeOption} ${styles.startModeOptionQuaternary}`}>
                  <span className={styles.startModeTitle}>{t.playEnoteca}</span>
                  <span className={styles.startModeDescription}>{t.enotecaDescription}</span>
                </ButtonLink>
              )}
            </div>
            <div className={styles.startModalFooter}>
              <Button
                type="button"
                variant="neutral"
                size="small"
                onClick={() => setStartModalOpen(false)}>
                {t.cancel}
              </Button>
            </div>
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
              <h3>{lang === 'en' ? 'Tasting History' : 'Storico degustazioni'}</h3>
              <button
                type="button"
                className={styles.historySheetClose}
                onClick={() => setHistoryOpen(false)}>
                {lang === 'en' ? 'Close' : 'Chiudi'}
              </button>
            </div>
            <div className={styles.historyPanel}>
              {historySessions.length === 0 ? (
                <p className={styles.historyEmpty}>
                  {lang === 'en' ? 'No sessions yet.' : 'Nessuna partita ancora.'}
                </p>
              ) : (
                <div className={styles.historyList}>
                  {historySessions.map((session, index) => (
                    <article key={session.id} className={styles.historyItem}>
                      <div className={styles.historyMain}>
                        <div>
                          <div className={styles.historyNameRow}>
                            <p className={styles.historyName}>
                              {lang === 'en'
                                ? `Match #${historySessions.length - index}`
                                : `Partita #${historySessions.length - index}`}
                            </p>
                            <span className={styles.historyTypeBadge}>
                              {(session.player_count || (session.players || []).length) > 1
                                ? 'Live'
                                : 'Single'}
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

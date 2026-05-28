'use client'

import Link from 'next/link'
import {useMemo, useState} from 'react'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {pickLangText} from '@/lib/i18n/dictionaries'
import {getGamePlayViewText} from '../utils/constants'
import styles from './GamePlayView.module.scss'

const GAME_PLAY_VIEW_ACTIONS_DICTIONARY = {
  it: {
    startMatch: 'Avvia una partita',
    playLive: 'Gioca Live',
    playEnoteca: 'Enoteca',
    chooseMode: 'Scegli modalita',
    close: 'Chiudi',
    printCard: 'Stampa Card',
    edit: 'Modifica',
  },
  en: {
    startMatch: 'Start a match',
    playLive: 'Play Live',
    playEnoteca: 'Enoteca',
    chooseMode: 'Choose mode',
    close: 'Close',
    printCard: 'Print Card',
    edit: 'Edit',
  },
}

export default function GamePlayView({game, questions, bottles, isOwner}) {
  const {lang} = useLanguage()
  const text = getGamePlayViewText(lang)
  const t = pickLangText(lang, GAME_PLAY_VIEW_ACTIONS_DICTIONARY)
  const [activeBottleIndex, setActiveBottleIndex] = useState(0)
  const [startModalOpen, setStartModalOpen] = useState(false)

  const activeBottle = bottles[activeBottleIndex]

  const answerMap = useMemo(() => {
    if (!activeBottle) return new Map()
    return new Map((activeBottle.answers || []).map((a) => [a.question_id, a.option_id]))
  }, [activeBottle])

  return (
    <div className={styles.container}>
      <h1 className={styles.gameTitle}>{game.name}</h1>

      <div className={styles.actionsBar}>
        <button
          type="button"
          className={`btn success ${styles.actionBtn}`}
          onClick={() => setStartModalOpen(true)}>
          {t.startMatch}
        </button>
        {isOwner && (
          <Link href={`/game/${game.id}/edit`} className={`btn secondary ${styles.actionBtn}`}>
            {t.edit}
          </Link>
        )}
        <Link href={`/game/${game.id}/print`} className={`btn secondary ${styles.actionBtn}`}>
          {t.printCard}
        </Link>
      </div>

      <section className={styles.sliderSection} aria-label={text.sliderAria}>
        <div className={styles.sliderTrack}>
          {bottles.map((bottle, idx) => (
            <button
              key={bottle.id}
              className={`${styles.bottleCard} ${idx === activeBottleIndex ? styles.activeBottle : ''}`}
              onClick={() => setActiveBottleIndex(idx)}>
              <span className={styles.bottleIndex}>
                {text.bottle} {idx + 1}
              </span>
              <h3>{bottle.name || text.unnamed}</h3>
              <p>{bottle.producer || text.producerMissing}</p>
              <p>{bottle.year || text.yearMissing}</p>
            </button>
          ))}
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.bottleHeader}>
          <span className={styles.questionNumber}>
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
                        <span className={styles.optionIcon}>{isCorrect ? '✓' : '✗'}</span>
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
            <h3>{t.chooseMode}</h3>
            <div className={styles.startModalActions}>
              <Link href={`/game/${game.id}/live`} className="btn success">
                {t.playLive}
              </Link>
              {game.status === 'published' && (
                <Link href={`/enoteca/${game.id}`} className="btn secondary">
                  {t.playEnoteca}
                </Link>
              )}
            </div>
            <button
              type="button"
              className={styles.startModalClose}
              onClick={() => setStartModalOpen(false)}>
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import {useEffect, useRef, useState} from 'react'
import Icon from '@/components/Icon'
import playViewStyles from '@/components/game/GamePlayView/GamePlayView.module.scss'

export default function AutoTastingGamePreview({preview, labels}) {
  const bottles = preview?.bottles || []
  const questions = preview?.questions || []
  const [activeBottleIndex, setActiveBottleIndex] = useState(0)
  const [pendingBottleIndex, setPendingBottleIndex] = useState(null)
  const switchTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current)
      }
    }
  }, [])

  if (!bottles.length || !questions.length) return null
  const activeBottle = bottles[activeBottleIndex]
  const isSwitchingBottle = pendingBottleIndex !== null

  function handleBottleSwitch(nextIndex) {
    if (nextIndex === activeBottleIndex) return
    if (switchTimerRef.current) {
      window.clearTimeout(switchTimerRef.current)
    }
    setPendingBottleIndex(nextIndex)
    switchTimerRef.current = window.setTimeout(() => {
      setActiveBottleIndex(nextIndex)
      setPendingBottleIndex(null)
      switchTimerRef.current = null
    }, 320)
  }


  return (
    <>
      <section
        className={playViewStyles.sliderSection}
        aria-label={labels?.sliderAria || labels?.bottles || 'Bottles'}>
        <div className={playViewStyles.sliderTrack}>
          {bottles.map((bottle, idx) => (
            <button
              key={`${bottle.name}-${idx}`}
              className={`${playViewStyles.bottleCard} ${idx === activeBottleIndex ? playViewStyles.activeBottle : ''}`}
              onClick={() => handleBottleSwitch(idx)}>
              <span className={playViewStyles.bottleIndex}>{idx + 1}</span>
              <div className={playViewStyles.bottleCardBody}>
                <h3>
                  {bottle.name || labels?.unnamedBottle || labels?.bottle || 'Bottle'}{' '}
                  {bottle.year || labels?.yearMissing || '-'}
                </h3>
                <p>{bottle.producer || labels?.producerMissing || '-'}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className={playViewStyles.card}>
        {/* <div className={playViewStyles.bottleHeader}>
          <span className={playViewStyles.questionNumberGeneral}>
            {(labels?.bottle || 'Bottle') + ' '}
            {activeBottleIndex + 1} {labels?.of || 'of'} {bottles.length}
          </span>
          <h2>{activeBottle?.name || labels?.bottle || 'Bottle'}</h2>
          <p>
            {activeBottle?.producer || labels?.producerMissing || '-'} -{' '}
            {activeBottle?.year || labels?.yearMissing || '-'}
          </p>
        </div> */}

        {isSwitchingBottle ? (
          <div className={playViewStyles.previewBottleLoader}>
            <span className={playViewStyles.previewBottleLoaderSpinner} aria-hidden="true" />
            <span>{labels?.loadingBottle || 'Updating bottle preview...'}</span>
          </div>
        ) : null}

        <div className={playViewStyles.questionsList}>
          {questions.map((q, idx) => {
            const correctOptionIndex = Number.isInteger(activeBottle?.answers?.[idx])
              ? activeBottle.answers[idx]
              : null

            return (
              <div key={`${q.text}-${idx}`} className={playViewStyles.questionBlock}>
                <div className={playViewStyles.questionHeader}>
                  <span className={playViewStyles.questionNumber}>
                    {(labels?.question || labels?.questionLabel || 'Question') + ' '} {idx + 1}
                  </span>
                  <p className={playViewStyles.questionTitle}>{q.text}</p>
                </div>

                <div className={playViewStyles.options}>
                  {(q.options || []).map((opt, optIdx) => {
                    const hasCorrect = correctOptionIndex !== null
                    const isCorrect = hasCorrect && optIdx === correctOptionIndex
                    const optionClass = hasCorrect
                      ? `${playViewStyles.option} ${isCorrect ? playViewStyles.correct : playViewStyles.wrong}`
                      : playViewStyles.option

                    return (
                      <div key={`${opt}-${optIdx}`} className={optionClass}>
                        {hasCorrect ? (
                          <Icon
                            className={playViewStyles.optionIcon}
                            name={isCorrect ? 'checkCorrect' : 'checkWrong'}
                            size={24}
                          />
                        ) : null}
                        <span>{opt}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

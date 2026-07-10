import {useMemo, useEffect, useCallback, memo, useRef} from 'react'
import Image from 'next/image'
import styles from '../playerLive.module.scss'
import {useT} from '@/lib/i18n/useT'
import Icon from '@/components/Icon'
import {scrollPageTop} from '@/lib/scrollPageTop'

const getComboMsg = (n, t) => {
  if (!n || n < 2) return null
  const idx = String(Math.min(n - 1, 6)).padStart(2, '0')
  return {svg: `/combo/combo-${idx}.svg`, label: t('comboStreak', {count: n})}
}

const isNeutralQuestion = (question) =>
  question?.is_neutral === true ||
  question?.isNeutral === true ||
  String(question?.kind || '').trim().toLowerCase() === 'neutral'

export const QuestionSlideScreen = memo(function QuestionSlideScreen({
  currentQuestion,
  currentBottleIndex,
  totalBottles,
  currentSlideIndex,
  totalSlides,
  slideMotionClass,
  isChecked,
  isSlideTransitioning,
  selectedOption,
  checkResult,
  correctOptionByQuestion,
  shouldRevealAnswersInstantly = true,
  clickedReady,
  isLastSlide,
  comboCount,
  isCheckingAnswer,
  finalRevealLabel,
  confirmLabel,
  onSelect,
  onCheck,
  onConfirmAndContinue,
  onContinue,
  topBar,
  overlays,
}) {
  const t = useT('live.questionSlide')
  const slideContentRef = useRef(null)
  const visibleCombo = useMemo(() => {
    if (!comboCount || comboCount < 2) return null
    const msg = getComboMsg(comboCount, t)
    return msg ? {...msg, key: comboCount} : null
  }, [comboCount, t])

  // Enter key: triggers Check then Continue
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return
      if (!isChecked && selectedOption && !isSlideTransitioning) {
        if (shouldRevealAnswersInstantly) onCheck(currentQuestion.id, selectedOption)
        else onConfirmAndContinue(currentQuestion.id, selectedOption)
      } else if (isChecked && !isSlideTransitioning) {
        onContinue(currentQuestion.id)
      }
    },
    [
      isChecked,
      selectedOption,
      isSlideTransitioning,
      currentQuestion,
      onCheck,
      onConfirmAndContinue,
      onContinue,
      shouldRevealAnswersInstantly,
    ],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    scrollPageTop()

    const container = slideContentRef.current
    if (!container) return

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({top: 0, left: 0, behavior: 'auto'})
      return
    }

    container.scrollTop = 0
  }, [currentBottleIndex, currentSlideIndex])

  const correctText = currentQuestion?.game_question_options?.find(
    (o) => o.id === correctOptionByQuestion[currentQuestion?.id],
  )?.text
  const currentQuestionIsNeutral = isNeutralQuestion(currentQuestion)

  return (
    <div className={styles.fullPage}>
      {topBar}

      {visibleCombo && (
        <div key={visibleCombo.key} className={styles.comboToast}>
          <Image
            className={styles.comboEmoji}
            src={visibleCombo.svg}
            alt=""
            width={80}
            height={80}
          />
          <span className={styles.comboLabel}>{visibleCombo.label}</span>
        </div>
      )}

      <div
        ref={slideContentRef}
        className={`${styles.slideContent} ${slideMotionClass} ${!isChecked ? styles.mobileCheckSpacing : ''}`}>
        <div className={styles.bottleBadge}>
          {t('bottleCounter', {current: currentBottleIndex + 1, total: totalBottles})}
        </div>
        <div className={styles.questionMeta}>
          <p className={styles.questionCounter}>
            {t('questionCounter', {current: currentSlideIndex + 1, total: totalSlides})}
          </p>
          <div className={styles.progressPills} aria-hidden="true">
            {Array.from({length: totalSlides}).map((_, idx) => (
              <span
                key={idx}
                className={`${styles.pill} ${idx < currentSlideIndex ? styles.pillDone : ''} ${
                  idx === currentSlideIndex ? styles.pillActive : ''
                }`}
              />
            ))}
          </div>
        </div>
        <h2 className={styles.questionText}>{currentQuestion?.text}</h2>

        <div className={styles.optionsList}>
          {currentQuestion?.game_question_options
            ?.sort((a, b) => a.option_order - b.option_order)
            .map((option) => {
              const isSelected = selectedOption === option.id
              const isCorrectOption =
                !currentQuestionIsNeutral && correctOptionByQuestion[currentQuestion?.id] === option.id
              let optClass = styles.optionButton
              if (isChecked) {
                if (!shouldRevealAnswersInstantly)
                  optClass = isSelected
                    ? `${styles.optionButton} ${styles.optConfirmed}`
                    : `${styles.optionButton} ${styles.optDimmed}`
                else if (currentQuestionIsNeutral)
                  optClass = isSelected
                    ? `${styles.optionButton} ${styles.optSelected}`
                    : `${styles.optionButton} ${styles.optDimmed}`
                else if (isCorrectOption) optClass = `${styles.optionButton} ${styles.optCorrect}`
                else if (isSelected) optClass = `${styles.optionButton} ${styles.optWrong}`
                else optClass = `${styles.optionButton} ${styles.optDimmed}`
              } else if (isSelected) {
                optClass = `${styles.optionButton} ${styles.optSelected}`
              }
              return (
                <button
                  key={option.id}
                  className={optClass}
                  onClick={() => !isChecked && onSelect(currentQuestion.id, option.id)}
                  disabled={isChecked}>
                  {option.text}
                </button>
              )
            })}
        </div>
      </div>

      <div
        className={`${styles.bottomPanel} ${!isChecked ? styles.mobileCheckFixed : ''} ${
          isChecked && shouldRevealAnswersInstantly
            ? currentQuestionIsNeutral
              ? ''
              : checkResult?.isCorrect === true
              ? styles.bottomCorrect
              : checkResult?.isCorrect === false
                ? styles.bottomWrong
                : ''
            : ''
        }`}>
        {isChecked && shouldRevealAnswersInstantly && (
          <div className={styles.resultFeedback}>
            {currentQuestionIsNeutral ? (
              <span className={styles.feedbackLabel}>+0</span>
            ) : checkResult?.isCorrect ? (
              <>
                <Icon name="checkCorrect" size={24} className={styles.feedbackIconImg} />
                <span className={styles.feedbackLabel}>
                  {checkResult.comboBonus > 0
                    ? t('comboCorrect', {
                        combo: checkResult.newCombo,
                        points: checkResult.points,
                        bonus: checkResult.comboBonus,
                      })
                    : t('correct', {points: checkResult.points})}
                </span>
              </>
            ) : (
              <>
                <Icon name="checkWrong" size={24} className={styles.feedbackIconImg} />
                <span className={styles.feedbackLabel}>
                  {t('correctAnswer')} <strong>{correctText}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {!isChecked ? (
          <button
            className={styles.checkButton}
            onClick={() =>
              shouldRevealAnswersInstantly
                ? onCheck(currentQuestion.id, selectedOption)
                : onConfirmAndContinue(currentQuestion.id, selectedOption)
            }
            disabled={isCheckingAnswer || !selectedOption}>
            {isCheckingAnswer
              ? t('checking')
              : shouldRevealAnswersInstantly
                ? t('check')
                : confirmLabel || t('confirm')}
          </button>
        ) : (
          <button
            className={styles.continueButton}
            onClick={() => onContinue(currentQuestion.id)}
            disabled={isSlideTransitioning}>
            {isLastSlide
              ? clickedReady
                ? t('waitingOthers')
                : finalRevealLabel || t('seeResults')
              : t('continue')}
          </button>
        )}
      </div>

      {overlays}
    </div>
  )
})

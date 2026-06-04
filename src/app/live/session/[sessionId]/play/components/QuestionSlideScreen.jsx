import {useMemo, useEffect, useCallback, memo} from 'react'
import styles from '../playerLive.module.scss'
import {useT} from '@/lib/i18n/useT'
import Icon from '@/components/Icon'

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
  clickedReady,
  isLastSlide,
  comboCount,
  isCheckingAnswer,
  onSelect,
  onCheck,
  onContinue,
  topBar,
  overlays,
}) {
  const t = useT('live.questionSlide')
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
        onCheck(currentQuestion.id, selectedOption)
      } else if (isChecked && !isSlideTransitioning) {
        onContinue(currentQuestion.id)
      }
    },
    [isChecked, selectedOption, isSlideTransitioning, currentQuestion, onCheck, onContinue],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  const correctText = currentQuestion?.game_question_options?.find(
    (o) => o.id === correctOptionByQuestion[currentQuestion?.id],
  )?.text
  const currentQuestionIsNeutral = isNeutralQuestion(currentQuestion)

  return (
    <div className={styles.fullPage}>
      {topBar}

      {visibleCombo && (
        <div key={visibleCombo.key} className={styles.comboToast}>
          <img className={styles.comboEmoji} src={visibleCombo.svg} alt="" />
          <span className={styles.comboLabel}>{visibleCombo.label}</span>
        </div>
      )}

      <div
        className={`${styles.slideContent} ${slideMotionClass} ${!isChecked ? styles.mobileCheckSpacing : ''}`}>
        <div className={styles.bottleBadge}>
          {t('bottleCounter', {current: currentBottleIndex + 1, total: totalBottles})}
        </div>
        <p className={styles.questionCounter}>
          {t('questionCounter', {current: currentSlideIndex + 1, total: totalSlides})}
        </p>
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
                if (currentQuestionIsNeutral)
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
          isChecked
            ? currentQuestionIsNeutral
              ? ''
              : checkResult?.isCorrect === true
              ? styles.bottomCorrect
              : checkResult?.isCorrect === false
                ? styles.bottomWrong
                : ''
            : ''
        }`}>
        {isChecked && (
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
            onClick={() => onCheck(currentQuestion.id, selectedOption)}
            disabled={isCheckingAnswer}>
            {isCheckingAnswer ? t('checking') : t('check')}
          </button>
        ) : (
          <button
            className={styles.continueButton}
            onClick={() => onContinue(currentQuestion.id)}
            disabled={isSlideTransitioning}>
            {isLastSlide ? (clickedReady ? t('waitingOthers') : t('seeResults')) : t('continue')}
          </button>
        )}
      </div>

      {overlays}
    </div>
  )
})

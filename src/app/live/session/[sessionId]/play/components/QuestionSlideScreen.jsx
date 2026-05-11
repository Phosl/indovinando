import {useState, useEffect, useCallback, memo} from 'react'
import styles from '../playerLive.module.scss'
import {useT} from '@/lib/i18n/useT'

const COMBO_EMOJIS = [null, null, '🔥', '💥', '⚡️']

const getComboMsg = (n, t) => {
  if (!n || n < 2) return null
  const emoji = COMBO_EMOJIS[n] || '🤯'
  return {emoji, label: t('comboStreak', {count: n})}
}

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
  const [visibleCombo, setVisibleCombo] = useState(null)

  useEffect(() => {
    if (!comboCount || comboCount < 2) return
    const msg = getComboMsg(comboCount, t)
    if (!msg) return
    setVisibleCombo({...msg, key: Date.now()})
    const timer = setTimeout(() => setVisibleCombo(null), 1600)
    return () => clearTimeout(timer)
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

  return (
    <div className={styles.fullPage}>
      {topBar}

      {visibleCombo && (
        <div key={visibleCombo.key} className={styles.comboToast}>
          <span className={styles.comboEmoji}>{visibleCombo.emoji}</span>
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
              const isCorrectOption = correctOptionByQuestion[currentQuestion?.id] === option.id
              let optClass = styles.optionButton
              if (isChecked) {
                if (isCorrectOption) optClass = `${styles.optionButton} ${styles.optCorrect}`
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
          isChecked ? (checkResult?.isCorrect ? styles.bottomCorrect : styles.bottomWrong) : ''
        }`}>
        {isChecked && (
          <div className={styles.resultFeedback}>
            {checkResult?.isCorrect ? (
              <>
                <span className={styles.feedbackIcon}>
                  {checkResult.comboBonus > 0 ? '🔥' : '🎉'}
                </span>
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
                <span className={styles.feedbackIcon}>💡</span>
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

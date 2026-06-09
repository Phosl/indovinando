'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {validateBottleForm} from '../utils/validations'
import {isNeutralQuestion, isPlayerRatingQuestion} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getAlertMessages, getBottleModalText} from '../utils/constants'
import Icon from '@/components/Icon'
import ModalCloseButton from '@/components/ui/ModalCloseButton'
import styles from './BottleModal.module.scss'

/**
 * BottleModal component - form for creating/editing a bottle with answer selection
 * @param {Boolean} isOpen - Whether the modal is open
 * @param {Number} bottleIndex - Index of bottle being edited (null for new)
 * @param {String} bottleName - Bottle name
 * @param {String} producer - Producer name
 * @param {String} year - Vintage year
 * @param {Array} questions - Array of question objects
 * @param {Array} currentAnswers - Current answers array
 * @param {Function} onBottleNameChange - Callback for name changes
 * @param {Function} onProducerChange - Callback for producer changes
 * @param {Function} onYearChange - Callback for year changes
 * @param {Function} onAnswerChange - Callback for answer changes
 * @param {Function} onSave - Callback when saving
 * @param {Function} onCancel - Callback when canceling
 */
export default function BottleModal({
  isOpen,
  resetToken,
  bottleIndex,
  bottleName,
  producer,
  year,
  wineType,
  questions,
  currentAnswers,
  onBottleNameChange,
  onProducerChange,
  onYearChange,
  onWineTypeChange,
  onAnswerChange,
  onSave,
  onNotify,
  // onSaveAndAddAnother, // rimosso: non più usato
  onCancel,
}) {
  const {lang} = useLanguage()
  const text = getBottleModalText(lang)
  const alertMessages = getAlertMessages(lang)
  const isNewBottle = bottleIndex === null
  const [wizardStep, setWizardStep] = useState(0)
  const modalBodyRef = useRef(null)
  const WINE_TYPES = [
    {value: 'rosso', label: lang === 'en' ? 'Red' : 'Rosso'},
    {value: 'bianco', label: lang === 'en' ? 'White' : 'Bianco'},
    {value: 'rose', label: 'Rosé'},
    {value: 'champagne', label: lang === 'en' ? 'Sparkling' : 'Champagne'},
    {value: 'altro', label: lang === 'en' ? 'Other' : 'Altro'},
  ]

  const questionCount = questions.length
  const totalSteps = questionCount + 3 // details + info + one step per question + final
  const isDetailsStep = wizardStep === 0
  const isInfoStep = wizardStep === 1
  const isQuestionStep = wizardStep > 1 && wizardStep <= questionCount + 1
  const isFinalStep = wizardStep === totalSteps - 1

  const currentQuestionIndex = isQuestionStep ? wizardStep - 2 : -1
  const currentQuestion = isQuestionStep ? questions[currentQuestionIndex] : null
  const currentQuestionOptions = useMemo(() => {
    if (!currentQuestion) return []

    if (Array.isArray(currentQuestion.options)) return currentQuestion.options
    if (Array.isArray(currentQuestion.game_question_options)) {
      return currentQuestion.game_question_options.map((option) => option.text)
    }

    return []
  }, [currentQuestion])
  const currentQuestionIsRating = isQuestionStep ? isPlayerRatingQuestion(currentQuestion) : false
  const currentQuestionIsNeutral = isQuestionStep ? isNeutralQuestion(currentQuestion) : false

  const selectedAnswer = isQuestionStep ? currentAnswers[currentQuestionIndex] : null
  const bottleNameMissing = !bottleName?.trim()
  const producerMissing = !producer?.trim()
  const yearMissing = !year?.trim()
  const wineTypeMissing = !wineType?.trim()
  const currentQuestionMissing =
    isQuestionStep &&
    !currentQuestionIsNeutral &&
    (selectedAnswer === null || selectedAnswer === undefined)

  useEffect(() => {
    if (!isOpen) return

    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }

    requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({
        top: 0,
        behavior: 'auto',
      })
    })
  }, [isOpen, bottleIndex, resetToken, wizardStep])

  if (!isOpen) return null

  function handleSave() {
    try {
      validateBottleForm(
        bottleName,
        producer,
        year,
        wineType,
        currentAnswers,
        questions,
        alertMessages,
      )
      onSave()
    } catch (error) {
      onNotify?.(error.message, 'error')
    }
  }

  function validateDetails() {
    if (!bottleName?.trim() || !producer?.trim() || !year?.trim()) {
      onNotify?.(alertMessages?.BOTTLE_FORM_INCOMPLETE, 'error')
      return false
    }

    if ((year || '').trim().length > 4) {
      onNotify?.(alertMessages?.BOTTLE_YEAR_TOO_LONG, 'error')
      return false
    }

    return true
  }

  function handleNextStep() {
    if (isDetailsStep) {
      if (!validateDetails()) return
      setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))
      return
    }

    if (isInfoStep && !wineType?.trim()) {
      onNotify?.(text.selectWineType, 'error')
      return
    }

    if (
      isQuestionStep &&
      !currentQuestionIsNeutral &&
      (selectedAnswer === null || selectedAnswer === undefined)
    ) {
      onNotify?.(alertMessages?.BOTTLE_ANSWERS_INCOMPLETE, 'error')
      return
    }

    setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }

  function handlePrevStep() {
    setWizardStep((prev) => Math.max(prev - 1, 0))
  }

  const nextLabel = text.next
  const backLabel = text.back
  const finalTitle = text.done
  const finalHint = text.finalHint
  const incompleteLabel = text.incompleteBadge || (lang === 'en' ? 'Incomplete' : 'Incompleto')

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>
            {isNewBottle ? text.newTitle : `${text.editTitlePrefix} ${bottleIndex + 1}`}{' '}
            <span className={styles.stepNumber}>
              {text.stepLabel
                ?.replace('{current}', String(wizardStep + 1))
                ?.replace('{total}', String(totalSteps))}
            </span>
          </h3>
          <ModalCloseButton className={styles.closeBtn} onClick={onCancel} />
        </div>

        <div ref={modalBodyRef} className={styles.modalBody}>
          {isDetailsStep && (
            <div className={styles.bottleInfoSection}>
              <h4>{text.details}</h4>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.bottleNameLabel || text.bottleNamePlaceholder}</label>
                  {bottleNameMissing && <span className={styles.incompleteBadge}>{incompleteLabel}</span>}
                </div>
                <input
                  className={`${styles.inputField} ${bottleNameMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.bottleNamePlaceholder}
                  value={bottleName}
                  onChange={(e) => onBottleNameChange(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.producerLabel || text.producerPlaceholder}</label>
                  {producerMissing && <span className={styles.incompleteBadge}>{incompleteLabel}</span>}
                </div>
                <input
                  className={`${styles.inputField} ${producerMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.producerPlaceholder}
                  value={producer}
                  onChange={(e) => onProducerChange(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.yearLabel || text.yearPlaceholder}</label>
                  {yearMissing && <span className={styles.incompleteBadge}>{incompleteLabel}</span>}
                </div>
                <input
                  className={`${styles.inputField} ${yearMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.yearPlaceholder}
                  value={year}
                  maxLength={4}
                  onChange={(e) => onYearChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {isInfoStep && (
            <div
              className={`${styles.bottleInfoSection} ${wineTypeMissing ? styles.sectionIncomplete : ''}`}>
              <div className={styles.sectionTitleRow}>
                <h4>{text.wineInfoTitle}</h4>
                {wineTypeMissing && <span className={styles.incompleteBadge}>{incompleteLabel}</span>}
              </div>
              <ul className={styles.infoChecklist}>
                <li>{text.wineInfoHintPrimary}</li>
                <li>{text.wineInfoHintSecondary}</li>
              </ul>
              <div className={styles.typePills} role="radiogroup" aria-label={text.wineTypeAriaLabel}>
                {WINE_TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={wineType === item.value}
                    className={`${styles.typePill} ${wineType === item.value ? styles.typePillActive : ''}`}
                    onClick={() => onWineTypeChange(item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isQuestionStep && currentQuestion && (
            <div className={`${styles.questionStep} ${currentQuestionMissing ? styles.sectionIncomplete : ''}`}>
              <div className={styles.sectionTitleRow}>
                <h4 className={styles.questionStepTitle}>
                  {text.questionTitle
                    ?.replace('{index}', String(currentQuestionIndex + 1))}
                </h4>
                {currentQuestionMissing && (
                  <span className={styles.incompleteBadge}>{incompleteLabel}</span>
                )}
              </div>
              <p className={styles.questionStepText}>{currentQuestion.text}</p>

              {currentQuestionIsNeutral ? (
                <div className={styles.ratingSliderBlock}>
                  <span className={styles.neutralTag}>{text.summaryNeutralQuestion}</span>
                  <div className={styles.ratingInfoTitle}>
                    {currentQuestionIsRating
                      ? text.neutralRatingTitle
                      : text.neutralQuestionTitle}
                  </div>
                  <p className={styles.ratingInfoText}>
                    {currentQuestionIsRating
                      ? text.neutralRatingText
                      : text.neutralQuestionText}
                  </p>
                </div>
              ) : (
                <div className={styles.optionsList}>
                  {currentQuestionOptions.map((option, optionIndex) => {
                    const isSelected = selectedAnswer === optionIndex
                    return (
                      <button
                        key={`${currentQuestionIndex}-${optionIndex}`}
                        type="button"
                        className={`${styles.optionButton} ${isSelected ? styles.optionSelected : ''}`}
                        onClick={() => onAnswerChange(currentQuestionIndex, optionIndex)}>
                        <span className={styles.optionBadge}>
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {isFinalStep && (
            <div className={styles.finalStep}>
              <h4>{finalTitle}</h4>
              <p>{finalHint}</p>
              <div className={styles.finalSummary}>
                <ul className={styles.answersList}>
                  {questions.map((q, i) => {
                    const answerIndex = currentAnswers[i]
                    let options = []
                    if (Array.isArray(q.options)) options = q.options
                    else if (Array.isArray(q.game_question_options))
                      options = q.game_question_options.map((o) => o.text)
                    const answerText =
                      isNeutralQuestion(q)
                        ? lang === 'en'
                          ? isPlayerRatingQuestion(q)
                            ? text.summaryPlayerRating
                            : text.summaryNeutralQuestion
                          : isPlayerRatingQuestion(q)
                            ? text.summaryPlayerRating
                            : text.summaryNeutralQuestion
                        : answerIndex !== null &&
                            answerIndex !== undefined &&
                            options[answerIndex]
                        ? options[answerIndex]
                        : '-'
                    return (
                      <li key={i} className={styles.answerItem}>
                        <b>{q.text}</b>: {answerText}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className="btn ghost" onClick={onCancel}>
            {text.exit}
          </button>
          <div className={styles.footerActionsRight}>
            {wizardStep > 0 && (
              <button
                type="button"
                className={styles.backArrowBtn}
                onClick={handlePrevStep}
                aria-label={backLabel}
                title={backLabel}>
                <Icon name="back" size={20} />
              </button>
            )}
            {!isFinalStep ? (
              <button className="btn success" onClick={handleNextStep}>
                {nextLabel}
              </button>
            ) : (
              <button className="btn success" onClick={handleSave}>
                {isNewBottle ? text.saveNew : text.saveEdit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const modalBodyRef = useRef(null)
  const WINE_TYPES = [
    {value: 'rosso', label: lang === 'en' ? 'Red' : 'Rosso'},
    {value: 'bianco', label: lang === 'en' ? 'White' : 'Bianco'},
    {value: 'rose', label: 'Rosé'},
    {value: 'champagne', label: lang === 'en' ? 'Sparkling' : 'Champagne'},
    {value: 'altro', label: lang === 'en' ? 'Other' : 'Altro'},
  ]
  const bottleNameMissing = !bottleName?.trim()
  const producerMissing = !producer?.trim()
  const yearMissing = !year?.trim()
  const wineTypeMissing = !wineType?.trim()
  const missingQuestionIndexes = useMemo(
    () =>
      questions.reduce((acc, question, index) => {
        if (!isNeutralQuestion(question) && (currentAnswers[index] === null || currentAnswers[index] === undefined)) {
          acc.push(index)
        }
        return acc
      }, []),
    [currentAnswers, questions],
  )
  const hasIncompleteBottle =
    bottleNameMissing || producerMissing || yearMissing || wineTypeMissing || missingQuestionIndexes.length > 0
  const initialRepairSnapshot =
    !isNewBottle && hasIncompleteBottle
      ? {
          bottleNameMissing,
          producerMissing,
          yearMissing,
          wineTypeMissing,
          missingQuestionIndexes,
        }
      : null
  const [wizardStep, setWizardStep] = useState(0)
  const [showFullEdit, setShowFullEdit] = useState(false)
  const [repairSnapshot] = useState(initialRepairSnapshot)
  const isRepairMode = Boolean(repairSnapshot) && !showFullEdit

  const stepModels = useMemo(() => {
    if (isRepairMode) {
      const repairSteps = []
      if (
        repairSnapshot?.bottleNameMissing ||
        repairSnapshot?.producerMissing ||
        repairSnapshot?.yearMissing
      ) {
        repairSteps.push({kind: 'details'})
      }
      if (repairSnapshot?.wineTypeMissing) repairSteps.push({kind: 'info'})
      ;(repairSnapshot?.missingQuestionIndexes || []).forEach((questionIndex) => {
        repairSteps.push({kind: 'question', questionIndex})
      })
      return repairSteps
    }

    return [
      {kind: 'details'},
      {kind: 'info'},
      ...questions.map((_, questionIndex) => ({kind: 'question', questionIndex})),
      {kind: 'final'},
    ]
  }, [
    isRepairMode,
    questions,
    repairSnapshot,
  ])

  const totalSteps = stepModels.length
  const currentStepModel = stepModels[wizardStep] || stepModels[0] || {kind: 'details'}
  const isDetailsStep = currentStepModel.kind === 'details'
  const isInfoStep = currentStepModel.kind === 'info'
  const isQuestionStep = currentStepModel.kind === 'question'
  const isFinalStep = currentStepModel.kind === 'final'

  const currentQuestionIndex = isQuestionStep ? currentStepModel.questionIndex : -1
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
  const currentQuestionMissing =
    isQuestionStep &&
    !currentQuestionIsNeutral &&
    (selectedAnswer === null || selectedAnswer === undefined)
  const isLastStep = wizardStep >= totalSteps - 1
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
      if (isRepairMode && isLastStep) {
        handleSave()
        return
      }
      setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))
      return
    }

    if (isInfoStep && !wineType?.trim()) {
      onNotify?.(text.selectWineType, 'error')
      return
    }

    if (isInfoStep && isRepairMode && isLastStep) {
      handleSave()
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

    if ((isQuestionStep || isFinalStep) && isRepairMode && isLastStep) {
      handleSave()
      return
    }

    setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }

  function handlePrevStep() {
    setWizardStep((prev) => Math.max(prev - 1, 0))
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const nextLabel = text.next
  const backLabel = text.back
  const finalTitle = text.done
  const finalHint = text.finalHint
  const detailsSectionIncomplete = bottleNameMissing || producerMissing || yearMissing
  const showBottleNameField = !isRepairMode || repairSnapshot?.bottleNameMissing
  const showProducerField = !isRepairMode || repairSnapshot?.producerMissing
  const showYearField = !isRepairMode || repairSnapshot?.yearMissing
  const showInfoChecklist = !isRepairMode || repairSnapshot?.wineTypeMissing

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
          {isRepairMode ? (
            <button
              type="button"
              className={styles.showAllButton}
              onClick={() => {
                setShowFullEdit(true)
                setWizardStep(0)
              }}>
              {text.showAllFields}
            </button>
          ) : null}
          <ModalCloseButton className={styles.closeBtn} onClick={onCancel} />
        </div>

        <div ref={modalBodyRef} className={styles.modalBody}>
          {isDetailsStep && (
            <div
              className={`${styles.bottleInfoSection} ${
                isRepairMode && detailsSectionIncomplete ? styles.sectionIncomplete : ''
              }`}>
              <h4>{text.details}</h4>
              {showBottleNameField ? (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.bottleNameLabel || text.bottleNamePlaceholder}</label>
                </div>
                <input
                  className={`${styles.inputField} ${bottleNameMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.bottleNamePlaceholder}
                  value={bottleName}
                  onChange={(e) => onBottleNameChange(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
              ) : null}
              {showProducerField ? (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.producerLabel || text.producerPlaceholder}</label>
                </div>
                <input
                  className={`${styles.inputField} ${producerMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.producerPlaceholder}
                  value={producer}
                  onChange={(e) => onProducerChange(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
              ) : null}
              {showYearField ? (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>{text.yearLabel || text.yearPlaceholder}</label>
                </div>
                <input
                  className={`${styles.inputField} ${yearMissing ? styles.inputFieldIncomplete : ''}`}
                  placeholder={text.yearPlaceholder}
                  value={year}
                  maxLength={4}
                  onChange={(e) => onYearChange(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
              ) : null}
            </div>
          )}

          {isInfoStep && (
            <div
              className={`${styles.bottleInfoSection} ${
                isRepairMode && wineTypeMissing ? styles.sectionIncomplete : ''
              }`}>
              <div className={styles.sectionTitleRow}>
                <h4>{text.wineInfoTitle}</h4>
              </div>
              {showInfoChecklist ? (
              <ul className={styles.infoChecklist}>
                <li>{text.wineInfoHintPrimary}</li>
                <li>{text.wineInfoHintSecondary}</li>
              </ul>
              ) : null}
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
            <div
              className={`${styles.questionStep} ${
                isRepairMode && currentQuestionMissing ? styles.sectionIncomplete : ''
              }`}>
              <div className={styles.sectionTitleRow}>
                <h4 className={styles.questionStepTitle}>
                  {text.questionTitle
                    ?.replace('{index}', String(currentQuestionIndex + 1))}
                </h4>
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
          <button type="button" className="btn ghost" onClick={onCancel}>
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
              <button type="button" className="btn success" onClick={handleNextStep}>
                {isRepairMode && isLastStep ? (isNewBottle ? text.saveNew : text.saveEdit) : nextLabel}
              </button>
            ) : (
              <button type="button" className="btn success" onClick={handleSave}>
                {isNewBottle ? text.saveNew : text.saveEdit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

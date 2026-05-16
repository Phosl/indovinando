'use client'

import {useEffect, useMemo, useState} from 'react'
import {validateBottleForm} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getAlertMessages, getBottleModalText} from '../utils/constants'
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
  questions,
  currentAnswers,
  onBottleNameChange,
  onProducerChange,
  onYearChange,
  onAnswerChange,
  onSave,
  // onSaveAndAddAnother, // rimosso: non più usato
  onCancel,
}) {
  const {lang} = useLanguage()
  const text = getBottleModalText(lang)
  const alertMessages = getAlertMessages(lang)
  const isNewBottle = bottleIndex === null
  const [wizardStep, setWizardStep] = useState(0)

  const questionCount = questions.length
  const totalSteps = questionCount + 2 // details + one step per question + final
  const isDetailsStep = wizardStep === 0
  const isQuestionStep = wizardStep > 0 && wizardStep <= questionCount
  const isFinalStep = wizardStep === totalSteps - 1

  const currentQuestionIndex = isQuestionStep ? wizardStep - 1 : -1
  const currentQuestion = isQuestionStep ? questions[currentQuestionIndex] : null
  const currentQuestionOptions = useMemo(() => {
    if (!currentQuestion) return []

    if (Array.isArray(currentQuestion.options)) return currentQuestion.options
    if (Array.isArray(currentQuestion.game_question_options)) {
      return currentQuestion.game_question_options.map((option) => option.text)
    }

    return []
  }, [currentQuestion])

  const selectedAnswer = isQuestionStep ? currentAnswers[currentQuestionIndex] : null

  useEffect(() => {
    if (!isOpen) return
    setWizardStep(0)
  }, [isOpen, bottleIndex, questionCount, resetToken])

  if (!isOpen) return null

  function handleSave() {
    try {
      validateBottleForm(
        bottleName,
        producer,
        year,
        currentAnswers,
        questions.length,
        alertMessages,
      )
      onSave()
    } catch (error) {
      alert(error.message)
    }
  }

  function validateDetails() {
    if (!bottleName?.trim() || !producer?.trim() || !year?.trim()) {
      alert(alertMessages?.BOTTLE_FORM_INCOMPLETE || 'Compila nome bottiglia, produttore e anno.')
      return false
    }

    if ((year || '').trim().length > 4) {
      alert(
        alertMessages?.BOTTLE_YEAR_TOO_LONG ||
          "L'anno della bottiglia deve avere massimo 4 caratteri.",
      )
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

    if (isQuestionStep && (selectedAnswer === null || selectedAnswer === undefined)) {
      alert(
        alertMessages?.BOTTLE_ANSWERS_INCOMPLETE ||
          'Seleziona la risposta corretta per ogni domanda.',
      )
      return
    }

    setWizardStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }

  function handlePrevStep() {
    setWizardStep((prev) => Math.max(prev - 1, 0))
  }

  const stepLabel = lang === 'en' ? 'Step' : 'Step'
  const nextLabel = lang === 'en' ? 'Next' : 'Avanti'
  const backLabel = lang === 'en' ? 'Back' : 'Indietro'
  // const addAnotherLabel = lang === 'en' ? 'Save and add another' : 'Salva e aggiungi altra' // rimosso
  const finalTitle = lang === 'en' ? 'Done' : 'Fine'
  const finalHint =
    lang === 'en'
      ? 'Review and save this bottle, then continue with another if needed.'
      : "Controlla e salva questa bottiglia, poi aggiungine un'altra se serve."

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isNewBottle ? text.newTitle : `${text.editTitlePrefix} ${bottleIndex + 1}`}</h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.stepIndicator}>
            {stepLabel} {wizardStep + 1}/{totalSteps}
          </div>

          {isDetailsStep && (
            <div className={styles.bottleInfoSection}>
              <h4>{text.details}</h4>
              <input
                className={styles.inputField}
                placeholder={text.bottleNamePlaceholder}
                value={bottleName}
                onChange={(e) => onBottleNameChange(e.target.value)}
              />
              <input
                className={styles.inputField}
                placeholder={text.producerPlaceholder}
                value={producer}
                onChange={(e) => onProducerChange(e.target.value)}
              />
              <input
                className={styles.inputField}
                placeholder={text.yearPlaceholder}
                value={year}
                maxLength={4}
                onChange={(e) => onYearChange(e.target.value)}
              />
            </div>
          )}

          {isQuestionStep && currentQuestion && (
            <div className={styles.questionStep}>
              <h4 className={styles.questionStepTitle}>
                {lang === 'en' ? 'Question' : 'Domanda'} {currentQuestionIndex + 1}
              </h4>
              <p className={styles.questionStepText}>{currentQuestion.text}</p>

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
            </div>
          )}

          {isFinalStep && (
            <div className={styles.finalStep}>
              <h4>{finalTitle}</h4>
              <p>{finalHint}</p>
              <div className={styles.finalSummary}>
                <ul
                  className={styles.answersList}
                  style={{margin: '8px 0 0 0', padding: 0, listStyle: 'none'}}>
                  {questions.map((q, i) => {
                    const answerIndex = currentAnswers[i]
                    let options = []
                    if (Array.isArray(q.options)) options = q.options
                    else if (Array.isArray(q.game_question_options))
                      options = q.game_question_options.map((o) => o.text)
                    const answerText =
                      answerIndex !== null && answerIndex !== undefined && options[answerIndex]
                        ? options[answerIndex]
                        : '-'
                    return (
                      <li key={i} style={{fontSize: '0.95em', color: '#444', marginBottom: 2}}>
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
          <button className="btn secondary" onClick={onCancel}>
            {text.cancel}
          </button>

          {wizardStep > 0 && (
            <button className="btn secondary" onClick={handlePrevStep}>
              {backLabel}
            </button>
          )}

          {!isFinalStep ? (
            <button className="btn primary" onClick={handleNextStep}>
              {nextLabel}
            </button>
          ) : (
            <>
              <button className="btn primary" onClick={handleSave}>
                {isNewBottle ? text.saveNew : text.saveEdit}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

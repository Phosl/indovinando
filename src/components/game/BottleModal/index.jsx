'use client'

import {useMemo, useState} from 'react'
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
  // onSaveAndAddAnother, // rimosso: non più usato
  onCancel,
}) {
  const {lang} = useLanguage()
  const text = getBottleModalText(lang)
  const alertMessages = getAlertMessages(lang)
  const isNewBottle = bottleIndex === null
  const [wizardStep, setWizardStep] = useState(0)
  const WINE_TYPES = [
    {value: 'rosso', label: 'Rosso'},
    {value: 'bianco', label: 'Bianco'},
    {value: 'rose', label: 'Rosé'},
    {value: 'champagne', label: 'Champagne'},
    {value: 'altro', label: 'Altro'},
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

    if (isInfoStep && !wineType?.trim()) {
      alert(lang === 'en' ? 'Select wine type.' : 'Seleziona il tipo di vino.')
      return
    }

    if (
      isQuestionStep &&
      !currentQuestionIsNeutral &&
      (selectedAnswer === null || selectedAnswer === undefined)
    ) {
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

  const nextLabel = lang === 'en' ? 'Next' : 'Avanti'
  const backLabel = lang === 'en' ? 'Back' : 'Indietro'
  // const addAnotherLabel = lang === 'en' ? 'Save and add another' : 'Salva e aggiungi altra' // rimosso
  const finalTitle = lang === 'en' ? 'Done' : 'Fine'
  const finalHint =
    lang === 'en'
      ? 'Review and save this bottle, then continue with another if needed.'
      : "Controlla e salva questa bottiglia, poi aggiungine un'altra se serve."

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>
            {isNewBottle ? text.newTitle : `${text.editTitlePrefix} ${bottleIndex + 1}`}{' '}
            <span className={styles.stepNumber}>
              Step {wizardStep + 1} di {totalSteps}
            </span>
          </h3>
          <ModalCloseButton className={styles.closeBtn} onClick={onCancel} />
        </div>

        <div className={styles.modalBody}>
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

          {isInfoStep && (
            <div className={styles.bottleInfoSection}>
              <h4>{lang === 'en' ? 'Wine info' : 'Info vino'}</h4>
              <div className={styles.typePills} role="radiogroup" aria-label="wine type">
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
            <div className={styles.questionStep}>
              <h4 className={styles.questionStepTitle}>
                {lang === 'en' ? 'Question' : 'Domanda'} {currentQuestionIndex + 1}
              </h4>
              <p className={styles.questionStepText}>{currentQuestion.text}</p>

              {currentQuestionIsNeutral ? (
                <div className={styles.ratingSliderBlock}>
                  <div className={styles.ratingInfoTitle}>
                    {currentQuestionIsRating
                      ? lang === 'en'
                        ? 'This answer is given by the player during the tasting.'
                        : 'Questa risposta la darà il giocatore durante la degustazione.'
                      : lang === 'en'
                        ? 'This question is marked as neutral.'
                        : 'Questa domanda è contrassegnata come neutra.'}
                  </div>
                  <p className={styles.ratingInfoText}>
                    {currentQuestionIsRating
                      ? lang === 'en'
                        ? 'It remains visible in the questionnaire, but it has no correct answer and is not configured bottle by bottle.'
                        : 'Resta visibile nel questionario, ma non ha una risposta corretta e non si compila per singola bottiglia.'
                      : lang === 'en'
                        ? 'Players will still see the options during the game, but this bottle does not need a correct answer.'
                        : 'I giocatori vedranno comunque le opzioni durante il gioco, ma questa bottiglia non richiede una risposta corretta.'}
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
                            ? 'Player rating'
                            : 'Neutral question'
                          : isPlayerRatingQuestion(q)
                            ? 'Voto del giocatore'
                            : 'Domanda neutra'
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

'use client'

import BottleAnswersSelector from '../BottleAnswersSelector'
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
  onCancel,
}) {
  const {lang} = useLanguage()
  const text = getBottleModalText(lang)
  const alertMessages = getAlertMessages(lang)
  const isNewBottle = bottleIndex === null

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

          <div className={styles.answersSection}>
            <BottleAnswersSelector
              title={text.answersTitle}
              questions={questions}
              currentAnswers={currentAnswers}
              onAnswerChange={onAnswerChange}
              isInline
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn secondary" onClick={onCancel}>
            {text.cancel}
          </button>
          <button className="btn primary" onClick={handleSave}>
            {isNewBottle ? text.saveNew : text.saveEdit}
          </button>
        </div>
      </div>
    </div>
  )
}

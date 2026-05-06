'use client'

import BottleAnswersSelector from '../BottleAnswersSelector'
import {validateBottleForm} from '../utils/validations'
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
  if (!isOpen) return null

  const isNewBottle = bottleIndex === null

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isNewBottle ? 'Nuova Bottiglia' : `Modifica Bottiglia ${bottleIndex + 1}`}</h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.bottleInfoSection}>
            <h4>Dettagli Bottiglia</h4>
            <input
              className={styles.inputField}
              placeholder="Nome bottiglia"
              value={bottleName}
              onChange={(e) => onBottleNameChange(e.target.value)}
            />
            <input
              className={styles.inputField}
              placeholder="Produttore"
              value={producer}
              onChange={(e) => onProducerChange(e.target.value)}
            />
            <input
              className={styles.inputField}
              placeholder="Anno"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
            />
          </div>

          <div className={styles.answersSection}>
            <BottleAnswersSelector
              title="Seleziona risposte corrette"
              questions={questions}
              currentAnswers={currentAnswers}
              onAnswerChange={onAnswerChange}
              isInline
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn secondary" onClick={onCancel}>
            Annulla
          </button>
          <button className="btn primary" onClick={onSave}>
            {isNewBottle ? 'Salva Bottiglia' : 'Aggiorna Bottiglia'}
          </button>
        </div>
      </div>
    </div>
  )
}

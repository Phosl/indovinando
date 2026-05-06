'use client'

import {useState, useEffect} from 'react'
import {validateQuestionForm} from '../utils/validations'
import {ALERT_MESSAGES} from '../utils/constants'
import styles from './QuestionModal.module.scss'

/**
 * QuestionModal component - form for creating/editing a question
 * @param {Boolean} isOpen - Whether the modal is open
 * @param {Number} questionIndex - Index of question being edited (null for new)
 * @param {Object} question - Current question data
 * @param {Function} onSave - Callback when saving
 * @param {Function} onCancel - Callback when canceling
 */
export default function QuestionModal({isOpen, questionIndex, question, onSave, onCancel}) {
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', ''])

  useEffect(() => {
    if (isOpen && question) {
      setQuestionText(question.text || '')
      setOptions([...(question.options || ['', ''])])
    } else {
      setQuestionText('')
      setOptions(['', ''])
    }
  }, [isOpen, question])

  function updateOption(index, value) {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  function addOption() {
    setOptions((prev) => [...prev, ''])
  }

  function handleSave() {
    try {
      validateQuestionForm(questionText, options)

      const questionId = question?.id || crypto.randomUUID()

      onSave(
        {
          id: questionId,
          text: questionText.trim(),
          options: options.map((o) => o.trim()),
        },
        questionIndex,
      )
    } catch (error) {
      alert(error.message)
    }
  }

  if (!isOpen) return null

  const isNewQuestion = questionIndex === null || questionIndex === undefined

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isNewQuestion ? 'Nuova Domanda' : `Modifica Domanda ${questionIndex + 1}`}</h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Testo Domanda</label>
            <textarea
              className={styles.questionInput}
              placeholder="Scrivi la domanda..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Opzioni</label>
            <div className={styles.optionsList}>
              {options.map((opt, i) => (
                <input
                  key={i}
                  className={styles.optionInput}
                  placeholder={`Opzione ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
              ))}
            </div>
            <button className={styles.addOptionBtn} onClick={addOption}>
              + Aggiungi Opzione
            </button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn secondary" onClick={onCancel}>
            Annulla
          </button>
          <button className="btn primary" onClick={handleSave}>
            {isNewQuestion ? 'Crea Domanda' : 'Salva Domanda'}
          </button>
        </div>
      </div>
    </div>
  )
}

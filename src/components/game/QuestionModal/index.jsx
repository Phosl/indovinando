'use client'

import {useState, useEffect} from 'react'
import {validateQuestionForm} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getAlertMessages, getQuestionModalText} from '../utils/constants'
import Icon from '@/components/Icon'
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
  const {lang} = useLanguage()
  const text = getQuestionModalText(lang)
  const alertMessages = getAlertMessages(lang)

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

  function removeOption(index) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    try {
      validateQuestionForm(questionText, options, alertMessages)

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
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{isNewQuestion ? text.newTitle : `${text.editTitlePrefix} ${questionIndex + 1}`}</h3>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>{text.questionLabel}</label>
            <textarea
              className={styles.questionInput}
              placeholder={text.questionPlaceholder}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{text.optionsLabel}</label>
            <div className={styles.optionsList}>
              {options.map((opt, i) => (
                <div key={i} className={styles.optionRow}>
                  <input
                    className={styles.optionInput}
                    placeholder={`${text.optionPlaceholder} ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Elimina opzione"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className={styles.removeOptionBtn}
                    tabIndex={-1}>
                    <img src="/icons/remove-small.svg" alt="" aria-hidden="true" className={styles.removeOptionIcon} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn tertiary" onClick={addOption}>
              <Icon name="plus" size={24} /> <span>{text.addOption}</span>
            </button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn neutral" onClick={onCancel}>
            {text.cancel}
          </button>
          <button className="btn success" onClick={handleSave}>
            {isNewQuestion ? text.saveNew : text.saveEdit}
          </button>
        </div>
      </div>
    </div>
  )
}

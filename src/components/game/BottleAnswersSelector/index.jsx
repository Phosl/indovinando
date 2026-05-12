'use client'

import styles from './BottleAnswersSelector.module.scss'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function BottleAnswersSelector({title, questions, currentAnswers, onAnswerChange}) {
  return (
    <div className={styles.answersSection}>
      {title && <h4 className={styles.sectionTitle}>{title}</h4>}

      {questions.map((question, qIndex) => (
        <div key={question.id ?? qIndex} className={styles.questionBlock}>
          <p className={styles.questionText}>
            <span className={styles.questionNum}>{qIndex + 1}</span>
            {question.text}
          </p>

          <div className={styles.optionsList}>
            {question.options.map((option, oIndex) => {
              const label = OPTION_LABELS[oIndex] ?? String(oIndex + 1)
              const isSelected = currentAnswers[qIndex] === oIndex
              return (
                <button
                  key={`${qIndex}-${oIndex}`}
                  type="button"
                  onClick={() => onAnswerChange(qIndex, oIndex)}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}>
                  <span
                    className={`${styles.optionBadge} ${isSelected ? styles.optionBadgeSelected : ''}`}>
                    {label}
                  </span>
                  <span className={styles.optionText}>{option}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

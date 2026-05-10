'use client'

import styles from '../GameEditor/GameEditor.module.scss'

export default function BottleAnswersSelector({title, questions, currentAnswers, onAnswerChange}) {
  return (
    <div className={styles.answersSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>

      {questions.map((question, qIndex) => (
        <div key={question.id ?? qIndex} className={styles.questionCard}>
          <p className={styles.questionText}>
            {qIndex + 1}. {question.text}
          </p>

          <div className={styles.answersList} role="radiogroup" aria-label={question.text}>
            {question.options.map((option, oIndex) => (
              <button
                key={`${qIndex}-${oIndex}`}
                type="button"
                role="radio"
                aria-checked={currentAnswers[qIndex] === oIndex}
                onClick={() => onAnswerChange(qIndex, oIndex)}
                className={
                  styles.answerOptionLabel +
                  (currentAnswers[qIndex] === oIndex ? ` ${styles.answerOptionLabelActive}` : '')
                }>
                <span className={styles.answerOptionText}>{option}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

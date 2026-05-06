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

          <div className={styles.answersList}>
            {question.options.map((option, oIndex) => (
              <label
                key={`${qIndex}-${oIndex}`}
                className={
                  styles.answerOptionLabel +
                  (currentAnswers[qIndex] === oIndex ? ` ${styles.answerOptionLabelActive}` : '')
                }>
                <input
                  type="radio"
                  name={`question-${qIndex}`}
                  checked={currentAnswers[qIndex] === oIndex}
                  onChange={() => onAnswerChange(qIndex, oIndex)}
                />
                <span className={styles.answerOptionText}>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

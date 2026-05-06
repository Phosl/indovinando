import {isQuestionComplete} from '../utils/validations'
import styles from './QuestionsList.module.scss'

/**
 * QuestionsList component - displays all questions in a grid
 * @param {Array} questions - Array of question objects
 * @param {Function} onEditQuestion - Callback when editing a question
 * @param {Function} onNewQuestion - Callback to create a new question
 * @param {Function} onDeleteQuestion - Callback when deleting a question
 */
export default function QuestionsList({
  questions,
  onEditQuestion,
  onNewQuestion,
  onDeleteQuestion,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Domande ({questions.length})</h3>
        <button className="btn primary" onClick={onNewQuestion}>
          + Nuova Domanda
        </button>
      </div>

      {questions.length === 0 ? (
        <p className={styles.emptyState}>Nessuna domanda ancora. Aggiungi la prima!</p>
      ) : (
        <div className={styles.grid}>
          {questions.map((question, index) => {
            const isComplete = isQuestionComplete(question)
            return (
              <div
                key={question.id}
                className={`${styles.card} ${isComplete ? styles.complete : styles.incomplete}`}
                onClick={() => onEditQuestion(index)}>
                <div className={styles.cardHeader}>
                  <h4>Domanda {index + 1}</h4>
                  <span className={styles.status}>{isComplete ? '✓' : '⚠️'}</span>
                </div>
                <p className={styles.questionText}>{question.text}</p>
                <div className={styles.optionsCount}>{question.options?.length || 0} opzioni</div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditQuestion(index)
                    }}>
                    Modifica
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Elimina questa domanda?')) {
                        onDeleteQuestion(index)
                      }
                    }}>
                    Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

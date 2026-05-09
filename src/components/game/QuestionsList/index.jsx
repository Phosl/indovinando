import {isQuestionComplete} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getQuestionsListText} from '../utils/constants'
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
  const {lang} = useLanguage()
  const text = getQuestionsListText(lang)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          {text.title} ({questions.length})
        </h3>
        <button className="btn primary" onClick={onNewQuestion}>
          {text.add}
        </button>
      </div>

      {questions.length === 0 ? (
        <p className={styles.emptyState}>{text.empty}</p>
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
                  <h4>
                    {text.question} {index + 1}
                  </h4>
                  <span className={styles.status}>{isComplete ? '✓' : '⚠️'}</span>
                </div>
                <p className={styles.questionText}>{question.text}</p>
                <div className={styles.optionsCount}>
                  {question.options?.length || 0} {text.options}
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditQuestion(index)
                    }}>
                    {text.edit}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(text.confirmDelete)) {
                        onDeleteQuestion(index)
                      }
                    }}>
                    {text.delete}
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

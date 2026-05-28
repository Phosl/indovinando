import {isQuestionComplete} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getQuestionsListText} from '../utils/constants'
import Icon from '@/components/Icon'
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
        {/* <h3>
          {text.title} ({questions.length})
        </h3> */}
        <button className="btn tertiary" onClick={onNewQuestion}>
          <Icon name="plus" size={24} /> <span>{text.add}</span>
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
                  {/* <div>
                    <h1>{index + 1}°</h1>
                    <h5>{text.question}</h5>
                  </div> */}
                  <h2 className={styles.questionText}>
                    <span>{index + 1}°</span> <span>{question.text}</span>
                    {/* <span className={styles.optionsCount}>
                      {question.options?.length || 0} {text.options}
                    </span> */}
                  </h2>
                  <button
                    className="btn btn-mini danger btn-only-text"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(text.confirmDelete)) {
                        onDeleteQuestion(index)
                      }
                    }}>
                    {text.delete}
                  </button>
                  {/* <span className={styles.status}>{isComplete ? '✓' : '⚠️'}</span> */}
                </div>
                <div className={styles.optionsText}>
                  {question.options?.map((o, i) => (
                    <p key={i}>{typeof o === 'string' ? o : o.text}</p>
                  ))}
                </div>

                {/* <div className={styles.buttonGroup}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditQuestion(index)
                    }}>
                    {text.edit}
                  </button>
                </div> */}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

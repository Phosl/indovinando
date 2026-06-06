import {isNeutralQuestion, isPlayerRatingQuestion, isQuestionComplete} from '../utils/validations'
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
  onRequestDeleteQuestion,
  isQuickCreate = false,
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
            const isPlayerRating = isPlayerRatingQuestion(question)
            const isNeutral = isNeutralQuestion(question)
            const isLockedInQuickCreate = isQuickCreate && isPlayerRating
            const optionsPreview = (question.options || []).slice(0, 4)
            return (
              <div
                key={question.id}
                className={`${styles.card} ${isComplete ? styles.complete : styles.incomplete}`}
                onClick={() => {
                  if (isLockedInQuickCreate) return
                  onEditQuestion(index)
                }}>
                <div className={styles.questionIndex}>{index + 1}</div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardHeader}>
                    <h4 className={styles.questionText}>{question.text}</h4>
                    <div className={styles.cardActions}>
                      {isLockedInQuickCreate ? (
                        <span className={styles.lockedBadge}>{text.lockedPlayer}</span>
                      ) : null}
                      {isNeutral ? <span className={styles.lockedBadge}>{text.lockedNeutral}</span> : null}
                      {!isLockedInQuickCreate ? (
                        <button
                          className="btn btn-mini danger btn-only-text"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onRequestDeleteQuestion) {
                              onRequestDeleteQuestion(index)
                              return
                            }
                            onDeleteQuestion(index)
                          }}>
                          {text.delete}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className={styles.optionsCount}>
                    {isPlayerRating
                      ? text.playerAnswerFree
                      : isNeutral
                        ? text.neutralNoCorrectAnswer
                      : (question.options?.length || 0) + ' ' + text.options}
                  </p>
                  <div className={styles.optionsText}>
                    {isPlayerRating ? (
                      <p>{text.sliderPreview}</p>
                    ) : isNeutral ? (
                      <p>{text.playerVisibleOptions}</p>
                    ) : (
                      optionsPreview.map((o, i) => <p key={i}>{typeof o === 'string' ? o : o.text}</p>)
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

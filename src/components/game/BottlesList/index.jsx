import {isBottleComplete} from '../utils/validations'
import {useLanguage} from '@/components/i18n/LanguageProvider'
import {getBottlesListText} from '../utils/constants'
import styles from './BottlesList.module.scss'

/**
 * BottlesList component - displays all bottles in a grid
 * @param {Array} bottles - Array of bottle objects
 * @param {Array} questions - Array of question objects (for validation)
 * @param {Function} onEditBottle - Callback when editing a bottle
 * @param {Function} onNewBottle - Callback to create a new bottle
 * @param {Function} onDeleteBottle - Callback when deleting a bottle
 */
export default function BottlesList({
  bottles,
  questions,
  onEditBottle,
  onNewBottle,
  onDeleteBottle,
}) {
  const {lang} = useLanguage()
  const text = getBottlesListText(lang)
  const questionsLength = questions?.length || 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {/* <h3>
          {text.title} ({bottles.length})
        </h3> */}
        <button className="btn tertiary" onClick={onNewBottle}>
          {text.add}
        </button>
      </div>

      {bottles.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{text.empty}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {bottles.map((bottle, index) => {
            const isComplete = isBottleComplete(bottle, questionsLength)
            return (
              <div
                key={index}
                className={`${styles.card} ${isComplete ? styles.complete : styles.incomplete}`}
                onClick={() => onEditBottle(index)}>
                <div className={styles.cardHeader}>
                  <h4>
                    {bottle.name} {bottle.year}
                  </h4>
                  <button
                    className="btn btn-mini danger btn-only-text"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(text.confirmDelete)) {
                        onDeleteBottle(index)
                      }
                    }}>
                    {text.delete}
                  </button>

                  {!isComplete && (
                    <img
                      className={styles.status}
                      src="/check-warning.svg"
                      alt=""
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className={styles.producer}>{bottle.producer}</p>
                {bottle.wineType && <p className={styles.year}>{bottle.wineType}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

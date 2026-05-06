import {isBottleComplete} from '../utils/validations'
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
  const questionsLength = questions?.length || 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Bottiglie ({bottles.length})</h3>
        <button className="btn primary" onClick={onNewBottle}>
          + Nuova Bottiglia
        </button>
      </div>

      {bottles.length === 0 ? (
        <p className={styles.emptyState}>Nessuna bottiglia ancora. Aggiungi la prima!</p>
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
                  <h4>{bottle.name}</h4>
                  <span className={styles.status}>{isComplete ? '✓' : '⚠️'}</span>
                </div>
                <p className={styles.producer}>{bottle.producer}</p>
                <p className={styles.year}>{bottle.year}</p>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditBottle(index)
                    }}>
                    Modifica
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Elimina questa bottiglia?')) {
                        onDeleteBottle(index)
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

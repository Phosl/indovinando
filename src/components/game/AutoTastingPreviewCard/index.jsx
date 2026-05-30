import Icon from '@/components/Icon'
import styles from './AutoTastingPreviewCard.module.scss'

export default function AutoTastingPreviewCard({title, bottlesCount, questionsCount, questions = []}) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.stats}>
          <p>
            <Icon name="bottle" size={24} />
            <span>{bottlesCount}</span>
          </p>
          <span className={styles.divider}>-</span>
          <p>
            <Icon name="question" size={24} />
            <span>{questionsCount}</span>
          </p>
        </div>
      </header>

      <div className={styles.questions}>
        {questions.map((question, index) => (
          <article key={`${question.text}-${index}`} className={styles.questionCard}>
            <p className={styles.questionTitle}>{question.text}</p>
            <p className={styles.options}>{question.options.join(' · ')}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
